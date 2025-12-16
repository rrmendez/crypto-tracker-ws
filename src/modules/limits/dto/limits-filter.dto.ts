import {
  LimitCurrencyCode,
  LIMITS_ORDERABLE_FIELDS,
  LimitsOrderableField,
  SystemOperation,
} from '@/common/enums/limit-type.enum';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsIn, IsOptional, Min } from 'class-validator';

export class LimitsFilterDto {
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @Min(0)
  limit: number = 10;

  @IsOptional()
  @IsEnum(SystemOperation)
  @Transform(({ value }: { value: string }) =>
    value === '' ? undefined : value,
  )
  operation?: SystemOperation;

  @IsOptional()
  @IsEnum(LimitCurrencyCode)
  @Transform(({ value }: { value: string }) =>
    value === '' ? undefined : value,
  )
  currencyCode?: LimitCurrencyCode;

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  @Transform(({ value }: { value: string }) =>
    value === '' ? undefined : value,
  )
  order?: 'ASC' | 'DESC';

  @IsOptional()
  @IsIn(LIMITS_ORDERABLE_FIELDS)
  @Transform(({ value }: { value: string }) =>
    value === '' ? undefined : value,
  )
  orderBy?: LimitsOrderableField;
}
