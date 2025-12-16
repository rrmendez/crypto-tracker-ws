import { Inject, Injectable } from '@nestjs/common';
import { EMAIL_PROVIDER, EmailProvider } from './email.provider';
import {
  EMAIL_BUILDER_FACTORY,
  EmailType,
  IEmailBuilderFactory,
} from '@/core/mail/builders';
import { VerificationCodeEmailConfig } from '@/core/mail/builders';
import { PasswordResetEmailConfig } from '@/core/mail/builders';
import { SecondFactorRecoveryEmailConfig } from '@/core/mail/builders';

// Legacy type for backward compatibility
export type VerificationEmailConfig = VerificationCodeEmailConfig;

@Injectable()
export class MailService {
  constructor(
    @Inject(EMAIL_PROVIDER) private readonly provider: EmailProvider,
    @Inject(EMAIL_BUILDER_FACTORY)
    private readonly emailBuilderFactory: IEmailBuilderFactory,
  ) {}

  async sendMail(options: {
    to: string;
    subject: string;
    text: string;
    html?: string;
  }) {
    await this.provider.sendEmail(
      options.to,
      options.subject,
      options.text,
      options.html || options.text,
    );
  }

  async sendVerificationCode(config: VerificationCodeEmailConfig) {
    const builder = this.emailBuilderFactory.getBuilder(
      EmailType.VERIFICATION_CODE,
    );
    const emailContent = builder.build(config);

    return this.sendMail({
      to: emailContent.to,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html,
    });
  }

  async sendPasswordReset(config: PasswordResetEmailConfig) {
    const builder = this.emailBuilderFactory.getBuilder(
      EmailType.PASSWORD_RESET,
    );
    const emailContent = builder.build(config);

    return this.sendMail({
      to: emailContent.to,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html,
    });
  }

  async sendSecondFactorRecovery(config: SecondFactorRecoveryEmailConfig) {
    const builder = this.emailBuilderFactory.getBuilder(
      EmailType.SECOND_FACTOR_RECOVERY,
    );
    const emailContent = builder.build(config);

    return this.sendMail({
      to: emailContent.to,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html,
    });
  }
}
