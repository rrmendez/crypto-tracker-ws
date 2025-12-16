/* eslint-disable @typescript-eslint/no-unsafe-return */
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsIn,
  IsBoolean,
} from 'class-validator';
import { CountryEnum } from '@/common/enums/country-enum';
import { RoleEnum } from '@/common/enums/role.enum';
import { Transform } from 'class-transformer';
import {
  CLIENT_ORDERABLE_FIELDS,
  ClientOrderableField,
} from '@/common/enums/client-type.enum';
import { KycStatusEnum } from '@/common/enums/kyc-type-enum';

export class ClientsFilterDto {
  @ApiPropertyOptional({
    description: 'Filter by created date (ISO date or date-time)',
  })
  @IsOptional()
  @IsDateString()
  createdAt?: Date;

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

  @ApiPropertyOptional({ description: 'Search by full name (ILIKE %term%)' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ description: 'Search by email (ILIKE %term%)' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({
    enum: CountryEnum,
    description: 'Filter by country code from active address',
  })
  @IsOptional()
  @IsEnum(CountryEnum)
  countryCode?: CountryEnum;

  @ApiPropertyOptional({
    isArray: true,
    enum: [RoleEnum.USER, RoleEnum.MERCHANT],
    description: 'Filter by roles (only USER and MERCHANT allowed)',
  })
  @Transform(({ value }) => {
    if (!value) return undefined;
    if (Array.isArray(value)) return value;
    return (value as string).split(',');
  })
  @IsOptional()
  @IsArray()
  @IsIn([RoleEnum.USER, RoleEnum.MERCHANT], { each: true })
  roles?: RoleEnum[];

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  @Transform(({ value }: { value: string }) =>
    value === '' ? undefined : value,
  )
  order?: 'ASC' | 'DESC';

  @IsOptional()
  @IsIn(CLIENT_ORDERABLE_FIELDS)
  @Transform(({ value }: { value: string }) =>
    value === '' ? undefined : value,
  )
  orderBy?: ClientOrderableField;

  @ApiPropertyOptional({
    description: 'Search by composer (ILIKE %term%)',
  })
  @IsOptional()
  @IsString()
  composerSearch?: string;

  @ApiPropertyOptional({
    description: 'Filter by verified status',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  verified?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by blocked status',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isBlocked?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by withdraw blocked status',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  withdrawBlocked?: boolean;

  @ApiPropertyOptional({
    enum: KycStatusEnum,
    description: 'Filter by compliance KYC status',
  })
  @IsOptional()
  @IsEnum(KycStatusEnum)
  complianceKycStatus?: KycStatusEnum;
}
