import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber } from 'class-validator';
import {
  LimitCurrencyCode,
  SystemOperation,
} from '@/common/enums/limit-type.enum';
import { IsUnlimitedOrPositive } from '@/common/decorators/is-ulimited-or-positive.decorator';

export class CreateLimitDto {
  @ApiProperty({ enum: SystemOperation })
  @IsEnum(SystemOperation)
  operation: SystemOperation;

  @ApiProperty({ enum: LimitCurrencyCode, default: LimitCurrencyCode.USD })
  @IsEnum(LimitCurrencyCode)
  currencyCode: LimitCurrencyCode = LimitCurrencyCode.USD;

  @ApiProperty({ description: 'Mínimo por operación (>= 0)' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsUnlimitedOrPositive({ message: 'El mínimo debe ser mayor o igual que 0' })
  minimumPerOperation: number;

  @ApiProperty({ description: 'Máximo por operación (-1 = ilimitado)' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsUnlimitedOrPositive()
  maximumPerOperation: number;

  @ApiProperty({
    description: 'Máximo por operación nocturna (-1 = ilimitado)',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsUnlimitedOrPositive()
  maximumPerOperationAtNight: number;

  @ApiProperty({
    description: 'Máximo validado por operación (-1 = ilimitado)',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsUnlimitedOrPositive()
  maximumPerOperationValidated: number;

  @ApiProperty({
    description: 'Máximo validado por operación nocturna (-1 = ilimitado)',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsUnlimitedOrPositive()
  maximumPerOperationAtNightValidated: number;

  @ApiProperty({ description: 'Máximo por mes (-1 = ilimitado)' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsUnlimitedOrPositive()
  maximumPerMonth: number;

  @ApiProperty({ description: 'Máximo validado por mes (-1 = ilimitado)' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsUnlimitedOrPositive()
  maximumPerMonthValidated: number;
}
