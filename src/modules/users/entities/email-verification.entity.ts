import { Column, Entity, PrimaryGeneratedColumn, Index } from 'typeorm';
import { TimestampEntity } from '@/common/entities/timestamp.entity';

@Entity()
export class EmailVerification extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_email_verifications_email')
  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 6 })
  code: string;

  @Column({ type: 'boolean', default: false })
  verified: boolean;

  @Column({ type: 'varchar', nullable: true })
  error?: string;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    name: 'sent_at',
  })
  sentAt: Date;
}
