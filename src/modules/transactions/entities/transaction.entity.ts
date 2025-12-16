import { TimestampEntity } from '@/common/entities/timestamp.entity';
import { Wallet } from '@/modules/wallets/entities/wallet.entity';
import { TransactionType } from '@/common/enums/transaction-type.enum';
import { DecimalColumn } from '@/common/decorators/decimal-column.decorator';
import {
  AfterInsert,
  AfterLoad,
  AfterUpdate,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { TransactionSymbol } from '@/common/enums/transaction-symbol.enum';
import { TransactionStatus } from '@/common/enums/transaction-status.enum';
import Decimal from 'decimal.js';

@Entity('transactions')
@Unique('UQ_tx_hash_type_wallet', ['txHash', 'type', 'wallet'])
@Unique('UQ_tx_hash_type_from_to_type', [
  'txHash',
  'type',
  'fromAddress',
  'toAddress',
])
export class Transaction extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: TransactionType })
  type: TransactionType;

  @ManyToOne(() => Wallet, (wallet) => wallet.transactions, { nullable: false })
  @JoinColumn({ name: 'wallet_id' })
  wallet: Wallet;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.CREATED,
  })
  status: TransactionStatus;

  @Column({ type: 'varchar' })
  txHash: string;

  @Column({ type: 'varchar' })
  fromAddress: string;

  @Column({ type: 'varchar' })
  toAddress: string;

  @DecimalColumn()
  amount: string;

  @Column({ type: 'enum', enum: TransactionSymbol })
  symbol: TransactionSymbol;

  @Column({ type: 'varchar', length: 10 })
  currencyCode: string; // BNB, USDT, etc.

  @Column({ type: 'jsonb', nullable: true })
  extras?: Record<string, any>; // JSON libre

  @DecimalColumn(38, 18, { default: 0 })
  fee: string;

  @DecimalColumn(38, 18, { default: 0 })
  withdrawAmount: string;

  @DecimalColumn(38, 18, { default: 0 })
  creditedAmount: string;

  @DecimalColumn(38, 18, { nullable: true })
  price?: number;

  @AfterLoad()
  @AfterInsert()
  @AfterUpdate()
  roundBalance() {
    if (this.amount && this.wallet?.currency?.decimals !== undefined) {
      const dp = this.wallet.currency.decimals;
      this.amount = new Decimal(this.amount).toDecimalPlaces(dp).toFixed(dp);
    }

    if (this.fee && this.wallet?.currency?.decimals !== undefined) {
      const dp = this.wallet.currency.decimals;
      this.fee = new Decimal(this.fee).toDecimalPlaces(dp).toFixed(dp);
    }

    if (this.withdrawAmount && this.wallet?.currency?.decimals !== undefined) {
      const dp = this.wallet.currency.decimals;
      this.withdrawAmount = new Decimal(this.withdrawAmount)
        .toDecimalPlaces(dp)
        .toFixed(dp);
    }

    if (this.creditedAmount && this.wallet?.currency?.decimals !== undefined) {
      const dp = this.wallet.currency.decimals;
      this.creditedAmount = new Decimal(this.creditedAmount)
        .toDecimalPlaces(dp)
        .toFixed(dp);
    }
  }
}
