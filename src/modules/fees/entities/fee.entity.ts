import { DecimalColumn } from '@/common/decorators/decimal-column.decorator';
import { AuditableEntity } from '@/common/entities/auditable.entity';
import { FeeType } from '@/common/enums/fees-enum';
import { SystemOperation } from '@/common/enums/limit-type.enum';
import { Currency } from '@/modules/currencies/entities/currency.entity';
import Decimal from 'decimal.js';
import {
  AfterInsert,
  AfterLoad,
  AfterUpdate,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class Fee extends AuditableEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: SystemOperation })
  operation: SystemOperation;

  @ManyToOne(() => Currency, (currency) => currency.fees)
  @JoinColumn({ name: 'currency_id' })
  currency: Currency;

  @Column({ type: 'enum', enum: FeeType })
  type: FeeType;

  @DecimalColumn()
  value: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @AfterLoad()
  @AfterInsert()
  @AfterUpdate()
  roundValue() {
    if (this.value && this.currency?.decimals !== undefined) {
      const dp = this.currency.decimals;
      this.value = new Decimal(this.value).toDecimalPlaces(dp).toFixed(dp);
    }
  }
}
