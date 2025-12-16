import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class UpdateKycDto {
  @ApiProperty({
    description: 'Razón de rechazo',
    required: false,
  })
  @IsOptional()
  rejectReason?: string;
}
