import { ApiProperty } from '@nestjs/swagger';
import { Kyc } from '../entities/kyc.entity';
import { KycStatusEnum } from '@/common/enums/kyc-type-enum';
import { KycDocumentResponseVm } from './kyc-document-response.vm';

export class KycResponseVm {
  @ApiProperty({
    description: 'KYC ID',
    example: 'uuid-123',
  })
  id: string;

  @ApiProperty({
    description: 'KYC type',
    example: 'IDENTITY_PF',
  })
  type: string;

  @ApiProperty({
    description: 'KYC status',
    example: 'PENDING',
    enum: KycStatusEnum,
  })
  status: KycStatusEnum;

  @ApiProperty({
    description: 'Is mandatory KYC',
    example: true,
  })
  isMandatory: boolean;

  @ApiProperty({
    description: 'Is for compliance',
    example: true,
  })
  isForCompliance: boolean;

  @ApiProperty({
    description: 'Reject reason if KYC was rejected',
    example: 'Documents not valid',
    required: false,
  })
  rejectReason?: string;

  @ApiProperty({
    description: 'Request reason',
    example: 'Account validation',
    required: false,
  })
  requestReason?: string;

  @ApiProperty({
    description: 'Creation date',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update date',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'Created by user email',
    example: 'admin@example.com',
    required: false,
  })
  createdBy?: string;

  @ApiProperty({
    description: 'Updated by user email',
    example: 'admin@example.com',
    required: false,
  })
  updatedBy?: string;

  @ApiProperty({
    example: {
      fullName: 'John Doe',
      email: 'john@example.com',
      phone: '+555123456789',
    },
    description: 'User information',
  })
  user: {
    fullName: string;
    email: string;
    phone?: string;
  };

  @ApiProperty({
    description: 'KYC documents',
    type: [KycDocumentResponseVm],
  })
  documents: KycDocumentResponseVm[];

  constructor(kyc: Kyc) {
    this.id = kyc.id;
    this.type = kyc.type;
    this.status = kyc.status;
    this.isMandatory = kyc.isMandatory;
    this.isForCompliance = kyc.isForCompliance;
    this.rejectReason = kyc.rejectReason;
    this.requestReason = kyc.requestReason;
    this.createdAt = kyc.createdAt;
    this.updatedAt = kyc.updatedAt;
    this.createdBy = kyc.createdBy?.email;
    this.updatedBy = kyc.updatedBy?.email;

    this.user = {
      fullName: kyc.user.fullName,
      email: kyc.user.email,
      phone: kyc.user.phone,
    };

    this.documents =
      kyc.documents?.map((doc) => new KycDocumentResponseVm(doc)) || [];
  }
}
