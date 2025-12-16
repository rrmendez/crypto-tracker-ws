import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseEmailBuilder, EmailContent } from './email-builder.interface';
import { BaseEmailConfig } from './email-builder.interface';
import { TemplateRendererService } from '../services/template-renderer.service';
import { I18nContext, I18nService } from 'nestjs-i18n';

export interface SecondFactorActivatedEmailConfig extends BaseEmailConfig {
  userName: string;
}

@Injectable()
export class SecondFactorActivatedEmailBuilder extends BaseEmailBuilder<SecondFactorActivatedEmailConfig> {
  constructor(
    private readonly configService: ConfigService,
    protected readonly renderer: TemplateRendererService,
    private readonly i18n: I18nService,
  ) {
    super(renderer);
  }

  build(config: SecondFactorActivatedEmailConfig): EmailContent {
    const lang = I18nContext.current()?.lang || 'pt';

    const appName: string = this.configService.get('APP_NAME') || 'Site';

    const userName = config.userName;

    const subject = this.i18n.t('emails.second-factor-activated.subject', {
      lang,
      args: {
        appName,
      },
    });

    // Render contenido específico
    const contentHtml = this.render(
      'second-factor-activated',
      { appName, userName },
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

    const text = `Done! Two-Factor Authentication (2FA) has been successfully enabled on your ${appName} account.`;

    this.reset()
      .setRecipient(config.to)
      .setSubject(subject)
      .setText(text)
      .setHtml(html);

    return this.emailContent as EmailContent;
  }
}
