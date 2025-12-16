/* eslint-disable @typescript-eslint/no-unsafe-return */
import { FeeType } from '@/common/enums/fees-enum';
import { SystemOperation } from '@/common/enums/limit-type.enum';
import { Transform, Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';

const FEES_ORDERABLE_FIELDS = ['createdAt', 'updatedAt', 'operation'] as const;
export type FeesOrderableField = (typeof FEES_ORDERABLE_FIELDS)[number];

export class FeesFilterDto {
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  limit: number = 10;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'all') return undefined;
    if (Array.isArray(value)) return value;
    return [value];
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsEnum(SystemOperation, { each: true })
  operation?: SystemOperation[];

  @IsOptional()
  @Transform(({ value }: { value: string }) =>
    value === '' ? undefined : value,
  )
  @IsUUID()
  currencyId?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'all') return undefined;
    if (Array.isArray(value)) return value;
    return [value];
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsEnum(FeeType, { each: true })
  type?: FeeType[];

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  @Transform(({ value }: { value: string }) =>
    value === '' ? undefined : value,
  )
  order?: 'ASC' | 'DESC';

  @IsOptional()
  @IsIn(FEES_ORDERABLE_FIELDS)
  @Transform(({ value }: { value: string }) =>
    value === '' ? undefined : value,
  )
  orderBy?: FeesOrderableField;
}
