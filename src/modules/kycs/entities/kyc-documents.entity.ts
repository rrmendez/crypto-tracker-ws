import { TimestampEntity } from '@/common/entities/timestamp.entity';
import {
  KycDocumentIdPfTypeEnum,
  KycDocumentIdPjTypeEnum,
  KycPhotoTypeEnum,
  KycDocumentStatusEnum,
  KycDocumentGroupTypeEnum,
} from '@/common/enums/kyc-type-enum';
import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Kyc } from './kyc.entity';
import { IsEnum, IsOptional } from 'class-validator';

@Entity()
export class KycDocuments extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Kyc, (kyc) => kyc.documents, {
    nullable: false, // It is mandatory that each kyc has a user
  })
  @JoinColumn({ name: 'kyc_id' })
  kyc: Kyc;

  @Column({
    type: 'enum',
    enum: [
      ...Object.values(KycDocumentIdPfTypeEnum),
      ...Object.values(KycDocumentIdPjTypeEnum),
      ...Object.values(KycPhotoTypeEnum),
    ],
  })
  type: KycDocumentIdPfTypeEnum | KycDocumentIdPjTypeEnum | KycPhotoTypeEnum;

  @Column({
    type: 'enum',
    enum: [...Object.values(KycDocumentStatusEnum)],
    nullable: true,
  })
  @IsOptional()
  @IsEnum(KycDocumentStatusEnum)
  status: KycDocumentStatusEnum;

  @Column({ type: 'varchar' })
  fileUrl: string;

  @Column({ type: 'varchar', nullable: true })
  description?: string;

  @Column({ type: 'varchar', nullable: true })
  extension?: string;

  @Column({ type: 'varchar', nullable: true })
  rejectReason?: string;

  @Column({
    name: 'group_type',
    type: 'enum',
    enum: KycDocumentGroupTypeEnum,
    nullable: true,
  })
  @IsOptional()
  @IsEnum(KycDocumentGroupTypeEnum)
  groupType: KycDocumentGroupTypeEnum;

  /**
   * Private method to calculate groupType based on document type
   */
  private calculateGroupType(): KycDocumentGroupTypeEnum {
    const typeString = this.type as string;

    // Check if type is from KycDocumentIdPfTypeEnum
    if (
      Object.values(KycDocumentIdPfTypeEnum).includes(
        typeString as KycDocumentIdPfTypeEnum,
      )
    ) {
      return KycDocumentGroupTypeEnum.PERSONAL_IDENTITY;
    }

    // Check if type is from KycDocumentIdPjTypeEnum
    if (
      Object.values(KycDocumentIdPjTypeEnum).includes(
        typeString as KycDocumentIdPjTypeEnum,
      )
    ) {
      return KycDocumentGroupTypeEnum.COMPANY_IDENTITY;
    }

    // Check if type is from KycPhotoTypeEnum
    if (
      Object.values(KycPhotoTypeEnum).includes(typeString as KycPhotoTypeEnum)
    ) {
      return KycDocumentGroupTypeEnum.PERSONAL_SELFIE;
    }

    // This should never be reached if types are correct
    throw new Error(
      `Unable to determine group type for document type: ${typeString}`,
    );
  }

  @BeforeInsert()
  @BeforeUpdate()
  setGroupType() {
    if (this.type) {
      this.groupType = this.calculateGroupType();
    }
  }
}
