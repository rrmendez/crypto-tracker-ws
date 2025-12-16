import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseEmailBuilder, EmailContent } from './email-builder.interface';
import { BaseEmailConfig } from './email-builder.interface';
import { TemplateRendererService } from '../services/template-renderer.service';
import { I18nContext, I18nService } from 'nestjs-i18n';

export interface NewAdminAccountEmailConfig extends BaseEmailConfig {
  baseUrl: string;
  userName: string;
}

@Injectable()
export class NewAdminAccountEmailBuilder extends BaseEmailBuilder<NewAdminAccountEmailConfig> {
  constructor(
    private readonly configService: ConfigService,
    protected readonly renderer: TemplateRendererService,
    private readonly i18n: I18nService,
  ) {
    super(renderer);
  }

  build(config: NewAdminAccountEmailConfig): EmailContent {
    const lang = I18nContext.current()?.lang || 'pt';
    const appName: string = this.configService.get('APP_NAME') || 'Site';
    const userName = config.userName;
    const minutes: number =
      this.configService.get('PASSWORD_RESET_TTL_MINUTES') || 20;
    const baseUrl = `${config.baseUrl}/activate-account?token=${encodeURIComponent(config.code)}`;
    const subject = this.i18n.t('emails.new_admin_account.subject', {
      lang,
      args: {
        appName,
      },
    });

    // Render contenido específico
    const contentHtml = this.render(
      'new_admin_account',
      { baseUrl, appName, userName, minutes },
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

    const text = `Click the link to activate your account: ${baseUrl}`;

    this.reset()
      .setRecipient(config.to)
      .setSubject(subject)
      .setText(text)
      .setHtml(html);

    return this.emailContent as EmailContent;
  }
}
