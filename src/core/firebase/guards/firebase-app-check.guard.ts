import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
  Optional,
} from '@nestjs/common';
import { UnauthorizedException } from '@/common/exceptions';
import { Request } from 'express';
import { AppCheckService } from '../app-check.service';
import { ErrorCodes } from '@/common/utils/code.utils';
import { FIREBASE_OPTIONS, FirebaseOptions } from '../firebase.module';

/**
 * FirebaseAppCheckGuard validates Firebase App Check tokens on protected routes.
 * It uses configuration injected via FIREBASE_OPTIONS to determine if App Check
 * is enabled and to validate the app ID.
 */
@Injectable()
export class FirebaseAppCheckGuard implements CanActivate {
  private readonly logger = new Logger(FirebaseAppCheckGuard.name);

  constructor(
    private readonly appCheckService: AppCheckService,
    @Inject(FIREBASE_OPTIONS)
    private readonly options: FirebaseOptions,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // If App Check is disabled, allow the request (fallback)
    const appCheckEnabled = this.options.appCheckEnabled ?? false;

    if (!appCheckEnabled) {
      this.logger.debug('Firebase App Check is disabled, skipping validation');
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();

    // Extract token from header (standard Firebase header)
    const appCheckToken = request.headers['x-firebase-appcheck'] as string;

    if (!appCheckToken) {
      this.logger.warn('Missing X-Firebase-AppCheck header');
      throw new UnauthorizedException({
        errorCode: ErrorCodes.FIREBASE_APP_CHECK_TOKEN_MISSING,
        i18nKey: 'errors.firebase.app_check.tokenMissing',
      });
    }

    // Verify the token
    const result = await this.appCheckService.verifyToken(appCheckToken);

    if (!result.valid) {
      this.logger.warn(`App Check verification failed: ${result.errorCode}`);

      // Map error to specific exception
      if (result.errorCode === ErrorCodes.FIREBASE_APP_CHECK_TOKEN_EXPIRED) {
        throw new UnauthorizedException({
          errorCode: ErrorCodes.FIREBASE_APP_CHECK_TOKEN_EXPIRED,
          i18nKey: 'errors.firebase.app_check.tokenExpired',
        });
      } else if (
        result.errorCode === ErrorCodes.FIREBASE_APP_CHECK_TOKEN_INVALID
      ) {
        throw new UnauthorizedException({
          errorCode: ErrorCodes.FIREBASE_APP_CHECK_TOKEN_INVALID,
          i18nKey: 'errors.firebase.app_check.tokenInvalid',
        });
      }

      throw new UnauthorizedException({
        errorCode: ErrorCodes.FIREBASE_APP_CHECK_VERIFICATION_FAILED,
        i18nKey: 'errors.firebase.app_check.verificationFailed',
      });
    }

    // Optional: Validate that the appId matches expected value
    const expectedAppId = this.options.appId;
    if (expectedAppId && result.appId !== expectedAppId) {
      this.logger.warn(
        `App ID mismatch. Expected: ${expectedAppId}, Got: ${result.appId}`,
      );
      throw new UnauthorizedException({
        errorCode: ErrorCodes.FIREBASE_APP_CHECK_APP_ID_MISMATCH,
        i18nKey: 'errors.firebase.app_check.appIdMismatch',
      });
    }

    this.logger.debug(`App Check verified for app: ${result.appId}`);
    return true;
  }
}
