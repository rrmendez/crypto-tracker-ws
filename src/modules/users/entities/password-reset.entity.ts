import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TimestampEntity } from '@/common/entities/timestamp.entity';
import { User } from './user.entity';
import { PasswordResetAction } from '@/common/enums/password-reset-action.enum';

@Entity()
export class PasswordReset extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  token: string;

  @Column({ type: 'timestamp', name: 'expires_at' })
  expiresAt: Date;

  @Column({ type: 'boolean', default: false })
  used: boolean;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: PasswordResetAction,
    nullable: true,
    default: PasswordResetAction.PASSWORD_RESET,
  })
  action: PasswordResetAction;
}
