import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@/common/exceptions';
import { ErrorCodes } from '@/common/utils/code.utils';
import { UsersService } from '@/modules/users/users.service';
import {
  ADMIN_ROLES,
  USER_ROLES,
} from '@/modules/users/constants/role.constants';
import { User } from '@/modules/users/entities/user.entity';
import { RoleEnum } from '@/common/enums/role.enum';
import { Request } from 'express';

@Injectable()
export class OriginAudienceGuard implements CanActivate {
  private logger = new Logger('OriginAudienceGuard');

  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const origin = (request.headers['origin'] as string) || '';
    const xClientType = (request.headers['x-client-type'] as string) || '';
    const body = (request.body ?? {}) as { email?: string };
    const email: string = body.email ?? '';

    this.logger.log('Authentication request origin: ', origin);
    this.logger.log('Authentication request xClientType: ', xClientType);
    this.logger.log('Authentication request email: ', email);

    if (!email) {
      throw new UnauthorizedException({
        errorCode: ErrorCodes.INVALID_CREDENTIALS,
        i18nKey: 'errors.auth.invalidCredentials',
      });
    }

    // 1. Resolver la audiencia desde los headers
    const intendedAudience = this.resolveIntendedAudience(origin, xClientType);

    // 2. Cargar el usuario por email
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException({
        errorCode: ErrorCodes.INVALID_CREDENTIALS,
        i18nKey: 'errors.auth.invalidCredentials',
      });
    }

    // 3. Validar que los roles del usuario coincidan con la audiencia
    this.validateUserRolesForAudience(user, intendedAudience);

    // 4. Guardar en el request para usar en el controller/service
    request.intendedAudience = intendedAudience;
    request.signInUser = user;

    return true;
  }

  private resolveIntendedAudience(
    origin?: string,
    xClientType?: string,
  ): 'ADMIN' | 'CLIENT' {
    const adminUrl = this.normalizeUrl(
      this.configService.get<string>('APP_WEB_ADMIN_URL') || '',
    );
    const clientUrl = this.normalizeUrl(
      this.configService.get<string>('APP_WEB_URL') || '',
    );

    const normalizedOrigin = this.normalizeUrl(origin || '');

    // 1) Fallback to X-Client-Type
    const t = (xClientType || '').toUpperCase();
    if (t === 'ADMIN' || t === 'CLIENT') {
      return t;
    }

    // 2) Origin precedence
    if (normalizedOrigin) {
      if (adminUrl && normalizedOrigin === adminUrl) {
        return 'ADMIN';
      }
      if (clientUrl && normalizedOrigin === clientUrl) {
        return 'CLIENT';
      }
      throw new UnauthorizedException({
        errorCode: ErrorCodes.INVALID_CREDENTIALS,
        i18nKey: 'errors.auth.invalidCredentials',
      });
    }

    // 3) Missing headers -> reject
    throw new UnauthorizedException({
      errorCode: ErrorCodes.INVALID_CREDENTIALS,
      i18nKey: 'errors.auth.invalidCredentials',
    });
  }

  private validateUserRolesForAudience(
    user: User,
    intendedAudience: 'ADMIN' | 'CLIENT',
  ): void {
    const hasAdminRole = user.roles.some((r) =>
      ADMIN_ROLES.includes(r.name as RoleEnum),
    );

    const hasClientRole = user.roles.some((r) =>
      USER_ROLES.includes(r.name as RoleEnum.USER | RoleEnum.MERCHANT),
    );

    if (intendedAudience === 'ADMIN' && !hasAdminRole) {
      throw new UnauthorizedException({
        errorCode: ErrorCodes.INVALID_CREDENTIALS,
        i18nKey: 'errors.auth.invalidCredentials',
      });
    }

    if (intendedAudience === 'CLIENT' && !hasClientRole) {
      throw new UnauthorizedException({
        errorCode: ErrorCodes.INVALID_CREDENTIALS,
        i18nKey: 'errors.auth.invalidCredentials',
      });
    }
  }

  private normalizeUrl(url?: string): string {
    if (!url) return '';
    try {
      const u = new URL(url);
      return `${u.protocol}//${u.host}`.replace(/\/$/, '').toLowerCase();
    } catch {
      return '';
    }
  }
}

// Request extendido con datos de autenticación derivados por el guard
export interface AuthenticatedRequest extends Request {
  intendedAudience?: 'ADMIN' | 'CLIENT';
  signInUser?: User;
}
