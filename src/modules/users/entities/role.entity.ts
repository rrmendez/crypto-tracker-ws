import { Entity, Column, PrimaryGeneratedColumn, ManyToMany } from 'typeorm';
import { User } from './user.entity';
import { TimestampEntity } from '@/common/entities/timestamp.entity';

@Entity()
export class Role extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  name: string;

  @ManyToMany(() => User, (user) => user.roles)
  users: User[];
}
