import { TimestampEntity } from '@/common/entities/timestamp.entity';
import { CountryEnum } from '@/common/enums/country-enum';
import { UserAddressStatusEnum } from '@/common/enums/user-address-status.enum';
import { User } from '@/modules/users/entities/user.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class UserAddress extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.addresses, {
    nullable: false, // It is mandatory that each address has a user
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar' })
  zipCode: string;

  @Column({ type: 'varchar' })
  street: string;

  @Column({ type: 'varchar' })
  number: string;

  @Column({ type: 'varchar', nullable: true })
  complement: string;

  @Column({ type: 'varchar' })
  neighborhood: string;

  @Column({ type: 'varchar' })
  city: string;

  @Column({ type: 'varchar' })
  state: string;

  @Column({ type: 'enum', enum: CountryEnum, default: CountryEnum.BR })
  country: CountryEnum;

  @Column({
    type: 'enum',
    enum: UserAddressStatusEnum,
    default: UserAddressStatusEnum.PENDING,
  })
  status: UserAddressStatusEnum;
}
