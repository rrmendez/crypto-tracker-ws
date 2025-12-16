import { Provider } from '@nestjs/common';
import {
  AccountCreatedEmailBuilder,
  AccountValidatedEmailBuilder,
  AccountLimitsUpdatedEmailBuilder,
  AccountValidationRejectedEmailBuilder,
  EmailBuilderFactory,
  NewAdminAccountEmailBuilder,
  PasswordUpdatedEmailBuilder,
  SecondFactorActivatedEmailBuilder,
  SecondFactorDisabledEmailBuilder,
} from '@/core/mail/builders';
import { VerificationCodeEmailBuilder } from '@/core/mail/builders';
import { PasswordResetEmailBuilder } from '@/core/mail/builders';
import { SecondFactorRecoveryEmailBuilder } from '@/core/mail/builders';
import { EMAIL_BUILDER_FACTORY } from '@/core/mail/builders';

export const emailBuilderProviders: Provider[] = [
  // Concrete builders
  VerificationCodeEmailBuilder,
  PasswordResetEmailBuilder,
  SecondFactorRecoveryEmailBuilder,
  AccountCreatedEmailBuilder,
  AccountValidatedEmailBuilder,
  AccountLimitsUpdatedEmailBuilder,
  AccountValidationRejectedEmailBuilder,
  PasswordUpdatedEmailBuilder,
  SecondFactorActivatedEmailBuilder,
  SecondFactorDisabledEmailBuilder,
  NewAdminAccountEmailBuilder,

  // Factory implementation
  EmailBuilderFactory,

  // Factory interface binding for DI
  {
    provide: EMAIL_BUILDER_FACTORY,
    useExisting: EmailBuilderFactory,
  },
];
