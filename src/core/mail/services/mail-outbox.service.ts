import { Inject, Injectable, Logger } from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';
import { REPOSITORY } from '@/database/constants';
import {
  EmailOutbox,
  EmailOutboxStatus,
} from '../entities/email-outbox.entity';
import { EmailType } from '@/core/mail/builders';
import {
  EMAIL_BUILDER_FACTORY,
  IEmailBuilderFactory,
} from '@/core/mail/builders';

export type GenericEmailConfig = { to: string } & Record<string, any>;

@Injectable()
export class MailOutboxService {
  private readonly logger = new Logger(MailOutboxService.name);

  constructor(
    @Inject(REPOSITORY.EMAIL_OUTBOX)
    private readonly outboxRepo: Repository<EmailOutbox>,
    @Inject(EMAIL_BUILDER_FACTORY)
    private readonly emailBuilderFactory: IEmailBuilderFactory,
  ) {}

  async enqueue(
    type: EmailType,
    config: GenericEmailConfig,
    correlationId?: string,
  ) {
    const builder = this.emailBuilderFactory.getBuilder(type);
    const built = builder.build(config as any);
    const record = this.outboxRepo.create({
      type,
      to: built.to,
      subject: built.subject,
      text: built.text,
      html: built.html,
      status: EmailOutboxStatus.PENDING,
      correlationId,
    });
    await this.outboxRepo.save(record);
    return record.id;
  }

  async enqueueTx(
    manager: EntityManager,
    type: EmailType,
    config: GenericEmailConfig,
    correlationId?: string,
  ) {
    const builder = this.emailBuilderFactory.getBuilder(type);
    const built = builder.build(config as any);
    const repo = manager.getRepository(EmailOutbox);
    const record = repo.create({
      type,
      to: built.to,
      subject: built.subject,
      text: built.text,
      html: built.html,
      status: EmailOutboxStatus.PENDING,
      correlationId,
    });
    await repo.save(record);
    return record.id;
  }

  async markQueued(id: string) {
    await this.outboxRepo.update({ id }, { status: EmailOutboxStatus.QUEUED });
  }

  async markSent(id: string) {
    await this.outboxRepo.update(
      { id },
      {
        status: EmailOutboxStatus.SENT,
        sentAt: new Date(),
        lastError: undefined,
      },
    );
  }

  async markFailed(id: string, error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    await this.outboxRepo.update(
      { id },
      {
        status: EmailOutboxStatus.FAILED,
        attempts: () => 'attempts + 1' as unknown as string,
        lastError: message,
      },
    );
  }
}
