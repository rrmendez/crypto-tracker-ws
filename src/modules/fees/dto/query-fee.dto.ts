import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsUUID } from 'class-validator';
import { SystemOperation } from '@/common/enums/limit-type.enum';

export class QueryFeeDto {
  @ApiProperty({
    description: 'ID de la moneda',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty()
  currencyId: string;

  @ApiProperty({
    enum: SystemOperation,
    description: 'Tipo de operación',
  })
  @IsEnum(SystemOperation)
  @IsNotEmpty()
  operation: SystemOperation;
}
