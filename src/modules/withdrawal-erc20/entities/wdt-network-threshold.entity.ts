import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('wdt_network_threshold')
@Index(['network_id'], { unique: true })
export class WdtNetworkThresholdEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  network_id: string;

  @Column({ type: 'varchar' })
  min_native_balance_for_approve: string; // decimal string (ej. '0.003')

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  created_at: Date;

  @Column({ type: 'timestamptz', default: () => 'NOW()', onUpdate: 'NOW()' })
  updated_at: Date;
}
