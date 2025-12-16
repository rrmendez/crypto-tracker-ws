import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('wdt_withdrawal_contract')
@Index(['network_id'])
@Index(['network_id', 'contract_address'], { unique: true })
export class WdtWithdrawalContractEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  network_id: string;

  @Column()
  contract_address: string;

  @Column({ default: 'v1.0.0' })
  version: string;

  @Column({ type: 'bool', default: true })
  is_active: boolean;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  created_at: Date;

  @Column({ type: 'timestamptz', default: () => 'NOW()', onUpdate: 'NOW()' })
  updated_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  deactivated_at?: Date;
}
