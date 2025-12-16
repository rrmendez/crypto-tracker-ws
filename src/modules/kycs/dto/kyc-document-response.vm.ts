import { ApiProperty } from '@nestjs/swagger';
import {
  KycDocumentStatusEnum,
  KycDocumentGroupTypeEnum,
} from '@/common/enums/kyc-type-enum';
import { KycDocuments } from '../entities/kyc-documents.entity';

export class KycDocumentResponseVm {
  @ApiProperty({
    description: 'Document ID',
    example: 'uuid-123',
  })
  id: string;

  @ApiProperty({
    description: 'Document type',
    example: 'RG_FRONT',
  })
  type: string;

  @ApiProperty({
    description: 'Document group type',
    example: 'PERSONAL_IDENTITY',
    enum: KycDocumentGroupTypeEnum,
  })
  groupType: KycDocumentGroupTypeEnum;

  @ApiProperty({
    description: 'Document status',
    example: 'REQUESTED',
    enum: KycDocumentStatusEnum,
  })
  status: KycDocumentStatusEnum;

  @ApiProperty({
    description: 'Document file URL',
    example: 'https://s3.amazonaws.com/...',
  })
  fileUrl: string;

  @ApiProperty({
    description: 'Document description',
    example: 'Front of ID card',
    required: false,
  })
  description?: string;

  @ApiProperty({
    description: 'File extension',
    example: 'jpg',
    required: false,
  })
  extension?: string;

  @ApiProperty({
    description: 'Reject reason if document was rejected',
    example: 'Document is not readable',
    required: false,
  })
  rejectReason?: string;

  @ApiProperty({
    description: 'Document creation date',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Document last update date',
  })
  updatedAt: Date;

  constructor(document: KycDocuments) {
    this.id = document.id;
    this.type = document.type;
    this.groupType = document.groupType;
    this.status = document.status;
    this.fileUrl = document.fileUrl;
    this.description = document.description;
    this.extension = document.extension;
    this.rejectReason = document.rejectReason;
    this.createdAt = document.createdAt;
    this.updatedAt = document.updatedAt;
  }
}
