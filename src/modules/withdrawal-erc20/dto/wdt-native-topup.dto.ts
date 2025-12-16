import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { TxStatus } from '../enums/tx-status.enum';

export class CreateWdtNativeTopupDto {
  @IsString()
  @IsNotEmpty()
  to_address!: string; // se normaliza a lowercase

  @IsString()
  @IsNotEmpty()
  network_id!: string; // uuid

  @IsString()
  @IsNotEmpty()
  amount_native!: string; // decimal string (ej. '0.005')

  @IsString()
  @IsNotEmpty()
  funding_source_address!: string; // hot wallet/treasury (lowercase)

  @IsString()
  @IsNotEmpty()
  tx_hash!: string; // único por top-up

  @IsOptional()
  @IsEnum(TxStatus)
  status?: TxStatus = TxStatus.PENDING;

  @IsOptional()
  @IsString()
  block_number?: string; // bigint as string

  @IsOptional()
  confirmed_at?: Date;
}

export class UpdateWdtNativeTopupDto {
  @IsOptional() @IsString() to_address?: string;
  @IsOptional() @IsString() network_id?: string;
  @IsOptional() @IsString() amount_native?: string;
  @IsOptional() @IsString() funding_source_address?: string;
  @IsOptional() @IsString() tx_hash?: string;

  @IsOptional()
  @IsEnum(TxStatus)
  status?: TxStatus;

  @IsOptional()
  @IsString()
  block_number?: string;

  @IsOptional()
  confirmed_at?: Date;
}

export class WdtNativeTopupFilterDto {
  // paginación
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number = 10;

  // orden
  @IsOptional()
  @IsString()
  orderBy?: 'created_at' | 'updated_at' | 'block_number' = 'created_at';

  @IsOptional()
  @IsString()
  order?: 'ASC' | 'DESC' = 'DESC';

  // filtros
  @IsOptional() @IsString() network_id?: string;
  @IsOptional() @IsString() to_address?: string;
  @IsOptional() @IsString() funding_source_address?: string;
  @IsOptional() @IsString() tx_hash?: string;
  @IsOptional() @IsEnum(TxStatus) status?: TxStatus;

  // búsqueda libre
  @IsOptional()
  @IsString()
  q?: string; // busca por to_address / funding_source_address / tx_hash
}
