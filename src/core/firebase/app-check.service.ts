import { Injectable, Logger } from '@nestjs/common';
import { FirebaseService } from './firebase.service';
import { ErrorCodes } from '@/common/utils/code.utils';

export interface AppCheckVerificationResult {
  valid: boolean;
  appId?: string;
  errorCode?: string;
}

@Injectable()
export class AppCheckService {
  private readonly logger = new Logger(AppCheckService.name);

  constructor(private readonly firebaseService: FirebaseService) {}

  async verifyToken(token: string): Promise<AppCheckVerificationResult> {
    try {
      const appCheck = this.firebaseService.getAppCheck();
      const appCheckClaims = await appCheck.verifyToken(token);

      this.logger.log(
        `App Check token verified successfully for app: ${appCheckClaims.appId}`,
      );

      return {
        valid: true,
        appId: appCheckClaims.appId,
      };
    } catch (error) {
      this.logger.warn('Failed to verify App Check token', error);

      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      // Categorize errors
      if (errorMessage.includes('expired')) {
        return {
          valid: false,
          errorCode: ErrorCodes.FIREBASE_APP_CHECK_TOKEN_EXPIRED,
        };
      } else if (errorMessage.includes('invalid')) {
        return {
          valid: false,
          errorCode: ErrorCodes.FIREBASE_APP_CHECK_TOKEN_INVALID,
        };
      }

      return {
        valid: false,
        errorCode: ErrorCodes.FIREBASE_APP_CHECK_VERIFICATION_FAILED,
      };
    }
  }
}
