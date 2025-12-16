/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { TransactionStatus } from '@/common/enums/transaction-status.enum';
import { TransactionSymbol } from '@/common/enums/transaction-symbol.enum';
import {
  TRANSACTIONS_ORDERABLE_FIELDS,
  TransactionsOrderableField,
  TransactionType,
} from '@/common/enums/transaction-type.enum';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsNumberString,
  IsArray,
  ArrayNotEmpty,
  ArrayUnique,
  IsUUID,
  IsString,
  IsBoolean,
  IsDate,
  IsIn,
} from 'class-validator';

export class TransactionsQueryDto {
  @IsNumberString()
  @IsOptional()
  page?: string;

  @IsNumberString()
  @IsOptional()
  limit?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'all') return undefined;
    if (Array.isArray(value)) return value;
    return [value]; // Si es solo uno, lo convierte en array
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsEnum(TransactionType, { each: true })
  types?: TransactionType[];

  @IsOptional()
  @IsUUID()
  walletId?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsEnum(TransactionSymbol)
  symbol?: TransactionSymbol;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  showExtras?: boolean;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'all') return undefined;
    if (Array.isArray(value)) return value;
    return [value];
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsEnum(TransactionStatus, { each: true })
  status?: TransactionStatus[];

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'all') return undefined;
    if (Array.isArray(value)) return value;
    return [value]; // convierte string en array
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  currencyCode?: string[];

  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;
    // Permitir diferentes formatos ISO o YYYY-MM-DD
    const date = new Date(value);
    return isNaN(date.getTime()) ? undefined : date;
  })
  @Type(() => Date)
  @IsDate()
  createdAtFrom?: Date;

  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;
    const date = new Date(value);
    return isNaN(date.getTime()) ? undefined : date;
  })
  @Type(() => Date)
  @IsDate()
  createdAtTo?: Date;

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  @Transform(({ value }: { value: string }) =>
    value === '' ? undefined : value,
  )
  order?: 'ASC' | 'DESC';

  @IsOptional()
  @IsIn(TRANSACTIONS_ORDERABLE_FIELDS)
  @Transform(({ value }: { value: string }) =>
    value === '' ? undefined : value,
  )
  orderBy?: TransactionsOrderableField;
}
