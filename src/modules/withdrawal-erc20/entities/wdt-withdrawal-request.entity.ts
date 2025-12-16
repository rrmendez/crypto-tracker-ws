import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';
import { WithdrawalStatus } from '../enums/withdrawal-status.enum';

@Entity('wdt_withdrawal_request')
@Index(['status'])
@Index(['chain_id'])
@Index(['from'])
@Index(['to'])
@Index(['client_request_id'], {
  unique: true,
  where: `"client_request_id" IS NOT NULL`,
})
export class WdtWithdrawalRequestEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ---- entrada del front ----
  @Column() from: string; // owner_address
  @Column() to: string; // destino final
  @Column({ type: 'varchar' }) amount: string; // decimal string
  @Column({ nullable: true }) addressFee?: string;
  @Column({ type: 'varchar', nullable: true }) amountFee?: string;
  @Column({ type: 'int' }) chain_id: number;

  // ---- resueltos por el módulo ----
  @Column({ type: 'uuid' })
  network_id: string;

  @Column({ type: 'uuid' })
  asset_id: string; // token ERC20

  @Column({
    type: 'enum',
    enum: WithdrawalStatus,
    default: WithdrawalStatus.CREATED,
  })
  status: WithdrawalStatus;

  @Column({ nullable: true })
  client_request_id?: string; // idempotencia opcional

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  created_at: Date;

  @Column({ type: 'timestamptz', default: () => 'NOW()', onUpdate: 'NOW()' })
  updated_at: Date;
}
