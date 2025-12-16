/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  KYC_ORDERABLE_FIELDS,
  KycOrderableField,
  KycStatusEnum,
  KycTypeEnum,
} from '@/common/enums/kyc-type-enum';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class KycFilterDto {
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @Min(0)
  limit: number = 10;

  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;
    // Permitir diferentes formatos ISO o YYYY-MM-DD
    const date = new Date(value);
    return isNaN(date.getTime()) ? undefined : date;
  })
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;
    const date = new Date(value);
    return isNaN(date.getTime()) ? undefined : date;
  })
  @Type(() => Date)
  @IsDate()
  to?: Date;

  @IsOptional()
  @IsEnum(KycStatusEnum)
  @Transform(({ value }: { value: string }) =>
    value === '' ? undefined : value,
  )
  status?: KycStatusEnum;

  @IsOptional()
  @IsEnum(KycTypeEnum)
  @Transform(({ value }: { value: string }) =>
    value === '' ? undefined : value,
  )
  type?: KycTypeEnum;

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  @Transform(({ value }: { value: string }) =>
    value === '' ? undefined : value,
  )
  order?: 'ASC' | 'DESC';

  @IsOptional()
  @IsIn(KYC_ORDERABLE_FIELDS)
  @Transform(({ value }: { value: string }) =>
    value === '' ? undefined : value,
  )
  orderBy?: KycOrderableField;

  @ApiPropertyOptional({
    description: 'Search by composer (ILIKE %term%)',
  })
  @IsOptional()
  @IsString()
  composerSearch?: string;

  @ApiPropertyOptional({
    description: 'Filter by user email (ILIKE %email%)',
  })
  @IsOptional()
  @IsString()
  email?: string;
}
