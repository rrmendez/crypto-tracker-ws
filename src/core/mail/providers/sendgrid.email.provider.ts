import { EmailProvider } from '../email.provider';
import * as sgMail from '@sendgrid/mail';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

export class SendGridEmailProvider implements EmailProvider {
  protected logger = new Logger('SendGridEmailProvider');

  name = 'sendgrid';

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('SENDGRID_API_KEY');

    if (apiKey) {
      sgMail.setApiKey(apiKey);
    }
  }

  async sendEmail(to: string, subject: string, text: string, html?: string) {
    const from = this.configService.get<string>('SENDGRID_FROM_EMAIL');
    if (!from) return false;

    await sgMail.send({
      to,
      from,
      subject,
      text,
      html: html || text,
    });
    return true;
  }
}
