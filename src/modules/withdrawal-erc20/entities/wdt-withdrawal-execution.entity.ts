import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';
import { TxStatus } from '../enums/tx-status.enum';

@Entity('wdt_withdrawal_execution')
@Index(['withdrawal_request_id'])
@Index(['tx_hash'])
export class WdtWithdrawalExecutionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  withdrawal_request_id: string;

  @Column({ type: 'uuid' })
  withdrawal_contract_id: string;

  @Column()
  spender_address_snapshot: string; // contrato usado en ese momento

  @Column({ type: 'varchar' })
  amount_sent: string; // decimal string

  @Column({ type: 'varchar', nullable: true })
  fee_applied?: string; // decimal string

  @Column()
  tx_hash: string;

  @Column({ type: 'enum', enum: TxStatus })
  status: TxStatus;

  @Column({ type: 'bigint', nullable: true })
  block_number?: string;

  @Column({ type: 'timestamptz', nullable: true })
  confirmed_at?: Date;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  created_at: Date;

  @Column({ type: 'timestamptz', default: () => 'NOW()', onUpdate: 'NOW()' })
  updated_at: Date;
}
