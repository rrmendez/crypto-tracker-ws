/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InternalServerErrorException } from '@/common/exceptions/internal-server-error.exception';
import {
  In,
  Repository,
  EntityManager,
  DataSource,
  FindOptionsWhere,
  Between,
  FindOptionsOrder,
  ILike,
  Raw,
  MoreThanOrEqual,
  LessThanOrEqual,
} from 'typeorm';
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { REPOSITORY, DATA_SOURCE } from '@/database/constants';
import { RoleEnum } from '@/common/enums/role.enum';
import { PhoneVerification } from './entities/phone-verification.entity';
import { ErrorCodes, generateCode } from '@/common/utils/code.utils';
import { PhoneRequestDto } from './dto/phone-request.dto';
import { PhoneVerificationDto } from './dto/phone-verification.dto';
import { ConfigService } from '@nestjs/config';
import { UserAddressStatusEnum } from '@/common/enums/user-address-status.enum';
import { UserAddress } from '../user-addresses/entities/user-address.entity';
import { S3Service } from '@/core/uploads/s3.service';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { randomBytes } from 'crypto';
import {
  hashPassword,
  verifyPassword as verifyPasswordUtil,
} from '../../common/utils/password.utils';
import { EnableSecondFactorDto } from './dto/enable-second-factor.dto';
import { DisableSecondFactorDto } from './dto/disable-second-factor.dto';
import { PasswordReset } from '@/modules/users/entities/password-reset.entity';
import { SecondFactorRecovery } from '@/modules/users/entities/second-factor-recovery.entity';
import { UserSecurityLog } from './entities/user-security-log.entity';
import { UserSecurityActionType } from '@/common/enums/user-security-action.enum';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';
import { ADMIN_ROLES } from './constants/role.constants';
import { ActivateDeactivateAdminUserDto } from './dto/admin-user-activation.dto';
import { BadRequestException } from '@/common/exceptions';
import { EmailType } from '@/core/mail/builders';
import { MailOutboxService } from '@/core/mail/services/mail-outbox.service';
import { UsersResponseVm } from './dto/users-response.vm';
import { ClientsFilterDto } from './dto/clients-filter.dto';
import { UsersFilterDto } from './dto/users-filter.dto';
import { SecurityLogsFilterDto } from './dto/security-logs-filter.dto';
import { PasswordResetAction } from '@/common/enums/password-reset-action.enum';
import { Kyc } from '@/modules/kycs/entities/kyc.entity';
import { KycStatusEnum } from '@/common/enums/kyc-type-enum';
import { CheckEmailAvailabilityResponseVm } from './dto/check-email-availability-response.vm';

@Injectable()
export class UsersService {
  constructor(
    @Inject(REPOSITORY.USERS)
    private readonly usersRepository: Repository<User>,
    @Inject(REPOSITORY.ROLES)
    private readonly rolesRepository: Repository<Role>,
    @Inject(REPOSITORY.PHONE_VERIFICATIONS)
    private readonly phoneVerificationsRepository: Repository<PhoneVerification>,
    @Inject(REPOSITORY.USER_ADDRESSES)
    private readonly userAddressesRepository: Repository<UserAddress>,
    @Inject(REPOSITORY.PASSWORD_RESETS)
    private readonly passwordResetRepository: Repository<PasswordReset>,
    @Inject(REPOSITORY.USER_SECURITY_LOGS)
    private readonly userSecurityLogsRepository: Repository<UserSecurityLog>,
    @Inject(REPOSITORY.SECOND_FACTOR_RECOVERIES)
    private readonly secondFactorRecoveryRepository: Repository<SecondFactorRecovery>,
    @Inject(DATA_SOURCE)
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly s3Service: S3Service,
    private readonly mailOutboxService: MailOutboxService,
  ) {}

  private readonly defaultTTLMinutes = 20;

