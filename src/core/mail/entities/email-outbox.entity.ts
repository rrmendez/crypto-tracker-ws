import { AuditableEntity } from '@/common/entities/auditable.entity';
import { EmailType } from '@/core/mail/builders';
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum EmailOutboxStatus {
  PENDING = 'pending',
  QUEUED = 'queued',
  SENT = 'sent',
  FAILED = 'failed',
}

@Entity('email_outbox')
export class EmailOutbox extends AuditableEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: EmailOutboxStatus,
    default: EmailOutboxStatus.PENDING,
  })
  status: EmailOutboxStatus;

  @Index()
  @Column({ type: 'enum', enum: EmailType })
  type: EmailType;

  @Column({ type: 'varchar' })
  to: string;

  @Column({ type: 'varchar' })
  subject: string;

  @Column({ type: 'text' })
  text: string;

  @Column({ type: 'text', nullable: true })
  html?: string;

  @Index()
  @Column({ type: 'varchar', nullable: true })
  correlationId?: string;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @Column({ type: 'text', nullable: true })
  lastError?: string;

  @Column({ type: 'timestamptz', nullable: true })
  sentAt?: Date;
}
