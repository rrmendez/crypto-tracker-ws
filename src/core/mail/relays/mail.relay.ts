import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { Inject } from '@nestjs/common';
import { REPOSITORY } from '@/database/constants';
import {
  EmailOutbox,
  EmailOutboxStatus,
} from '../entities/email-outbox.entity';
import { MailOutboxService } from '@/core/mail/services/mail-outbox.service';

@Injectable()
export class MailRelay {
  private readonly logger = new Logger(MailRelay.name);

  constructor(
    @InjectQueue('mail') private readonly mailQueue: Queue,
    @Inject(REPOSITORY.EMAIL_OUTBOX)
    private readonly outboxRepo: Repository<EmailOutbox>,
    private readonly outboxService: MailOutboxService,
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async relayPending() {
    const pending = await this.outboxRepo.find({
      where: { status: EmailOutboxStatus.PENDING },
      order: { createdAt: 'ASC' },
      take: 50,
    });

    for (const item of pending) {
      await this.mailQueue.add('send', {
        outboxId: item.id,
        to: item.to,
        subject: item.subject,
        text: item.text,
        html: item.html,
      });
      await this.outboxService.markQueued(item.id);
    }
  }
}
