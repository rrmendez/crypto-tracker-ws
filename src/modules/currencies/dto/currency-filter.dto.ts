import {
  CURRENCIES_ORDERABLE_FIELDS,
  CurrenciesOrderableField,
} from '@/common/enums/currency-type.enum';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBooleanString,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
} from 'class-validator';

export class CurrencyFilterDto {
  @ApiPropertyOptional({
    description: 'Filter by created date (ISO date or date-time)',
  })
  @IsOptional()
  @IsDateString()
  from?: Date;

  @ApiPropertyOptional({
    description: 'Filter by created date (ISO date or date-time)',
  })
  @IsOptional()
  @IsDateString()
  to?: Date;

  @ApiPropertyOptional({ description: 'Search by code (ILIKE %term%)' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ description: 'Search by name (ILIKE %term%)' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Filter by active state' })
  @IsOptional()
  @IsBooleanString()
  isActive?: boolean;

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  @Transform(({ value }: { value: string }) =>
    value === '' ? undefined : value,
  )
  order?: 'ASC' | 'DESC';

  @IsOptional()
  @IsIn(CURRENCIES_ORDERABLE_FIELDS)
  @Transform(({ value }: { value: string }) =>
    value === '' ? undefined : value,
  )
  orderBy?: CurrenciesOrderableField;

  @ApiPropertyOptional({
    description: 'Search by composer (ILIKE %term%)',
  })
  @IsOptional()
  @IsString()
  composerSearch?: string;
}
