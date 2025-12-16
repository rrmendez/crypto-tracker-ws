import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class RequestWithdrawDto {
  @ApiProperty({
    example: '0x1234567890123456789012345678901234567890',
  })
  @IsString()
  @MinLength(6)
  @IsNotEmpty()
  to: string;

  @ApiProperty({
    example: '0.01',
  })
  @IsNumber()
  @IsNotEmpty()
  @Min(0.00000001)
  amount: number;

  @ApiProperty({
    example: 'ETH',
  })
  @IsString()
  @MinLength(3)
  @IsNotEmpty()
  walletId: string;

  @ApiProperty({
    example: '000000',
  })
  @IsOptional()
  secondFactorCode?: string;
}
