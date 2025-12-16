import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable } from '@nestjs/common';
import { MailService } from '@/core/mail/mail.service';
import { MailOutboxService } from '../services/mail-outbox.service';

@Processor('mail')
@Injectable()
export class MailProcessor extends WorkerHost {
  constructor(
    private readonly mailService: MailService,
    private readonly outboxService: MailOutboxService,
  ) {
    super();
  }

  async process(job: Job): Promise<any> {
    if (job.name !== 'send') return;
    const { outboxId, to, subject, text, html } = job.data as {
      outboxId: string;
      to: string;
      subject: string;
      text: string;
      html?: string;
    };
    try {
      await this.mailService.sendMail({ to, subject, text, html });
      await this.outboxService.markSent(outboxId);
      return { ok: true };
    } catch (error) {
      await this.outboxService.markFailed(outboxId, error);
      throw error;
    }
  }
}
