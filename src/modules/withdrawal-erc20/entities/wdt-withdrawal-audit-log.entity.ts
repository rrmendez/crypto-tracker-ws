import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('wdt_withdrawal_audit_log')
@Index(['withdrawal_request_id'])
@Index(['topic'])
export class WdtWithdrawalAuditLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  withdrawal_request_id?: string;

  @Column()
  topic: string; // 'STATE_CHANGE' | 'RPC_CALL' | ...

  @Column({ type: 'text' })
  message: string; // JSON/text

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  created_at: Date;
}
