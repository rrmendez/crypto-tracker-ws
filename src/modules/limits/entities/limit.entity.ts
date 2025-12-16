import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';
import {
  LimitCurrencyCode,
  SystemOperation,
} from '@/common/enums/limit-type.enum';
import { AuditableEntity } from '@/common/entities/auditable.entity';

@Entity()
@Unique('UQ_limit_operation_currency', ['operation', 'currencyCode'])
export class Limit extends AuditableEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: SystemOperation })
  operation: SystemOperation;

  @Column({
    type: 'enum',
    enum: LimitCurrencyCode,
    default: LimitCurrencyCode.USD,
  })
  currencyCode: LimitCurrencyCode;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  minimumPerOperation: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  maximumPerOperation: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  maximumPerOperationAtNight: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  maximumPerOperationValidated: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  maximumPerOperationAtNightValidated: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  maximumPerMonth: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  maximumPerMonthValidated: number;
}
