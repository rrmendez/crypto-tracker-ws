import { TimestampEntity } from '@/common/entities/timestamp.entity';
import { CurrencyTypeEnum } from '@/common/enums/currency-type.enum';
import { cryptoCurrencies } from '@/config/currency.config';
import { Fee } from '@/modules/fees/entities/fee.entity';
import { Wallet } from '@/modules/wallets/entities/wallet.entity';
import { Expose } from 'class-transformer';
import {
  AfterLoad,
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class Currency extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true, nullable: true })
  configId: string;

  @Column({ type: 'varchar' })
  code: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'enum', enum: CurrencyTypeEnum })
  type: CurrencyTypeEnum;

  @Column({ type: 'integer' })
  decimals: number;

  @Column({ type: 'varchar', nullable: true })
  symbol?: string;

  @Column({ type: 'boolean', default: false })
  isToken?: boolean;

  @Column({ type: 'varchar', nullable: true })
  network?: string;

  @Column({ type: 'varchar', nullable: true })
  chainId?: string;

  @Column({ type: 'varchar', nullable: true })
  networkCode?: string;

  @Column({ type: 'varchar', nullable: true })
  smartContractAddress?: string;

  @Column({ type: 'varchar', nullable: true })
  logo?: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'decimal', precision: 38, scale: 18, nullable: true })
  price: number | null;

  @OneToMany(() => Wallet, (wallet) => wallet.currency)
  wallets: Wallet[];

  @OneToMany(() => Fee, (fee) => fee.currency)
  fees: Fee[];

  // Campo extra que no está en DB pero se devuelve al serializar
  @Expose()
  explorerUrl?: string;

  @AfterLoad()
  attachConfig() {
    if (this.configId) {
      const config = cryptoCurrencies.find((c) => c.id === this.configId);
      if (config) {
        this.explorerUrl = config.explorerUrl;
      }
    }
  }
}
