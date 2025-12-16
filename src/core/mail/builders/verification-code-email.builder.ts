import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseEmailBuilder, EmailContent } from './email-builder.interface';
import { BaseEmailConfig } from './email-builder.interface';
import { TemplateRendererService } from '../services/template-renderer.service';
import { I18nContext, I18nService } from 'nestjs-i18n';

export interface VerificationCodeEmailConfig extends BaseEmailConfig {
  ttlMinutes: number;
  appName?: string;
}

@Injectable()
export class VerificationCodeEmailBuilder extends BaseEmailBuilder<VerificationCodeEmailConfig> {
  constructor(
    private readonly configService: ConfigService,
    protected readonly renderer: TemplateRendererService,
    private readonly i18n: I18nService,
  ) {
    super(renderer);
  }

  build(config: VerificationCodeEmailConfig): EmailContent {
    const lang = I18nContext.current()?.lang || 'pt';
    const appName: string =
      config.appName ?? this.configService.get<string>('APP_NAME') ?? 'Site';
    const { ttlMinutes, code } = config;
    const subject = this.i18n.t('emails.verification-code-email.subject', {
      lang,
      args: {
        appName,
      },
    });

    const text = `Your verification code is: ${code}. It expires in ${ttlMinutes} minutes.`;

    // Render contenido específico
    const contentHtml = this.render(
      'verification-code-email',
      { appName, ttlMinutes, email: config.to, code },
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
