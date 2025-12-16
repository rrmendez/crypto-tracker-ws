import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseEmailBuilder, EmailContent } from './email-builder.interface';
import { BaseEmailConfig } from './email-builder.interface';
import { TemplateRendererService } from '../services/template-renderer.service';
import { I18nContext, I18nService } from 'nestjs-i18n';

export interface SecondFactorRecoveryEmailConfig extends BaseEmailConfig {
  baseUrl: string;
  userName: string;
  language?: string;
}

@Injectable()
export class SecondFactorRecoveryEmailBuilder extends BaseEmailBuilder<SecondFactorRecoveryEmailConfig> {
  constructor(
    private readonly configService: ConfigService,
    protected readonly renderer: TemplateRendererService,
    private readonly i18n: I18nService,
  ) {
    super(renderer);
  }

  build(config: SecondFactorRecoveryEmailConfig): EmailContent {
    const lang = config.language || I18nContext.current()?.lang || 'pt';
    const appName: string = this.configService.get('APP_NAME') || 'Site';
    const recoverUrl = `${config.baseUrl}/recover-second-factor?token=${encodeURIComponent(config.code)}`;
    const subject = this.i18n.t('emails.second-factor-recovery.subject', {
      lang,
      args: {
        appName,
      },
    });

    const text = `Click the link to disable your second factor authentication: ${recoverUrl}`;

    // Render contenido específico
    const contentHtml = this.render(
      'second-factor-recovery',
      { appName, userName: config.userName, recoverUrl },
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

    this.reset()
      .setRecipient(config.to)
      .setSubject(subject)
      .setText(text)
      .setHtml(html);

    return this.emailContent as EmailContent;
  }
}