  /**
   * Busca un usuario por ID que tenga roles de administrador
   * @param userId ID del usuario a buscar
   * @returns Usuario con roles de admin o null si no existe/no es admin
   */
  private async findAdminUserById(userId: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'role')
      .where('user.id = :userId', { userId })
      .andWhere('role.name IN (:...adminRoles)', { adminRoles: ADMIN_ROLES })
      .getOne();
  }

  async getAllUsers(): Promise<User[]> {
    return this.usersRepository.find();
  }

  async getPaginatedUsers(
    page = 1,
    limit = 10,
    filters?: UsersFilterDto,
  ): Promise<[User[], number]> {
    const where: FindOptionsWhere<User>[] = [];

    const excludeEmails = this.configService.get<string>(
      'EXCLUDE_EMAILS_FROM_USERS_LIST',
      'mendez900529@gmail.com',
    );
    const excludedList = (excludeEmails || '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter((e) => !!e);

    // Base condition (todos los ADMIN por defecto)
    const baseWhere: FindOptionsWhere<User> = {
      roles: {
        name: RoleEnum.ADMIN,
      },
    };

    // Filtros dinámicos
    if (filters?.fullName) {
      baseWhere.fullName = ILike(`%${filters.fullName}%`);
    }

    if (filters?.email) {
      // Combina el filtro por email con exclusión de correos
      if (excludedList.length > 0) {
        baseWhere.email = Raw(
          (alias) =>
            `${alias} ILIKE :email AND LOWER(${alias}) NOT IN (:...excluded)`,
          { email: `%${filters.email}%`, excluded: excludedList },
        );
      } else {
        baseWhere.email = ILike(`%${filters.email}%`);
      }
    } else if (excludedList.length > 0) {
      // Sin filtro específico de email, solo excluir los listados
      baseWhere.email = Raw(
        (alias) => `LOWER(${alias}) NOT IN (:...excluded)`,
        { excluded: excludedList },
      );
    }

    // Fecha exacta
    if (filters?.createdAt) {
      const start = new Date(filters.createdAt);
      start.setHours(0, 0, 0, 0);

      const end = new Date(filters.createdAt);
      end.setHours(23, 59, 59, 999);

      baseWhere.createdAt = Between(start, end);
    }

    if (filters?.countryCode) {
      baseWhere.addresses = {
        country: filters.countryCode,
      };
    }

    if (filters?.verified !== undefined) {
      baseWhere.verified = filters.verified;
    }

    if (filters?.isBlocked !== undefined) {
      baseWhere.isBlocked = filters.isBlocked;
    }

    // 🔍 composerSearch: búsqueda global insensible a mayúsculas
    if (filters?.composerSearch) {
      const search = `%${filters.composerSearch}%`;
      // Construye condiciones de OR respetando la exclusión de emails
      const fullNameWhere: FindOptionsWhere<User> = {
        ...baseWhere,
        fullName: ILike(search),
      };
      const emailWhere: FindOptionsWhere<User> = {
        ...baseWhere,
        email:
          excludedList.length > 0
            ? Raw(
                (alias) =>
                  `${alias} ILIKE :emailSearch AND LOWER(${alias}) NOT IN (:...excluded)`,
                { emailSearch: search, excluded: excludedList },
              )
            : ILike(search),
      };
      const phoneWhere: FindOptionsWhere<User> = {
        ...baseWhere,
        phone: ILike(search),
      };
      where.push(fullNameWhere, emailWhere, phoneWhere);
    } else {
      where.push(baseWhere);
    }

    // Orden dinámico (por defecto: createdAt DESC)
    const order: FindOptionsOrder<User> = {
      [filters?.orderBy ?? 'createdAt']:
        filters?.order === 'ASC' ? 'ASC' : 'DESC',
    };

    return this.usersRepository.findAndCount({
      take: limit,
      skip: (page - 1) * limit,
      where,
      order,
      relations: ['roles', 'addresses', 'securityLogs'],
    });
  }

  async getPaginatedClients(
    page = 1,
    limit = 10,
    filters?: ClientsFilterDto,
  ): Promise<[User[], number]> {
    const where: FindOptionsWhere<User>[] = [];

    // Base condition (todos los ADMIN por defecto)
    const baseWhere: FindOptionsWhere<User> = {
      roles: {
        ...(filters?.roles && filters.roles.length > 0
          ? { name: In(filters.roles) }
          : { name: In([RoleEnum.USER, RoleEnum.MERCHANT]) }),
      },
    };

    // Filtros dinámicos
    if (filters?.fullName) {
      baseWhere.fullName = ILike(`%${filters.fullName}%`);
    }

    if (filters?.email) {
      baseWhere.email = ILike(`%${filters.email}%`);
    }

    // País (desde addresses)
    if (filters?.countryCode) {
      (baseWhere as any).addresses = {
        country: filters.countryCode,
        status: UserAddressStatusEnum.ACTIVE,
      };
    }

    // Por status en KYC
    if (filters?.complianceKycStatus) {
      (baseWhere as any).kyces = {
        isForCompliance: true,
        status: filters.complianceKycStatus,
      };
    }

    // Fecha exacta
    if (filters?.createdAt) {
      const start = new Date(filters.createdAt);
      start.setHours(0, 0, 0, 0);

      const end = new Date(filters.createdAt);
      end.setHours(23, 59, 59, 999);

      baseWhere.createdAt = Between(start, end);
    }

    // Fechas por rango
    if (filters?.from && filters?.to) {
      baseWhere.createdAt = Between(filters.from, filters.to);
    } else if (filters?.from) {
      baseWhere.createdAt = MoreThanOrEqual(filters.from);
    } else if (filters?.to) {
      baseWhere.createdAt = LessThanOrEqual(filters.to);
    }

    if (filters?.verified !== undefined) {
      baseWhere.verified = filters.verified;
    }

    if (filters?.isBlocked !== undefined) {
      baseWhere.isBlocked = filters.isBlocked;
    }

    if (filters?.withdrawBlocked !== undefined) {
      baseWhere.withdrawBlocked = filters.withdrawBlocked;
    }

    // 🔍 composerSearch: búsqueda global insensible a mayúsculas
    if (filters?.composerSearch) {
      // 🔹 Limpia todo excepto letras y números
      const cleanedSearch = filters.composerSearch.replace(/[^a-zA-Z0-9]/g, '');

      const search = `%${filters.composerSearch}%`;
      const cleaned = `%${cleanedSearch}%`;

      where.push(
        { ...baseWhere, fullName: ILike(search) },
        { ...baseWhere, email: ILike(search) },
        { ...baseWhere, phone: ILike(search) },
        { ...baseWhere, clientInformation: { cpf: ILike(cleaned) } },
        { ...baseWhere, clientInformation: { cnpj: ILike(cleaned) } },
      );
    } else {
      where.push(baseWhere);
    }

    // --- Orden dinámico ---
    const order: FindOptionsOrder<User> = {
      [filters?.orderBy ?? 'createdAt']:
        filters?.order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC',
    };

    // --- Ejecución de la búsqueda ---
    return this.usersRepository.findAndCount({
      where,
      take: limit,
      skip: (page - 1) * limit,
      relations: ['roles', 'clientInformation', 'kyces', 'addresses'],
      order,
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
      relations: ['roles'],
    });
  }

  async checkEmailAvailability(
    email: string,
  ): Promise<CheckEmailAvailabilityResponseVm> {
    const user = await this.findByEmail(email);
    return new CheckEmailAvailabilityResponseVm(!user, email);
  }

  async findById(
    id: string,
    relations: string[] = ['roles', 'clientInformation', 'addresses'],
  ): Promise<User | null> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations,
    });

    if (user) {
      const activeAddress = await this.userAddressesRepository.findOne({
        where: { user: { id }, status: UserAddressStatusEnum.ACTIVE },
      });
      user.addresses = activeAddress ? [activeAddress] : [];
    }

    return user;
  }

  // ---------------------------------------------------------------------------
  // Security: account and transfer locks with auditing
  // ---------------------------------------------------------------------------

  async lockAccount(
    targetUserId: string,
    currentUserId: string,
    reason?: string,
    actionType: UserSecurityActionType = UserSecurityActionType.ACCOUNT_LOCK,
  ) {
    return await this.usersRepository.manager.transaction(async (manager) => {
      const user = await manager.findOne(User, {
        where: { id: targetUserId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user) {
        throw new NotFoundException('User not found');
      }
      if (user.isBlocked) {
        throw new BadRequestException({
          errorCode: ErrorCodes.USER_INVALID_STATUS,
          i18nKey: 'errors.user.invalidStatus',
        });
      }
      user.isBlocked = true;
      await manager.save(user);

      await this.appendSecurityLogTx(
        manager,
        targetUserId,
        currentUserId,
        actionType,
        reason,
      );

      return { message: 'Account locked' };
    });
  }

  async unlockAccount(
    targetUserId: string,
    currentUserId: string,
    reason?: string,
    actionType: UserSecurityActionType = UserSecurityActionType.ACCOUNT_UNLOCK,
  ) {
    return await this.usersRepository.manager.transaction(async (manager) => {
      const user = await manager.findOne(User, {
        where: { id: targetUserId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user) {
        throw new NotFoundException('User not found');
      }
      if (!user.isBlocked) {
        throw new BadRequestException({
          errorCode: ErrorCodes.USER_INVALID_STATUS,
          i18nKey: 'errors.user.invalidStatus',
        });
      }

      // Check if user has a rejected compliance KYC
      const rejectedComplianceKyc = await manager.findOne(Kyc, {
        where: {
          user: { id: targetUserId },
          isForCompliance: true,
          status: KycStatusEnum.REJECTED,
        },
      });

      if (rejectedComplianceKyc) {
        throw new BadRequestException({
          errorCode: ErrorCodes.CANNOT_UNLOCK_WITH_REJECTED_COMPLIANCE,
          i18nKey: 'errors.user.cannotUnlockWithRejectedCompliance',
        });
      }

      user.isBlocked = false;
      await manager.save(user);

      await this.appendSecurityLogTx(
        manager,
        targetUserId,
        currentUserId,
        actionType,
        reason,
      );

      return { message: 'Account unlocked' };
    });
  }

  async lockTransfers(
    targetUserId: string,
    currentUserId: string,
    reason?: string,
  ) {
    return await this.usersRepository.manager.transaction(async (manager) => {
      const user = await manager.findOne(User, {
        where: { id: targetUserId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user) {
        throw new NotFoundException('User not found');
      }
      if (user.withdrawBlocked) {
        throw new BadRequestException({
          errorCode: ErrorCodes.TRANSFERS_ALREADY_LOCKED,
          i18nKey: 'errors.user.transfersAlreadyLocked',
        });
      }
      user.withdrawBlocked = true;
      await manager.save(user);

      await this.appendSecurityLogTx(
        manager,
        targetUserId,
        currentUserId,
        UserSecurityActionType.TRANSFER_LOCK,
        reason,
      );

      return { message: 'Transfers locked' };
    });
  }

  async unlockTransfers(
    targetUserId: string,
    currentUserId: string,
    reason?: string,
  ) {
    return await this.usersRepository.manager.transaction(async (manager) => {
      const user = await manager.findOne(User, {
        where: { id: targetUserId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user) {
        throw new NotFoundException('User not found');
      }
      if (!user.withdrawBlocked) {
        throw new BadRequestException({
          errorCode: ErrorCodes.TRANSFERS_ALREADY_UNLOCKED,
          i18nKey: 'errors.user.transfersAlreadyUnlocked',
        });
      }
      user.withdrawBlocked = false;
      await manager.save(user);

      await this.appendSecurityLogTx(
        manager,
        targetUserId,
        currentUserId,
        UserSecurityActionType.TRANSFER_UNLOCK,
        reason,
      );

      return { message: 'Transfers unlocked' };
    });
  }

  async listUserSecurityLogs(
    userId: string,
    page = 1,
    limit = 10,
    filters?: SecurityLogsFilterDto,
  ): Promise<{ logs: UserSecurityLog[]; total: number }> {
    const qb = this.userSecurityLogsRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.createdBy', 'createdBy')
      .leftJoinAndSelect('log.user', 'user')
      .where('user.id = :userId', { userId })
      .orderBy('log.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (filters?.actionType) {
      qb.andWhere('log.actionType = :actionType', {
        actionType: filters.actionType,
      });
    }

    if (filters?.createdAt) {
      qb.andWhere('DATE(log.createdAt) = DATE(:createdAt)', {
        createdAt: filters.createdAt,
      });
    }

    const [logs, total] = await qb.getManyAndCount();
    return { logs, total };
  }

  private async appendSecurityLogTx(
    manager: EntityManager,
    targetUserId: string,
    currentUserId: string,
    actionType: UserSecurityActionType,
    reason?: string,
  ) {
    const log = manager.create(UserSecurityLog, {
      user: { id: targetUserId } as User,
      actionType,
      reason,
      createdBy: { id: currentUserId } as User,
      updatedBy: { id: currentUserId } as User,
    });
    await manager.save(log);
  }

  async createUserWithRolesTx(
    manager: EntityManager,
    data: {
      email: string;
      password: string;
      firstName: string;
      lastName?: string;
      phone?: string;
      roles: string[];
      lang?: string;
    },
  ): Promise<User> {
    const { email, password, firstName, lastName, phone, roles, lang } = data;

    const fullName = `${firstName}${lastName ? ` ${lastName}` : ''}`;

    const roleEntities = await manager.find(Role, {
      where: { name: In(roles) },
    });

    const user = manager.create(User, {
      email,
      password,
      firstName,
      lastName,
      fullName,
      phone,
      verified: false,
      avatar: '',
      lang,
      roles: roleEntities,
    });

    return manager.save(User, user);
  }

  async createPhoneVerification(userId: string, dto: PhoneRequestDto) {
    const oldVerification = await this.phoneVerificationsRepository.findOne({
      where: {
        user: { id: userId },
        phone: dto.phone,
        verified: false,
      },
      order: { sendedAt: 'DESC' },
    });

    if (oldVerification) {
      // TODO: Send SMS with verification code

      return {
        message: 'Phone verification already sended',
      };
    }

    const code = generateCode();

    const phoneVerification = this.phoneVerificationsRepository.create({
      user: { id: userId },
      phone: dto.phone,
      code,
    });

    await this.phoneVerificationsRepository.save(phoneVerification);

    // TODO: Send SMS with verification code

    return {
      message: 'Phone verification sended',
    };
  }

  async verifyPhoneCode(userId: string, dto: PhoneVerificationDto) {
    const customCode = await this.configService.get('EMAIL_VERIFICATION_CODE');

    let phoneVerification: PhoneVerification | null = null;

    if (customCode === dto.code) {
      phoneVerification = await this.phoneVerificationsRepository.findOne({
        where: {
          user: { id: userId },
          phone: dto.phone,
          verified: false,
        },
        order: { sendedAt: 'DESC' },
      });
    } else {
      phoneVerification = await this.phoneVerificationsRepository.findOne({
        where: {
          user: { id: userId },
          code: dto.code,
          phone: dto.phone,
          verified: false,
        },
        order: { sendedAt: 'DESC' },
      });
    }

    if (!phoneVerification) {
      throw new BadRequestException({
        errorCode: ErrorCodes.INVALID_CODE,
        i18nKey: 'errors.auth.invalidCode',
      });
    }

    phoneVerification.verified = true;

    await this.phoneVerificationsRepository.save(phoneVerification);

    await this.usersRepository.update(userId, {
      phone: phoneVerification.phone,
    });

    return { message: 'Phone verified' };
  }

  async updateAvatar(userId: string, file: Express.Multer.File) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Guardar en S3
    const savedFile = await this.s3Service.uploadFile(file);

    // Actualizar avatar
    user.avatar = savedFile.url;

    await this.usersRepository.save(user);

    return {
      avatar: savedFile.url,
    };
  }

  async updatePassword(userId: string, dto: UpdatePasswordDto) {
    return await this.dataSource.transaction(async (manager: EntityManager) => {
      const user = await manager.findOne(User, { where: { id: userId } });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Validar password
      await this.checkPassword(user, dto.password);

      // Save new password
      user.password = await hashPassword(dto.newPassword);

      // save user
      await manager.save(User, user);

      await this.mailOutboxService.enqueueTx(
        manager,
        EmailType.PASSWORD_UPDATED,
        { to: user.email, userName: user.fullName },
        undefined,
      );

      return {
        message: 'Password updated',
      };
    });
  }

  async verifyPassword(userId: string, password: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.checkPassword(user, password);

    return { message: 'Password verified' };
  }

  async createPasswordResetToken(userId: string, action?: PasswordResetAction) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }
    const existingPasswordReset = await this.passwordResetRepository.findOne({
      where: { user: { id: userId }, used: false },
    });
    if (
      existingPasswordReset &&
      existingPasswordReset.expiresAt > new Date(Date.now())
    ) {
      existingPasswordReset.used = true;
      await this.passwordResetRepository.save(existingPasswordReset);
    }

    const token = randomBytes(32).toString('hex');
    const passwordReset = this.buildPasswordReset(userId, token, action);

    await this.passwordResetRepository.save(passwordReset);

    return token;
  }

  async createPasswordResetTokenTx(
    manager: EntityManager,
    userId: string,
    action?: PasswordResetAction,
  ) {
    const user = await manager.findOne(User, { where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const passwordResetRepo = manager.getRepository(PasswordReset);
    const existingPasswordReset = await passwordResetRepo.findOne({
      where: { user: { id: userId }, used: false },
      order: { expiresAt: 'DESC' },
    });
    if (
      existingPasswordReset &&
      existingPasswordReset.expiresAt > new Date(Date.now())
    ) {
      existingPasswordReset.used = true;
      await passwordResetRepo.save(existingPasswordReset);
    }
    const token = randomBytes(32).toString('hex');
    const expiresAt =
      this.configService.get('PASSWORD_RESET_TTL_MINUTES') ||
      this.defaultTTLMinutes;
    const passwordReset = passwordResetRepo.create({
      user: { id: userId } as User,
      token,
      expiresAt: new Date(Date.now() + Number(expiresAt) * 60 * 1000),
      action,
    });
    await passwordResetRepo.save(passwordReset);
    return token;
  }

  private buildPasswordReset(
    userId: string,
    token: string,
    action?: PasswordResetAction,
  ): PasswordReset {
    const expiresAt =
      this.configService.get('PASSWORD_RESET_TTL_MINUTES') ||
      this.defaultTTLMinutes;
    return this.passwordResetRepository.create({
      user: { id: userId },
      token,
      expiresAt: new Date(Date.now() + expiresAt * 60 * 1000),
      action,
    });
  }

  async resetPassword(token: string, newPassword: string, email: string) {
    return await this.dataSource.transaction(async (manager: EntityManager) => {
      const user = await manager.findOne(User, { where: { email } });

      if (!user) {
        throw new NotFoundException({
          errorCode: ErrorCodes.USER_NOT_FOUND,
          i18nKey: 'errors.user.notFound',
        });
      }

      const passwordReset = await manager.findOne(PasswordReset, {
        where: { token, user: { id: user.id } },
      });

      if (!passwordReset) {
        // throw new NotFoundException('Password reset token not found');
        throw new BadRequestException({
          errorCode: ErrorCodes.INVALID_TOKEN,
          i18nKey: 'errors.auth.invalidToken',
        });
      }

      if (passwordReset.used) {
        throw new BadRequestException({
          errorCode: ErrorCodes.INVALID_TOKEN_TYPE,
          i18nKey: 'errors.auth.invalidToken',
        });
      }

      if (passwordReset.expiresAt < new Date(Date.now())) {
        throw new BadRequestException({
          errorCode: ErrorCodes.EXPIRED_TOKEN,
          i18nKey: 'errors.auth.expiredToken',
        });
      }

      // Update password
      user.password = await hashPassword(newPassword);
      if (
        passwordReset.action === PasswordResetAction.ACCOUNT_CREATED ||
        passwordReset.action === PasswordResetAction.ACCOUNT_UPDATED
      ) {
        user.verified = true;
      }

      // mark token as used and save everything atomically-best-effort
      passwordReset.used = true;

      await manager.save(User, user);
      await manager.save(PasswordReset, passwordReset);

      await this.mailOutboxService.enqueueTx(
        manager,
        EmailType.PASSWORD_UPDATED,
        { to: user.email, userName: user.fullName },
        undefined,
      );

      return { message: 'Password reset' };
    });
  }

  async getPasswordResetTokenInfo(
    token: string,
  ): Promise<{ email: string } | null> {
    const passwordReset = await this.passwordResetRepository.findOne({
      where: { token, used: false },
      relations: ['user'],
    });
    if (!passwordReset) {
      return null;
    }
    if (passwordReset.expiresAt < new Date(Date.now())) {
      return null;
    }
    return { email: passwordReset.user.email };
  }

  async createSecondFactorRecoveryToken(userId: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.isSecondFactorEnabled) {
      throw new BadRequestException({
        errorCode: ErrorCodes.SECOND_FACTOR_NOT_ENABLED,
        i18nKey: 'errors.auth.secondFactorNotEnabled',
      });
    }

    const existing = await this.secondFactorRecoveryRepository.findOne({
      where: { user: { id: userId }, used: false },
    });

    if (existing && existing.expiresAt > new Date(Date.now())) {
      existing.used = true;
      await this.secondFactorRecoveryRepository.save(existing);
    }

    const token = randomBytes(32).toString('hex');
    const recovery = this.buildSecondFactorRecovery(userId, token);
    await this.secondFactorRecoveryRepository.save(recovery);

    return token;
  }

  async createSecondFactorRecoveryTokenTx(
    manager: EntityManager,
    userId: string,
  ) {
    const user = await manager.findOne(User, { where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (!user.isSecondFactorEnabled) {
      throw new BadRequestException({
        errorCode: ErrorCodes.SECOND_FACTOR_NOT_ENABLED,
        i18nKey: 'errors.auth.secondFactorNotEnabled',
      });
    }
    const repo = manager.getRepository(SecondFactorRecovery);
    const existing = await repo.findOne({
      where: { user: { id: userId }, used: false },
    });
    if (existing && existing.expiresAt > new Date(Date.now())) {
      existing.used = true;
      await repo.save(existing);
    }
    const token = randomBytes(32).toString('hex');
    const expiresAt =
      this.configService.get('SECOND_FACTOR_RECOVERY_TTL_MINUTES') ||
      this.defaultTTLMinutes;
    const recovery = repo.create({
      user: { id: userId } as User,
      token,
      expiresAt: new Date(Date.now() + Number(expiresAt) * 60 * 1000),
    });
    await repo.save(recovery);
    return token;
  }

  private buildSecondFactorRecovery(
    userId: string,
    token: string,
  ): SecondFactorRecovery {
    const expiresAt =
      this.configService.get('SECOND_FACTOR_RECOVERY_TTL_MINUTES') ||
      this.defaultTTLMinutes;
    return this.secondFactorRecoveryRepository.create({
      user: { id: userId } as User,
      token,
      expiresAt: new Date(Date.now() + Number(expiresAt) * 60 * 1000),
    });
  }

  async getSecondFactorRecoveryTokenInfo(
    token: string,
  ): Promise<{ email: string } | null> {
    const record = await this.secondFactorRecoveryRepository.findOne({
      where: { token, used: false },
      relations: ['user'],
    });
    if (!record) return null;
    if (record.expiresAt < new Date(Date.now())) return null;
    return { email: record.user.email };
  }

  async disableSecondFactorWithToken(
    token: string,
    email: string,
    password: string,
  ) {
    const user = await this.findByEmail(email);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Start database transaction
    return await this.dataSource.transaction(async (manager: EntityManager) => {
      const record = await manager.findOne(SecondFactorRecovery, {
        where: { token, user: { id: user.id } },
        lock: { mode: 'pessimistic_write' },
        relations: ['user'],
      });

      if (!record) {
        throw new NotFoundException({
          errorCode: ErrorCodes.INVALID_TOKEN,
          i18nKey: 'errors.auth.invalidToken',
        });
      }

      if (record.used) {
        throw new BadRequestException({
          errorCode: ErrorCodes.TOKEN_ALREADY_USED,
          i18nKey: 'errors.auth.tokenAlreadyUsed',
        });
      }

      if (record.expiresAt < new Date(Date.now())) {
        throw new BadRequestException({
          errorCode: ErrorCodes.EXPIRED_TOKEN,
          i18nKey: 'errors.auth.expiredToken',
        });
      }
      const lockedUser = await manager.findOne(User, {
        where: { id: user.id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!lockedUser) {
        throw new NotFoundException({
          errorCode: ErrorCodes.USER_NOT_FOUND,
          i18nKey: 'errors.user.notFound',
        });
      }

      await this.checkPassword(lockedUser, password);

      // Update both entities within the transaction
      lockedUser.isSecondFactorEnabled = false;
      lockedUser.twoFactorSecret = null;
      record.used = true;

      // Save both entities using the transactional entity manager
      await manager.save(User, lockedUser);
      await manager.save(SecondFactorRecovery, record);

      await this.mailOutboxService.enqueueTx(
        manager,
        EmailType.SECOND_FACTOR_DISABLED,
        { to: user.email, userName: user.fullName },
        undefined,
      );

      return { message: 'Second factor disabled' };
    });
  }

  async enableSecondFactor(userId: string, dto: EnableSecondFactorDto) {
    return this.usersRepository.manager.transaction(async (manager) => {
      const user = await manager.findOne(User, { where: { id: userId } });

      if (!user) {
        throw new NotFoundException({
          errorCode: ErrorCodes.USER_NOT_FOUND,
          i18nKey: 'errors.user.notFound',
        });
      }

      // Validar password
      if (dto.password) {
        await this.checkPassword(user, dto.password);
      }

      if (user.isSecondFactorEnabled) {
        throw new BadRequestException({
          errorCode: ErrorCodes.SECOND_FACTOR_ALREADY_ENABLED,
          i18nKey: 'errors.auth.secondFactorAlreadyEnabled',
        });
      }

      user.isSecondFactorEnabled = true;

      await manager.save(User, user);

      await this.mailOutboxService.enqueueTx(
        manager,
        EmailType.SECOND_FACTOR_ACTIVATED,
        { to: user.email, userName: user.fullName },
        undefined,
      );

      return { message: 'Second factor enabled' };
    });
  }

  async disableSecondFactor(userId: string, dto: DisableSecondFactorDto) {
    return this.usersRepository.manager.transaction(async (manager) => {
      const user = await manager.findOne(User, {
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException({
          errorCode: ErrorCodes.USER_NOT_FOUND,
          i18nKey: 'errors.user.notFound',
        });
      }

      if (!user.isSecondFactorEnabled) {
        throw new BadRequestException({
          errorCode: ErrorCodes.SECOND_FACTOR_NOT_ENABLED,
          i18nKey: 'errors.auth.secondFactorNotEnabled',
        });
      }

      // Validar password
      await this.checkPassword(user, dto.password);

      user.isSecondFactorEnabled = false;
      user.twoFactorSecret = null;

      await manager.save(User, user);
      await this.mailOutboxService.enqueueTx(
        manager,
        EmailType.SECOND_FACTOR_DISABLED,
        { to: user.email, userName: user.fullName },
        undefined,
      );

      return { message: 'Second factor disabled' };
    });
  }

  async checkPassword(user: User, password: string) {
    const isValid = await verifyPasswordUtil(user.password, password);
    if (!isValid) {
      throw new BadRequestException({
        errorCode: ErrorCodes.INVALID_CREDENTIALS,
        i18nKey: 'errors.auth.invalidCredentials',
      });
    }
    return true;
  }

  async updateTwoFactorSecret(userId: string, secret: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.twoFactorSecret = secret;

    await this.usersRepository.save(user);
  }

  async updateLanguage(userId: string, lang: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.lang = lang;

    await this.usersRepository.save(user);

    return { lang };
  }

  /**************************************************************************
   * Users admin management
   * ***********************************************************************/

  async createAdminUser(userId: string, dto: CreateAdminUserDto) {
    return this.usersRepository.manager.transaction(async (manager) => {
      // get user by email
      const existingUser = await manager.findOne(User, {
        where: { email: dto.email },
      });

      // Check if user with email already exists
      if (existingUser) {
        throw new BadRequestException({
          errorCode: ErrorCodes.EMAIL_ALREADY_EXISTS,
          i18nKey: 'errors.user.emailAlreadyInUse',
        });
      }

      // Generate random password
      const generatedPassword = randomBytes(12)
        .toString('base64')
        .replace(/[^a-zA-Z0-9]/g, '')
        .slice(0, 12);

      // Generate full name
      const fullName = `${dto.firstName}${dto.lastName ? ` ${dto.lastName}` : ''}`;

      // Get roles
      const roleEntities = await manager.find(Role, {
        where: { name: In(dto.roles) },
      });

      // Create user
      const adminUser = manager.create(User, {
        email: dto.email,
        password: await hashPassword(generatedPassword),
        firstName: dto.firstName,
        lastName: dto.lastName,
        fullName,
        phone: dto.phone,
        roles: roleEntities,
        lang: dto.lang ?? 'pt',
      });

      // Save user
      const savedUser = await manager.save(User, adminUser);

      // Append security log
      await this.appendSecurityLogTx(
        manager,
        savedUser.id,
        userId,
        UserSecurityActionType.ADMIN_USER_CREATED,
      );

      // get admin base url
      const baseUrl = this.configService.get<string>('APP_WEB_ADMIN_URL');

      // Create password reset token
      const token = await this.createPasswordResetTokenTx(
        manager,
        savedUser.id,
        PasswordResetAction.ACCOUNT_CREATED,
      );

      // ⚠️ Importante: efectos externos fuera del bloque
      setImmediate(() => {
        void this.mailOutboxService.enqueueTx(
          manager,
          EmailType.NEW_ADMIN_ACCOUNT,
          {
            to: savedUser.email,
            userName: savedUser.fullName,
            code: token,
            baseUrl,
          },
        );
      });

      // Return user data
      return new UsersResponseVm(savedUser);
    });
  }

  async updateAdminUser(
    targetUserId: string,
    currentUserId: string,
    dto: UpdateAdminUserDto,
  ) {
    return this.usersRepository.manager.transaction(async (manager) => {
      let shouldSendEmail = false;
      // Get target user with pessimistic lock
      const targetUser = await manager.findOne(User, {
        where: { id: targetUserId },
        relations: ['roles'],
      });

      if (!targetUser) {
        throw new NotFoundException({
          errorCode: ErrorCodes.USER_NOT_FOUND,
          i18nKey: 'errors.user.notFound',
        });
      }

      // Validate email modification rule
      if (dto.email && dto.email !== targetUser.email) {
        if (targetUser.verified) {
          throw new BadRequestException({
            errorCode: ErrorCodes.USER_INVALID_STATUS,
            i18nKey: 'errors.user.invalidStatus',
          });
        }

        // Check if new email already exists
        const existingUser = await manager.findOne(User, {
          where: { email: dto.email },
        });

        if (existingUser) {
          throw new BadRequestException({
            errorCode: ErrorCodes.EMAIL_ALREADY_EXISTS,
            i18nKey: 'errors.user.emailAlreadyInUse',
          });
        }
        shouldSendEmail = true;
      }

      // Update user fields
      const updateData: Partial<User> = {};

      if (dto.firstName !== undefined) {
        updateData.firstName = dto.firstName;
      }

      if (dto.lastName !== undefined) {
        updateData.lastName = dto.lastName;
      }

      if (dto.email !== undefined) {
        updateData.email = dto.email;
      }

      if (dto.phone !== undefined) {
        updateData.phone = dto.phone;
      }

      // Update fullName if firstName or lastName changed
      if (dto.firstName !== undefined || dto.lastName !== undefined) {
        const firstName = dto.firstName ?? targetUser.firstName;
        const lastName = dto.lastName ?? targetUser.lastName;
        updateData.fullName = `${firstName}${lastName ? ` ${lastName}` : ''}`;
      }

      // Update roles if provided
      if (dto.roles) {
        const roleEntities = await manager.find(Role, {
          where: { name: In(dto.roles) },
        });
        targetUser.roles = roleEntities;
      }

      // Apply updates
      Object.assign(targetUser, updateData);

      // Save user
      const savedUser = await manager.save(User, targetUser);

      // Append security log
      await this.appendSecurityLogTx(
        manager,
        targetUserId,
        currentUserId,
        UserSecurityActionType.ADMIN_USER_UPDATED,
      );

      if (shouldSendEmail) {
        // get admin base url
        const baseUrl = this.configService.get<string>('APP_WEB_ADMIN_URL');

        // Create password reset token
        const token = await this.createPasswordResetTokenTx(
          manager,
          savedUser.id,
          PasswordResetAction.ACCOUNT_UPDATED,
        );

        // ⚠️ Importante: efectos externos fuera del bloque
        setImmediate(() => {
          void this.mailOutboxService.enqueueTx(
            manager,
            EmailType.NEW_ADMIN_ACCOUNT,
            {
              to: savedUser.email,
              userName: savedUser.fullName,
              code: token,
              baseUrl,
            },
          );
        });
      }

      // Return updated user data
      return new UsersResponseVm(savedUser);
    });
  }

  async activateAdminUser(
    targetUserId: string,
    currentUserId: string,
    dto: ActivateDeactivateAdminUserDto,
  ) {
    // Get target user with admin roles using helper function
    const targetUser = await this.findAdminUserById(targetUserId);

    if (!targetUser) {
      throw new NotFoundException({
        errorCode: ErrorCodes.USER_NOT_FOUND,
        i18nKey: 'errors.user.notFound',
      });
    }

    if (!targetUser.isBlocked) {
      throw new BadRequestException({
        errorCode: ErrorCodes.USER_INVALID_STATUS,
        i18nKey: 'errors.user.invalidStatus',
      });
    }

    // Rule: User must have verified their account via email link
    if (!targetUser.verified) {
      throw new BadRequestException({
        errorCode: ErrorCodes.USER_NOT_VERIFIED,
        i18nKey: 'errors.user.notVerified',
      });
    }

    await this.unlockAccount(
      targetUserId,
      currentUserId,
      dto.reason,
      UserSecurityActionType.ADMIN_USER_ACTIVATED,
    );

    return { message: 'User activated successfully' };
  }

  async deactivateAdminUser(
    targetUserId: string,
    currentUserId: string,
    dto: ActivateDeactivateAdminUserDto,
  ) {
    // Get target user with admin roles using helper function
    const targetUser = await this.findAdminUserById(targetUserId);

    if (!targetUser) {
      throw new NotFoundException({
        errorCode: ErrorCodes.USER_NOT_FOUND,
        i18nKey: 'errors.user.notFound',
      });
    }

    if (targetUser.isBlocked) {
      throw new BadRequestException({
        errorCode: ErrorCodes.USER_INVALID_STATUS,
        i18nKey: 'errors.user.invalidStatus',
      });
    }

    // Rule: Prevent deactivation if user has second factor enabled
    if (targetUser.isSecondFactorEnabled) {
      throw new BadRequestException({
        errorCode: ErrorCodes.CANNOT_DEACTIVATE_WITH_2FA_ENABLED,
        i18nKey: 'errors.user.cannotDeactivateWith2FAEnabled',
      });
    }

    // Deactivate user
    await this.lockAccount(
      targetUserId,
      currentUserId,
      dto.reason,
      UserSecurityActionType.ADMIN_USER_DEACTIVATED,
    );

    return { message: 'User deactivated successfully' };
  }

  async resendVerificationEmail(targetUserId: string, currentUserId: string) {
    return this.usersRepository.manager.transaction(async (manager) => {
      // Get target user
      const targetUser = await this.findAdminUserById(targetUserId);

      if (!targetUser) {
        throw new NotFoundException({
          errorCode: ErrorCodes.USER_NOT_FOUND,
          i18nKey: 'errors.user.notFound',
        });
      }

      // Check if user is already verified
      if (targetUser.verified) {
        throw new BadRequestException({
          errorCode: ErrorCodes.USER_INVALID_STATUS,
          i18nKey: 'errors.user.invalidStatus',
        });
      }

      // Append security log
      await this.appendSecurityLogTx(
        manager,
        targetUserId,
        currentUserId,
        UserSecurityActionType.VERIFICATION_EMAIL_RESENT,
      );
      // get admin base url
      const baseUrl = this.configService.get<string>('APP_WEB_ADMIN_URL');
      if (!baseUrl) {
        throw new BadRequestException({
          errorCode: ErrorCodes.INTERNAL_ERROR,
          i18nKey: 'errors.server.internalError',
        });
      }

      // Create password reset token
      const token = await this.createPasswordResetTokenTx(
        manager,
        targetUser.id,
        PasswordResetAction.ACCOUNT_UPDATED,
      );

      // ⚠️ Importante: efectos externos fuera del bloque
      setImmediate(() => {
        void this.mailOutboxService.enqueueTx(
          manager,
          EmailType.NEW_ADMIN_ACCOUNT,
          {
            to: targetUser.email,
            userName: targetUser.fullName,
            code: token,
            baseUrl,
          },
        );
      });

      return { message: 'Verification email sent successfully' };
    });
  }

  /**************************************************************************
   * Clients admin management
   * ***********************************************************************/

  async countClientsByRole(): Promise<
    Array<{ role: RoleEnum; quantity: number }>
  > {
    return this.usersRepository.manager.transaction(async (manager) => {
      const roleNames: RoleEnum[] = [RoleEnum.USER, RoleEnum.MERCHANT];

      const rows = await manager
        .createQueryBuilder(User, 'u')
        .innerJoin('u.roles', 'r')
        .where('r.name IN (:...roleNames)', { roleNames })
        .select('r.name', 'role')
        .addSelect('COUNT(DISTINCT u.id)', 'quantity')
        .groupBy('r.name')
        .getRawMany<{ role: RoleEnum; quantity: string }>();

      const counts = new Map<RoleEnum, number>(roleNames.map((n) => [n, 0]));
      for (const row of rows) {
        counts.set(row.role, Number(row.quantity) || 0);
      }

      return roleNames.map((role) => ({
        role,
        quantity: counts.get(role) ?? 0,
      }));
    });
  }

  async getHdWalletMnemonic(
    userId: string,
    password: string,
  ): Promise<{ mnemonic: string }> {
    const user = await this.findById(userId);

    if (!user) {
      throw new NotFoundException({
        errorCode: ErrorCodes.USER_NOT_FOUND,
        i18nKey: 'errors.user.notFound',
      });
    }

    // Validar contraseña
    await this.checkPassword(user, password);

    // Obtener mnemonic de variable de entorno
    try {
      const mnemonic = this.configService.getOrThrow<string>('BNB_MNEMONIC');
      return {
        mnemonic,
      };
    } catch {
      throw new InternalServerErrorException({
        errorCode: ErrorCodes.ENVIRONMENT_VARIABLE_ERROR,
        i18nKey: 'errors.server.environmentVariableError',
      });
    }
  }
}
