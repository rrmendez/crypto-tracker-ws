import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class SyncDocumentsStatusDto {
  @ApiProperty({
    description:
      'KYC ID to sync documents (optional, if not provided syncs all)',
    example: 'uuid-123',
    required: false,
  })
  @IsOptional()
  @IsUUID('4', { message: 'KYC ID must be a valid UUID' })
  kycId?: string;

  @ApiProperty({
    description: 'Number of KYCs to process per batch',
    example: 50,
    required: false,
    default: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(500)
  batchSize?: number;
}
