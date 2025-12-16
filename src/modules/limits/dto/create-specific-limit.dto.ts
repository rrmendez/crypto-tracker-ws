import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsUUID } from 'class-validator';
import { IsUnlimitedOrPositive } from '@/common/decorators/is-ulimited-or-positive.decorator';

export class CreateSpecificLimitDto {
  @ApiProperty({ description: 'Id del usuario', required: true })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'Id del Límite general' })
  @IsUUID()
  limitId: string;

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
