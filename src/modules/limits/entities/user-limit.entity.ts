import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  JoinColumn,
} from 'typeorm';
import { AuditableEntity } from '@/common/entities/auditable.entity';
import { User } from '@/modules/users/entities/user.entity';
import { Limit } from './limit.entity';

@Entity()
@Unique('UQ_user_limit_user_limit', ['user', 'limit'])
export class UserLimit extends AuditableEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.userLimits)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Limit, { eager: true })
  @JoinColumn({ name: 'limit_id' })
  limit: Limit;

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
