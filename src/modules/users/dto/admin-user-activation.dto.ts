import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ActivateDeactivateAdminUserDto {
  @ApiProperty({
    example: 'Razón para activar/desactivar el usuario',
    description: 'Motivo de la activación/desactivación del usuario',
    required: false,
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
