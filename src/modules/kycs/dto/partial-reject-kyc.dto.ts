import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class PartialRejectKycDto {
  @ApiProperty({
    description: 'Array de IDs de los documentos a rechazar',
    example: [
      '123e4567-e89b-12d3-a456-426614174000',
      '987fcdeb-51a2-43d7-9abc-123456789def',
    ],
    type: [String],
  })
  @IsArray()
  @IsNotEmpty({ message: 'El array de documentos no puede estar vacío' })
  @IsUUID('4', { each: true, message: 'Cada ID debe ser un UUID válido' })
  documentIds: string[];

  @ApiProperty({
    description: 'Razón de rechazo (opcional)',
    required: false,
    example: 'Documentos no legibles',
  })
  @IsOptional()
  @IsString()
  rejectReason?: string;
}
