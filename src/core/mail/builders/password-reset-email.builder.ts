import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseEmailBuilder, EmailContent } from './email-builder.interface';
import { BaseEmailConfig } from './email-builder.interface';
import { TemplateRendererService } from '../services/template-renderer.service';
import { I18nContext, I18nService } from 'nestjs-i18n';

export interface PasswordResetEmailConfig extends BaseEmailConfig {
  baseUrl: string;
  userName: string;
}

@Injectable()
export class PasswordResetEmailBuilder extends BaseEmailBuilder<PasswordResetEmailConfig> {
  constructor(
    private readonly configService: ConfigService,
    protected readonly renderer: TemplateRendererService,
    private readonly i18n: I18nService,
  ) {
    super(renderer);
  }

  build(config: PasswordResetEmailConfig): EmailContent {
    const lang = I18nContext.current()?.lang || 'pt';
    const appName: string = this.configService.get('APP_NAME') || 'Site';
    const userName = config.userName;
    const minutes: number =
      this.configService.get('PASSWORD_RESET_TTL_MINUTES') || 20;
    const resetUrl = `${config.baseUrl}/reset-password?token=${encodeURIComponent(config.code)}`;
    const subject = this.i18n.t('emails.password-reset.subject', {
      lang,
      args: {
        appName,
      },
    });

    // Render contenido específico
    const contentHtml = this.render(
      'password-reset',
      { resetUrl, appName, userName, minutes },
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

    const text = `Click the link to reset your password: ${resetUrl}`;

    this.reset()
      .setRecipient(config.to)
      .setSubject(subject)
      .setText(text)
      .setHtml(html);

    return this.emailContent as EmailContent;
  }
}
