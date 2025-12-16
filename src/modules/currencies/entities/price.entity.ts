import { TimestampEntity } from '@/common/entities/timestamp.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Currency } from './currency.entity';

@Entity()
export class Price extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  code: string;

  @Column({ type: 'decimal', precision: 38, scale: 18 })
  usdPrice: number;

  @Column({ type: 'varchar', nullable: true })
  usdPriceFormatted?: string;

  @Column({ type: 'decimal', precision: 38, scale: 18, nullable: true })
  usdPrice24hr?: number;

  @Column({ type: 'decimal', precision: 38, scale: 18, nullable: true })
  usdPrice24hrUsdChange?: number;

  @Column({ type: 'decimal', precision: 38, scale: 18, nullable: true })
  usdPrice24hrPercentChange?: number;

  @Column({ type: 'varchar', nullable: true })
  '24hrPercentChange'?: string;

  @ManyToOne(() => Currency, (currency) => currency.wallets, {
    eager: true, // Automatically load the currency details
    nullable: false, // It is mandatory that each wallet has a currency
  })
  @JoinColumn({ name: 'currency_id' })
  currency: Currency;

  @Column({ type: 'jsonb', nullable: true })
  nativePrice?: Record<string, any>; // JSON libre
}
