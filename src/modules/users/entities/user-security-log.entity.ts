import { AuditableEntity } from '@/common/entities/auditable.entity';
import { User } from '@/modules/users/entities/user.entity';
import { UserSecurityActionType } from '@/common/enums/user-security-action.enum';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('user_security_logs')
export class UserSecurityLog extends AuditableEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'enum', enum: UserSecurityActionType, name: 'action_type' })
  actionType: UserSecurityActionType;

  @Column({ type: 'varchar', nullable: true })
  reason?: string;
}
