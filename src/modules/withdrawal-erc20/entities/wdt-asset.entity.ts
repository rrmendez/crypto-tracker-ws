import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('wdt_asset')
@Index(['network_id'])
@Index(['network_id', 'symbol'], { unique: true })
@Index(['network_id', 'contract_address'], {
  unique: true,
  where: `"contract_address" IS NOT NULL`,
})
export class WdtAssetEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  network_id: string;

  @Column()
  symbol: string; // 'USDT'

  @Column()
  name: string; // 'Tether USD'

  @Column({ nullable: true })
  contract_address?: string;

  @Column({ type: 'int' })
  decimals: number;

  @Column({ type: 'bool', default: true })
  is_active: boolean;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  created_at: Date;

  @Column({ type: 'timestamptz', default: () => 'NOW()', onUpdate: 'NOW()' })
  updated_at: Date;
}
