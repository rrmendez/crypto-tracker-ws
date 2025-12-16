import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  // IsString,
  IsUUID,
  // Matches,
  Min,
} from 'class-validator';
import { FeeType } from '@/common/enums/fees-enum';
import { SystemOperation } from '@/common/enums/limit-type.enum';

export class CreateFeeDto {
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

  @ApiProperty({
    enum: FeeType,
    description: 'Tipo de tasa (FIXED o PERCENT)',
  })
  @IsEnum(FeeType)
  @IsNotEmpty()
  type: FeeType;

  // @ApiProperty({
  //   description: 'Valor de la tasa como string para evitar notación científica',
  //   example: '0.00500000',
  // })
  // @IsString()
  // @IsNotEmpty()
  // @Matches(/^[0-9]+(\.[0-9]+)?$/, {
  //   message: 'value must be a valid positive number string',
  // })
  // value: string;

  @ApiProperty({
    description: 'Valor de la tasa como string para evitar notación científica',
    example: '0.01',
  })
  @IsNumber()
  @IsNotEmpty()
  @Min(0.00000001)
  value: number;

  @ApiProperty({
    description: 'Indica si la tasa está activa',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
