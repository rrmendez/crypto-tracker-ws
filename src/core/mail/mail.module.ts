import { Module } from '@nestjs/common';
import { MailService } from '@/core/mail/mail.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EMAIL_PROVIDER } from './email.provider';
import { SendGridEmailProvider } from './providers/sendgrid.email.provider';
import { MAIL_PROVIDER_NAMES } from './mail.constants';
import { emailBuilderProviders } from './providers/email-builder.providers';
import { emailOutboxProviders } from './providers/outbox.providers';
import { BullModule } from '@nestjs/bullmq';
import { MailProcessor } from './processors/mail.processor';
import { MailOutboxService } from './services/mail-outbox.service';
import { MailRelay } from './relays/mail.relay';
import { DatabaseModule } from '@/database/database.module';
import { TemplateRendererService } from './services/template-renderer.service';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    BullModule.registerQueue({ name: 'mail' }),
  ],
  providers: [
    MailService,
    TemplateRendererService,
    ...emailBuilderProviders,
    ...emailOutboxProviders,
    MailOutboxService,
    MailProcessor,
    MailRelay,
    {
      provide: EMAIL_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const providerName = config.get<string>('MAIL_PROVIDER');
        switch (providerName) {
          case MAIL_PROVIDER_NAMES.SENDGRID:
          default:
            return new SendGridEmailProvider(config);
        }
      },
    },
  ],
  exports: [
    MailService,
    EMAIL_PROVIDER,
    ...emailBuilderProviders,
    ...emailOutboxProviders,
    MailOutboxService,
    TemplateRendererService,
  ],
})
export class MailModule {}
