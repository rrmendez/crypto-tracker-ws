import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('wdt_network')
export class WdtNetworkEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column()
  chain_id: number;

  @Column() name: string;
  @Column() native_symbol: string;
  @Column() rpc_url: string;
  @Column({ default: true }) is_active: boolean;
  @Column({ type: 'int', default: 3 }) min_confirmations: number;

  @Column({ type: 'timestamptz', default: () => 'NOW()' }) created_at: Date;
  @Column({ type: 'timestamptz', default: () => 'NOW()', onUpdate: 'NOW()' })
  updated_at: Date;
}
