import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToMany,
  JoinTable,
  OneToMany,
  OneToOne,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { Role } from './role.entity';
import { TimestampEntity } from '@/common/entities/timestamp.entity';
import { UserSecurityLog } from './user-security-log.entity';
import { Wallet } from '@/modules/wallets/entities/wallet.entity';
import { UserAddress } from '@/modules/user-addresses/entities/user-address.entity';
import { ClientInformation } from '@/modules/client-information/entities/client-information.entity';
import { Kyc } from '@/modules/kycs/entities/kyc.entity';
import { PhoneVerification } from './phone-verification.entity';
import { UserLimit } from '@/modules/limits/entities/user-limit.entity';

@Entity()
export class User extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  password: string;

  @Column({ type: 'varchar', unique: true })
  email: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column()
  fullName: string;

  @Column({ length: 50, nullable: true })
  phone?: string;

  @Column({ type: 'boolean', default: false })
  verified: boolean;

  @Column({ nullable: true })
  isBlocked?: boolean;

  @Column({ nullable: true })
  withdrawBlocked?: boolean;

  @Column({ nullable: true, type: 'boolean', default: false })
  isSecondFactorEnabled?: boolean;

  @Column({ nullable: true })
  avatar?: string;

  @Column({ nullable: true, type: 'varchar' })
  twoFactorSecret?: string | null;

  @ManyToMany(() => Role, (role) => role.users, { cascade: true })
  @JoinTable()
  roles: Role[];

  @OneToMany(() => Wallet, (wallet) => wallet.user)
  @JoinTable()
  wallets: Wallet[];

  @OneToMany(() => UserAddress, (address) => address.user)
  @JoinTable()
  addresses: UserAddress[];

  @OneToOne(
    () => ClientInformation,
    (clientInformation) => clientInformation.user,
  )
  @JoinTable()
  clientInformation: ClientInformation;

  @OneToMany(() => Kyc, (kyc) => kyc.user, { cascade: true })
  @JoinTable()
  kyces: Kyc[];

  @OneToMany(() => UserSecurityLog, (log) => log.user)
  securityLogs: UserSecurityLog[];

  @OneToMany(
    () => PhoneVerification,
    (phoneVerification) => phoneVerification.user,
  )
  @JoinTable()
  phoneVerifications: PhoneVerification[];

  @OneToMany(() => UserLimit, (userLimit) => userLimit.user)
  userLimits: UserLimit[];

  @Column({ type: 'varchar', nullable: true, default: 'pt' })
  lang?: string;

  // 👇 Normaliza el email automáticamente
  @BeforeInsert()
  @BeforeUpdate()
  normalizeEmail() {
    if (this.email) {
      this.email = this.email.trim().toLowerCase();
    }
  }
}
