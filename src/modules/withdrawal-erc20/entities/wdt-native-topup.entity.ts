import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';
import { TxStatus } from '../enums/tx-status.enum';

@Entity('wdt_native_topup')
@Index(['network_id'])
@Index(['to_address'])
@Index(['tx_hash'], { unique: true })
export class WdtNativeTopupEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  to_address: string; // dirección del owner del token

  @Column({ type: 'uuid' })
  network_id: string;

  @Column({ type: 'varchar' })
  amount_native: string; // decimal string (ej. '0.005')

  @Column()
  funding_source_address: string; // hot wallet/treasury

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
