import { Injectable } from '@nestjs/common';
import { VerificationCodeEmailBuilder } from './verification-code-email.builder';
import { PasswordResetEmailBuilder } from './password-reset-email.builder';
import { SecondFactorRecoveryEmailBuilder } from './second-factor-recovery-email.builder';
import {
  IEmailBuilderFactory,
  EmailType,
} from './email-builder-factory.interface';
import { EmailBuilder } from './email-builder.interface';
import { AccountCreatedEmailBuilder } from './account-created-email.builder';
import { AccountValidatedEmailBuilder } from './account-validated-email.builder';
import { AccountLimitsUpdatedEmailBuilder } from './account-limits-updated-email.builder';
import { AccountValidationRejectedEmailBuilder } from './account-validation-rejected-email.builder';
import { PasswordUpdatedEmailBuilder } from './password-updated-email.builder';
import { SecondFactorActivatedEmailBuilder } from './second-factor-activated-email.builder';
import { SecondFactorDisabledEmailBuilder } from './second-factor-disabled-email.builder';
import { NewAdminAccountEmailBuilder } from './new-admin-account-email.builder';

@Injectable()
export class EmailBuilderFactory implements IEmailBuilderFactory {
  constructor(
    private readonly verificationCodeBuilder: VerificationCodeEmailBuilder,
    private readonly passwordResetBuilder: PasswordResetEmailBuilder,
    private readonly secondFactorRecoveryBuilder: SecondFactorRecoveryEmailBuilder,
    private readonly accountCreatedBuilder: AccountCreatedEmailBuilder,
    private readonly accountValidatedBuilder: AccountValidatedEmailBuilder,
    private readonly accountLimitsUpdatedBuilder: AccountLimitsUpdatedEmailBuilder,
    private readonly accountValidationRejectedBuilder: AccountValidationRejectedEmailBuilder,
    private readonly passwordUpdatedBuilder: PasswordUpdatedEmailBuilder,
    private readonly secondFactorActivatedBuilder: SecondFactorActivatedEmailBuilder,
    private readonly secondFactorDisabledBuilder: SecondFactorDisabledEmailBuilder,
    private readonly newAdminAccountBuilder: NewAdminAccountEmailBuilder,
  ) {}

  getBuilder(emailType: EmailType): EmailBuilder {
    switch (emailType) {
      case EmailType.VERIFICATION_CODE:
        return this.verificationCodeBuilder;
      case EmailType.PASSWORD_RESET:
        return this.passwordResetBuilder;
      case EmailType.SECOND_FACTOR_RECOVERY:
        return this.secondFactorRecoveryBuilder;
      case EmailType.ACCOUNT_CREATED:
        return this.accountCreatedBuilder;
      case EmailType.ACCOUNT_VALIDATED:
        return this.accountValidatedBuilder;
      case EmailType.ACCOUNT_LIMITS_UPDATED:
        return this.accountLimitsUpdatedBuilder;
      case EmailType.ACCOUNT_VALIDATION_REJECTED:
        return this.accountValidationRejectedBuilder;
      case EmailType.PASSWORD_UPDATED:
        return this.passwordUpdatedBuilder;
      case EmailType.SECOND_FACTOR_ACTIVATED:
        return this.secondFactorActivatedBuilder;
      case EmailType.SECOND_FACTOR_DISABLED:
        return this.secondFactorDisabledBuilder;
      case EmailType.NEW_ADMIN_ACCOUNT:
        return this.newAdminAccountBuilder;
      case EmailType.KYC_REJECTED:
        return this.accountValidationRejectedBuilder;
      default:
        throw new Error(`Unsupported email type: ${String(emailType)}`);
    }
  }
}
