import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseEmailBuilder, EmailContent } from './email-builder.interface';
import { BaseEmailConfig } from './email-builder.interface';
import { TemplateRendererService } from '../services/template-renderer.service';
import { I18nContext, I18nService } from 'nestjs-i18n';

export interface AccountValidationRejectedEmailConfig extends BaseEmailConfig {
  userName: string;
  reason: string;
}

@Injectable()
export class AccountValidationRejectedEmailBuilder extends BaseEmailBuilder<AccountValidationRejectedEmailConfig> {
  constructor(
    private readonly configService: ConfigService,
    protected readonly renderer: TemplateRendererService,
    private readonly i18n: I18nService,
  ) {
    super(renderer);
  }

  build(config: AccountValidationRejectedEmailConfig): EmailContent {
    const lang = I18nContext.current()?.lang || 'pt';

    const appName: string = this.configService.get('APP_NAME') || 'Site';

    const userName = config.userName;

    const reason = config.reason;

    const subject = this.i18n.t('emails.account-validation-rejected.subject', {
      lang,
      args: {
        appName,
      },
    });

    // Render contenido específico
    const contentHtml = this.render(
      'account-validation-rejected',
      { appName, userName, reason },
      lang,
    );

    // Render layout envolviendo el contenido
    const html = this.render(
      'layout',
      {
        subject,
        appName,
        year: new Date().getFullYear(),
        content: contentHtml,
      },
      lang,
    );

    const text = `We’re sorry to inform you that your identity verification process (KYC) on ${appName} was not approved.`;

    this.reset()
      .setRecipient(config.to)
      .setSubject(subject)
      .setText(text)
      .setHtml(html);

    return this.emailContent as EmailContent;
  }
}
