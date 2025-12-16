import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsUUID } from 'class-validator';

export class QueryAdminFeeDto {
  @ApiProperty({
    description: 'ID de la moneda',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty()
  currencyId: string;

  @ApiProperty({
    description: 'Monto opcional para el cálculo de fees',
    example: 0.01,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  amount?: number;
}
