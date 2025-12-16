/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { UsersService } from '@/modules/users/users.service';
import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { UnauthorizedException } from '@/common/exceptions';

import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Queue } from 'bullmq';
import {
  hashPassword,
  verifyPassword as verifyPasswordUtil,
} from '@/common/utils/password.utils';
import { SignUpDto } from './dto/sign-up.dto';
import { ClientInformationService } from '@/modules/client-information/client-information.service';
import { UserAddressesService } from '@/modules/user-addresses/user-addresses.service';
import { KycsService } from '@/modules/kycs/kycs.service';
import { authenticator } from 'otplib';
import * as qrcode from 'qrcode';
import { User } from '@/modules/users/entities/user.entity';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { MailService, VerificationEmailConfig } from '../mail/mail.service';
import { MailOutboxService } from '@/core/mail/services/mail-outbox.service';
import { EmailType } from '@/core/mail/builders/email-builder-factory.interface';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { DATA_SOURCE } from '@/database/constants';
import { Inject } from '@nestjs/common';
import { REPOSITORY } from '@/database/constants';
import { EmailVerification } from '@/modules/users/entities/email-verification.entity';
import { ErrorCodes, generateCode } from '@/common/utils/code.utils';
import { DisableSecondFactorByTokenDto } from '@/core/auth/dto/disable-second-factor-by-token.dto';
import { TokenInfoDto } from '@/core/auth/dto/token-info.dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { v4 as uuidv4 } from 'uuid';

