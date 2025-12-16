import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class GetWithdrawNativeFeeDto {
  @ApiProperty({
    example: '0.01',
  })
  @IsNumber()
  @IsOptional()
  amount: number;

  @ApiProperty({
    example: 'UUID',
  })
  @IsString()
  @MinLength(3)
  @IsNotEmpty()
  walletId: string;
}
