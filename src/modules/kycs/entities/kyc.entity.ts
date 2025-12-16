import { KycStatusEnum, KycTypeEnum } from '@/common/enums/kyc-type-enum';
import { User } from '@/modules/users/entities/user.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { KycDocuments } from './kyc-documents.entity';
import { AuditableEntity } from '@/common/entities/auditable.entity';

@Entity()
export class Kyc extends AuditableEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.kyces, {
    nullable: false, // It is mandatory that each kyc has a user
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'enum', enum: KycTypeEnum })
  type: KycTypeEnum;

  @Column({ type: 'boolean', default: false })
  isMandatory: boolean;

  @Column({ type: 'boolean', default: false })
  isForCompliance: boolean;

  @Column({ type: 'enum', enum: KycStatusEnum, default: KycStatusEnum.PENDING })
  status: KycStatusEnum;

  @Column({ type: 'varchar', nullable: true })
  rejectReason?: string;

  @Column({ type: 'varchar', nullable: true })
  requestReason?: string;

  @OneToMany(() => KycDocuments, (kycDocuments) => kycDocuments.kyc, {
    cascade: true,
  })
  @JoinColumn()
  documents: KycDocuments[];
}