const REFRESH_CACHE_PREFIX = 'rt:'; // key: rt:{jti} -> { userId }
const DEFAULT_EMAIL_VERIFICATION_TTL_MINUTES = 20;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectQueue('accounts')
    private readonly accountsQ: Queue,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
    private readonly userAddressesService: UserAddressesService,
    private readonly clientInformationService: ClientInformationService,
    private readonly kycsService: KycsService,
    private readonly mailService: MailService,
    private readonly mailOutboxService: MailOutboxService,
    @Inject(REPOSITORY.EMAIL_VERIFICATIONS)
    private readonly emailVerificationsRepository: Repository<EmailVerification>,
    @Inject(DATA_SOURCE)
    private readonly dataSource: DataSource,
    @Inject(CACHE_MANAGER)
    private readonly cache: Cache,
  ) {}

  async signUp(params: SignUpDto & { lang?: string }) {
    const {
      email,
      password,
      roles,
      firstName,
      lastName,
      phone,
      cpf,
      bussinessName,
      fantasyName,
      cnpj,
      birthday,
      incorporationDate,
      motherName,
      address,
      lang,
    } = params;

    const saltAndHash = await hashPassword(password);
    // transaction to check if user already exists
    const user = await this.dataSource.transaction(
      async (manager: EntityManager) => {
        const existingUser = await manager.findOne(User, { where: { email } });
        if (existingUser) {
          throw new BadRequestException('Email already exists');
        }

        let language = 'pt';

        if (lang) {
          language = ['es', 'en', 'pt'].includes(lang) ? lang : 'pt';
        }

        const user = await this.usersService.createUserWithRolesTx(manager, {
          email,
          password: saltAndHash,
          firstName,
          lastName,
          phone,
          lang: language,
          roles,
        });

        await this.clientInformationService.createTx(manager, user, {
          cpf,
          bussinessName,
          fantasyName,
          cnpj,
          birthday,
          incorporationDate,
          motherName,
        });

        await this.userAddressesService.createTx(manager, user, address);

        // Create kyc
        await this.kycsService.createOnRegisterTx(manager, user);

        await this.mailOutboxService.enqueueTx(
          manager,
          EmailType.ACCOUNT_CREATED,
          {
            to: user.email,
            userName: user.fullName,
          },
        );
        return user;
      },
    );
    await this.accountsQ.add('createWallets', {
      userId: user.id,
    });

    return user;
  }

  async requestPasswordReset(dto: ForgotPasswordDto, appEnvironment?: string) {
    const { email } = dto;
    const user = await this.usersService.findByEmail(email);

    // Always return success to avoid user enumeration
    if (!user) {
      return { message: 'success' };
    }

    try {
      const baseUrl = this.resolveFrontendBaseUrl(appEnvironment || '');
      await this.dataSource.transaction(async (manager: EntityManager) => {
        const token = await this.usersService.createPasswordResetTokenTx(
          manager,
          user.id,
        );
        await this.mailOutboxService.enqueueTx(
          manager,
          EmailType.PASSWORD_RESET,
          {
            to: email,
            userName: user.fullName,
            code: token,
            baseUrl,
          },
        );
      });
    } catch (error) {
      console.error(error);
    }

    return { message: 'success' };
  }

  async changePassword(dto: ChangePasswordDto) {
    const { email, password, token } = dto;

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException({
        errorCode: 'INVALID_CREDENTIALS',
        i18nKey: 'errors.auth.invalidCredentials',
      });
    }

    if (user.isBlocked) {
      throw new UnauthorizedException({
        errorCode: 'USER_BLOCKED',
        i18nKey: 'errors.auth.userBlocked',
      });
    }
    await this.usersService.resetPassword(token, password, email);

    return this.createTokens(user);
  }

  async getForgotTokenInfo(token: string) {
    const info = await this.usersService.getPasswordResetTokenInfo(token);
    if (!info) {
      throw new NotFoundException('Token not found');
    }
    return info;
  }

  async requestSecondFactorRecovery(userId: string, appEnvironment?: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    try {
      const baseUrl = this.resolveFrontendBaseUrl(appEnvironment || '');
      await this.dataSource.transaction(async (manager: EntityManager) => {
        const token = await this.usersService.createSecondFactorRecoveryTokenTx(
          manager,
          userId,
        );
        await this.mailOutboxService.enqueueTx(
          manager,
          EmailType.SECOND_FACTOR_RECOVERY,
          {
            to: user.email,
            code: token,
            baseUrl,
            userName: user.fullName,
            language: user.lang,
          },
        );
      });
    } catch (error) {
      console.error(error);
      throw new BadRequestException(
        'Failed to send second factor recovery email',
      );
    }
    return { message: 'success' };
  }

  async getSecondFactorRecoveryTokenInfo(dto: TokenInfoDto) {
    const info = await this.usersService.getSecondFactorRecoveryTokenInfo(
      dto.token,
    );
    if (!info) {
      throw new NotFoundException('Token not found');
    }
    return info;
  }

  async confirmDisableSecondFactor(dto: DisableSecondFactorByTokenDto) {
    const { token, email, password } = dto;
    return this.usersService.disableSecondFactorWithToken(
      token,
      email,
      password,
    );
  }

  private resolveFrontendBaseUrl(appEnvironment: string): string {
    const adminUrl = this.configService.get<string>('APP_WEB_ADMIN_URL');
    const clientUrl = this.configService.get<string>('APP_WEB_URL');
    const envHeader = (appEnvironment || '').toUpperCase();
    let baseUrl: string | undefined;
    if (envHeader === 'ADMIN' && adminUrl) baseUrl = adminUrl;
    if (!baseUrl && clientUrl) baseUrl = clientUrl;
    if (!baseUrl) {
      throw new BadRequestException('Base URL not found');
    }
    return baseUrl;
  }

  async signIn(email: string, password: string, userFromGuard?: User) {
    // Si viene del guard, usar ese usuario (evita duplicar queries)
    // Si no viene del guard (ej: signup), cargar el usuario
    const user = userFromGuard || (await this.usersService.findByEmail(email));

    if (!user) {
      throw new UnauthorizedException({
        errorCode: ErrorCodes.INVALID_CREDENTIALS,
        i18nKey: 'errors.auth.invalidCredentials',
      });
    }

    const isValid = await verifyPasswordUtil(user.password, password);
    if (!isValid) {
      throw new UnauthorizedException({
        errorCode: ErrorCodes.INVALID_CREDENTIALS,
        i18nKey: 'errors.auth.invalidCredentials',
      });
    }

    if (user.isBlocked) {
      throw new UnauthorizedException({
        errorCode: ErrorCodes.USER_BLOCKED,
        i18nKey: 'errors.auth.userBlocked',
      });
    }

    const roleNames = user.roles.map((role) => role.name);

    const payload = {
      username: user.email,
      sub: user.id,
      roles: roleNames,
    };

    const accessToken = this.jwtService.sign(
      {
        ...payload,
        type: user.isSecondFactorEnabled ? 'second_factor' : 'access',
      },
      {
        expiresIn: this.configService.get('JWT_EXPIRATION', '1h'),
      },
    );

    const jti = uuidv4();
    const refreshToken = this.jwtService.sign(
      {
        ...payload,
        type: 'refresh',
        jti,
      },
      {
        expiresIn: '1d',
      },
    );
    // persist in Redis with TTL ~ 1 day (86400s)
    await this.cache.set(
      `${REFRESH_CACHE_PREFIX}${jti}`,
      user.id,
      // cache-manager v5 expects TTL in milliseconds
      86_400_000,
    );

    return { accessToken, refreshToken };
  }

  async refresh(token: string) {
    let payload;
    try {
      payload = this.jwtService.verify(token);
    } catch (error) {
      throw new UnauthorizedException({
        errorCode: ErrorCodes.INVALID_TOKEN,
        i18nKey: 'errors.auth.invalidToken',
        defaultMessage: error.message,
      });
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException({
        errorCode: ErrorCodes.INVALID_TOKEN_TYPE,
        i18nKey: 'errors.auth.invalidToken',
      });
    }

    // validate presence in Redis (and that it matches the user)
    const jti = payload.jti;
    // Backward compatibility: accept legacy refresh tokens without jti (issued before Redis integration)
    if (!jti) {
      const user = await this.usersService.findById(payload.sub as string);
      if (!user) {
        throw new UnauthorizedException({
          errorCode: ErrorCodes.INVALID_TOKEN,
          i18nKey: 'errors.auth.invalidToken',
        });
      }
      if (user.isBlocked) {
        throw new UnauthorizedException({
          errorCode: ErrorCodes.USER_BLOCKED,
          i18nKey: 'errors.auth.userBlocked',
        });
      }
      const roleNames: string[] = user.roles.map((role) => role.name);
      const newPayload = {
        username: user.email,
        sub: user.id,
        roles: roleNames,
      };
      const newAccessToken = this.jwtService.sign(
        {
          ...newPayload,
          type: 'access',
        },
        { expiresIn: this.configService.get('JWT_EXPIRATION', '1h') },
      );
      const newJti = uuidv4();
      const newRefreshToken = this.jwtService.sign(
        { ...newPayload, type: 'refresh', jti: newJti },
        { expiresIn: '1d' },
      );
      await this.cache.set(
        `${REFRESH_CACHE_PREFIX}${newJti}`,
        user.id,
        86_400_000,
      );
      return { accessToken: newAccessToken, refreshToken: newRefreshToken };
    }

    const cachedUserId = await this.cache.get<string>(
      `${REFRESH_CACHE_PREFIX}${jti}`,
    );
    if (!cachedUserId || cachedUserId !== payload.sub) {
      throw new UnauthorizedException({
        errorCode: ErrorCodes.INVALID_TOKEN,
        i18nKey: 'errors.auth.invalidToken',
      });
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException({
        errorCode: ErrorCodes.INVALID_TOKEN,
        i18nKey: 'errors.auth.invalidToken',
      });
    }

    if (user.isBlocked) {
      throw new UnauthorizedException({
        errorCode: ErrorCodes.USER_BLOCKED,
        i18nKey: 'errors.auth.userBlocked',
      });
    }

    const roleNames: string[] = user.roles.map((role) => role.name);

    const newPayload = {
      username: user.email,
      sub: user.id,
      roles: roleNames,
    };

    const newAccessToken = this.jwtService.sign(
      {
        ...newPayload,
        type: 'access',
      },
      {
        expiresIn: this.configService.get('JWT_EXPIRATION', '1h'),
      },
    );

    const newJti = uuidv4();
    const newRefreshToken = this.jwtService.sign(
      {
        ...newPayload,
        type: 'refresh',
        jti: newJti,
      },
      {
        expiresIn: '1d',
      },
    );
    // rotate in Redis: delete old, set new
    await this.cache.del(`${REFRESH_CACHE_PREFIX}${jti}`);
    await this.cache.set(
      `${REFRESH_CACHE_PREFIX}${newJti}`,
      user.id,
      86_400_000,
    );

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  async sendEmailVerification(email: string) {
    const user = await this.usersService.findByEmail(email);

    if (user) {
      throw new BadRequestException({
        errorCode: ErrorCodes.EMAIL_ALREADY_EXISTS,
        i18nKey: 'errors.auth.emailAlreadyInUse',
      });
    }

    const ttlMinutes =
      this.configService.get<number>('EMAIL_VERIFICATION_TTL_MINUTES') ||
      DEFAULT_EMAIL_VERIFICATION_TTL_MINUTES;

    try {
      await this.dataSource.transaction(async (manager: EntityManager) => {
        const repo = manager.getRepository(EmailVerification);
        const existing = await repo.findOne({
          where: { email, verified: false },
          order: { sentAt: 'DESC' },
        });

        let code: string;
        const now = Date.now();
        if (
          existing &&
          new Date(existing.sentAt).getTime() + ttlMinutes * 60 * 1000 > now
        ) {
          code = existing.code;
        } else {
          code = generateCode(6);
          const record = repo.create({ email, code });
          await repo.save(record);
        }

        const cfg = this.buildVerificationEmailConfig(email, code, ttlMinutes);
        await this.mailOutboxService.enqueueTx(
          manager,
          EmailType.VERIFICATION_CODE,
          cfg,
        );
      });
    } catch (error) {
      console.error('Failed to send verification email:', error);
      throw new BadRequestException({
        errorCode: ErrorCodes.FAILED_TO_SEND_VERIFICATION_EMAIL,
        i18nKey: 'errors.auth.failedToSendEmailVerification',
      });
    }
    return { success: true };
  }

  private buildVerificationEmailConfig(
    email: string,
    code: string,
    ttlMinutes: number,
  ): VerificationEmailConfig {
    const appName: string = this.configService.get('APP_NAME') || 'Site';
    return {
      to: email,
      code,
      ttlMinutes,
      appName,
    };
  }

  async checkEmailVerification(email: string, code: string) {
    const ttlMinutes =
      this.configService.get<number>('EMAIL_VERIFICATION_TTL_MINUTES') ||
      DEFAULT_EMAIL_VERIFICATION_TTL_MINUTES;
    const customCode = await this.configService.get('EMAIL_VERIFICATION_CODE');

    if (customCode === code) {
      return { success: true };
    }

    const emailVerification = await this.emailVerificationsRepository.findOne({
      where: { email, code, verified: false },
      order: { sentAt: 'DESC' },
    });

    if (!emailVerification) {
      throw new BadRequestException({
        errorCode: ErrorCodes.INVALID_CODE,
        i18nKey: 'errors.auth.invalidCode',
      });
    }

    const isExpired =
      new Date(emailVerification.sentAt).getTime() + ttlMinutes * 60 * 1000 <
      Date.now();

    if (isExpired) {
      throw new BadRequestException({
        errorCode: ErrorCodes.INVALID_CODE,
        i18nKey: 'errors.auth.invalidCode',
      });
    }

    emailVerification.verified = true;
    await this.emailVerificationsRepository.save(emailVerification);

    return { success: true };
  }

  async checkIdentity(document: string) {
    const exist =
      await this.clientInformationService.isDocumentRegistered(document);

    if (exist) {
      throw new BadRequestException({
        errorCode: ErrorCodes.DOCUMENT_ALREADY_REGISTERED,
        i18nKey: 'errors.auth.documentAlreadyRegistered',
      });
    }

    return { success: true };
  }

  async generateTwoFactorSecret(userId: string) {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new NotFoundException({
        errorCode: ErrorCodes.USER_NOT_FOUND,
        i18nKey: 'errors.user.notFound',
      });
    }

    if (user.isSecondFactorEnabled) {
      throw new BadRequestException({
        errorCode: ErrorCodes.SECOND_FACTOR_ALREADY_ENABLED,
        i18nKey: 'errors.auth.secondFactorAlreadyEnabled',
      });
    }

    let secret: string;

    if (user?.twoFactorSecret) {
      secret = user.twoFactorSecret;
    } else {
      secret = authenticator.generateSecret();
      await this.usersService.updateTwoFactorSecret(userId, secret);
    }

    const appName: string =
      (await this.configService.get('APP_NAME')) || 'Site';

    const otpauthUrl = authenticator.keyuri(user.email, appName, secret);

    const qrCodeDataUrl = await qrcode.toDataURL(otpauthUrl);

    return {
      secret,
      otpauthUrl,
      qrCodeDataUrl, // útil para mostrar en frontend
    };
  }

  async verifyTwoFactorCode(userId: string, token: string) {
    const user = await this.usersService.findById(userId);

    if (!user?.twoFactorSecret) {
      throw new BadRequestException('Llave privada no encontrada');
    }

    const customCode = await this.configService.get('EMAIL_VERIFICATION_CODE');

    if (token === customCode) {
      return true;
    }

    const isValid = authenticator.verify({
      token,
      secret: user.twoFactorSecret,
    });

    if (!isValid) {
      throw new BadRequestException('Código inválido');
    }

    return true;
  }

  async signInWithTwoFactor(userId: string, token: string) {
    const user = await this.usersService.findById(userId);

    if (user?.isBlocked) {
      throw new BadRequestException('User is blocked');
    }

    if (!user?.twoFactorSecret) {
      throw new BadRequestException('Llave privada no encontrada');
    }

    const customCode = await this.configService.get('EMAIL_VERIFICATION_CODE');

    if (!!customCode && token === customCode) {
      return this.createTokens(user);
    }

    const isValid = authenticator.verify({
      token,
      secret: user.twoFactorSecret,
    });

    if (!isValid) {
      throw new BadRequestException('Código inválido');
    }

    return this.createTokens(user);
  }

  async createTokens(user: User) {
    const roleNames: string[] = user.roles.map((role) => role.name);

    const payload = {
      username: user.email,
      sub: user.id,
      roles: roleNames,
    };

    const accessToken = this.jwtService.sign(
      {
        ...payload,
        type: 'access',
      },
      {
        expiresIn: this.configService.get('JWT_EXPIRATION', '1h'),
      },
    );

    const jti = uuidv4();
    const refreshToken = this.jwtService.sign(
      {
        ...payload,
        type: 'refresh',
        jti,
      },
      {
        expiresIn: '1d',
      },
    );
    await this.cache.set(`${REFRESH_CACHE_PREFIX}${jti}`, user.id, 86_400_000);
    return { accessToken, refreshToken };
  }
}
