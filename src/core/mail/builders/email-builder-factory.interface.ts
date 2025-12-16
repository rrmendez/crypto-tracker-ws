import { EmailBuilder } from './email-builder.interface';

export enum EmailType {
  VERIFICATION_CODE = 'verification_code',
  PASSWORD_RESET = 'password_reset',
  SECOND_FACTOR_RECOVERY = 'second_factor_recovery',
  ACCOUNT_CREATED = 'account_created',
  ACCOUNT_VALIDATED = 'account_validated',
  ACCOUNT_LIMITS_UPDATED = 'account_limits_updated',
  ACCOUNT_VALIDATION_REJECTED = 'account_validation_rejected',
  PASSWORD_UPDATED = 'password_updated',
  SECOND_FACTOR_ACTIVATED = 'second_factor_activated',
  SECOND_FACTOR_DISABLED = 'second_factor_disabled',
  NEW_ADMIN_ACCOUNT = 'new_admin_account',
  KYC_REJECTED = 'kyc_rejected',
}

/**
 * Interface for the Email Builder Factory
 * Provides factory methods to create specific email builders
 */
export interface IEmailBuilderFactory {
  /**
   * Generic method to get a builder by type
   * @param emailType The type of email builder to create
   * @returns The appropriate email builder
   */
  getBuilder(emailType: EmailType): EmailBuilder;
}

/**
 * Token for dependency injection of the email builder factory
 */
export const EMAIL_BUILDER_FACTORY = Symbol('EMAIL_BUILDER_FACTORY');
