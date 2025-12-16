import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';
import { TxStatus } from '../enums/tx-status.enum';

@Entity('wdt_allowance_approval')
@Index(['owner_address'])
@Index(['token_asset_id'])
@Index(['spender_contract_id'])
@Index(['owner_address', 'token_asset_id', 'spender_contract_id', 'tx_hash'], {
  unique: true,
})
export class WdtAllowanceApprovalEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  owner_address: string; // EOA del usuario (from)

  @Column({ type: 'uuid' })
  token_asset_id: string; // Asset.id (ERC20)

  @Column({ type: 'uuid' })
  spender_contract_id: string; // WithdrawalContract.id

  @Column({ type: 'varchar' })
  intended_amount: string; // decimal string (suele ser MaxUint256 en decimal)

  @Column()
  tx_hash: string;

  @Column({ type: 'enum', enum: TxStatus })
  status: TxStatus;

  @Column({ type: 'bigint', nullable: true })
  block_number?: string; // como string (PG bigint)

  @Column({ type: 'timestamptz', nullable: true })
  confirmed_at?: Date;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  created_at: Date;

  @Column({ type: 'timestamptz', default: () => 'NOW()', onUpdate: 'NOW()' })
  updated_at: Date;
}
