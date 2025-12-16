import { JoinColumn, ManyToOne } from 'typeorm';
import { TimestampEntity } from './timestamp.entity';
import { User } from '@/modules/users/entities/user.entity';

export abstract class AuditableEntity extends TimestampEntity {
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'createdBy' })
  createdBy?: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updatedBy' })
  updatedBy?: User;
}
