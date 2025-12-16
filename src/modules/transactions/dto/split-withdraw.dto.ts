import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  ArrayMinSize,
  ValidateNested,
  IsString,
  MinLength,
  IsOptional,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SplitOutputDto {
  @ApiProperty({ example: '0x1234567890123456789012345678901234567890' })
  @IsString()
  @MinLength(6)
  to: string;

  @ApiProperty({ example: '0.01' })
  @IsString()
  amount: string;
}

export class SplitWithdrawDto {
  @ApiProperty({ example: '74059610-3e6a-4e0c-81d5-06d0eb012838' })
  @IsString()
  @MinLength(3)
  walletId: string;

  @ApiProperty({ type: [SplitOutputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SplitOutputDto)
  outputs: SplitOutputDto[];

  @ApiProperty({
    example: 0,
    required: false,
    description: 'LP derivation index (for tokens). Defaults to 0.',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  liquidityAddressIndex?: number;

  @ApiProperty({
    required: false,
    description:
      'Use allowance and transferFrom for tokens (from user address)',
  })
  @IsOptional()
  useAllowanceFromAddress?: boolean;
}
