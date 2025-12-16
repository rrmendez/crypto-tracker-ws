import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateCurrencyDto {
  @IsString()
  @IsNotEmpty()
  configId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @IsNotEmpty()
  @Min(0, { always: true })
  @Max(18, { always: true })
  decimals: number;

  @IsString()
  @IsOptional()
  symbol?: string;

  @IsString()
  @IsOptional()
  logo?: string;

  @IsNumber()
  @Transform(({ value }) => (value ? Number(value) : null))
  @IsPositive({ message: 'Price must be a positive number' })
  @IsOptional()
  price?: number | null;
}
