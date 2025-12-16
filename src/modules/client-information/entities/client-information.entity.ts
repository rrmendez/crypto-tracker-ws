import { TimestampEntity } from '@/common/entities/timestamp.entity';
import { User } from '@/modules/users/entities/user.entity';
import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class ClientInformation extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, (user) => user.clientInformation, {
    eager: true,
    nullable: false,
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  userName: string;

  @Column({ nullable: true })
  bussinessName?: string;

  @Column({ nullable: true })
  fantasyName?: string;

  @Column({ length: 50, nullable: true })
  cpf?: string;

  @Column({ length: 50, nullable: true })
  cnpj?: string;

  @Column({ type: 'date', nullable: true })
  birthday?: Date;

  @Column({ type: 'date', nullable: true })
  incorporationDate?: Date;

  @Column({ type: 'varchar', nullable: true })
  motherName?: string;
}
