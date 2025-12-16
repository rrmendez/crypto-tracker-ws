import { TimestampEntity } from '@/common/entities/timestamp.entity';
import { Currency } from '@/modules/currencies/entities/currency.entity';
import {
  AfterInsert,
  AfterLoad,
  AfterUpdate,
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Card } from './card.entity';
import { User } from '@/modules/users/entities/user.entity';
import Decimal from 'decimal.js';
import { CryptoAddress } from './crypto-address.entity';
import { Transaction } from '@/modules/transactions/entities/transaction.entity';

@Entity()
export class Wallet extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'decimal',
    precision: 38, // Máximo soportado por la mayoría de BDs (para 18 decimales + 20 enteros)
    scale: 18, // Máximo de decimales (ajustado en runtime)
  })
  balance: string; // Almacenado como string para evitar pérdida de precisión

  @Column({ type: 'boolean', default: false })
  isDefault: boolean;

  @Column({ type: 'varchar', nullable: true })
  address?: string;

  @ManyToOne(() => User, (user) => user.wallets, {
    nullable: false, // It is mandatory that each wallet has a user
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Currency, (currency) => currency.wallets, {
    eager: true, // Automatically load the currency details
    nullable: false, // It is mandatory that each wallet has a currency
  })
  @JoinColumn({ name: 'currency_id' })
  currency: Currency;

  @OneToOne(() => Card, (card) => card.wallet, {
    eager: true, // Automatically load the card details
    nullable: true,
  })
  @JoinColumn({ name: 'card_id' })
  card: Card;

  @ManyToOne(() => CryptoAddress, (crypto) => crypto.wallets, {
    eager: false,
    nullable: true,
  })
  @JoinColumn({ name: 'cryptoAddress_id' })
  cryptoAddress?: CryptoAddress;

  @OneToMany(() => Transaction, (transaction) => transaction.wallet)
  @JoinTable()
  transactions: Transaction[];

  // Methods to round the balance to the currency's decimal places
  @AfterLoad()
  @AfterInsert()
  @AfterUpdate()
  roundBalance() {
    if (this.balance && this.currency) {
      const decimalPlaces = this.currency.decimals;
      this.balance = new Decimal(this.balance)
        .toDecimalPlaces(decimalPlaces)
        .toFixed(decimalPlaces);
    }
  }
}
