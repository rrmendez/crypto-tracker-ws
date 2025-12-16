import { TimestampEntity } from '@/common/entities/timestamp.entity';
import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Wallet } from './wallet.entity';

@Entity()
export class Card extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  number: string;

  @Column({ type: 'varchar' })
  brand: string;

  @Column({ type: 'varchar' })
  holderName: string;

  @OneToOne(() => Wallet, (wallet) => wallet.card, {
    nullable: false, // It is mandatory that each card has a wallet
  })
  @JoinColumn({ name: 'wallet_id' })
  wallet: Wallet;
}
