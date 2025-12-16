import { TimestampEntity } from '@/common/entities/timestamp.entity';
import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Wallet } from './wallet.entity';

@Entity()
@Unique(['address', 'network'])
export class CryptoAddress extends TimestampEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  address: string;

  @Column({ type: 'varchar' })
  network: string;

  @Column({ type: 'int', unsigned: true, default: 0 })
  index: number;

  @OneToMany(() => Wallet, (wallet) => wallet.cryptoAddress)
  wallets: Wallet[];
}
