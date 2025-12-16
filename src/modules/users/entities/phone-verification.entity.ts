import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { TimestampEntity } from '@/common/entities/timestamp.entity';
import { User } from './user.entity';

@Entity()
export class PhoneVerification extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  phone: string;

  @Column({ type: 'varchar' })
  code: string;

  @Column({ type: 'boolean', default: false })
  verified: boolean;

  @Column({ type: 'varchar', nullable: true })
  error?: string;

  @Column({ type: 'date', default: () => 'CURRENT_TIMESTAMP' })
  sendedAt: Date;

  @ManyToOne(() => User, (user) => user.phoneVerifications, {
    nullable: false,
  })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
