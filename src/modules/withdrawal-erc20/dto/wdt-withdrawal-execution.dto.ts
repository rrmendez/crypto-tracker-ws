import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { TxStatus } from '../enums/tx-status.enum';

export class CreateWdtWithdrawalExecutionDto {
  @IsUUID()
  withdrawal_request_id!: string;

  @IsUUID()
  withdrawal_contract_id!: string;

  @IsString()
  spender_address_snapshot!: string; // lowercase

  @IsString()
  amount_sent!: string; // decimal string

  @IsOptional()
  @IsString()
  fee_applied?: string; // decimal string

  @IsString()
  tx_hash!: string;

  @IsOptional()
  @IsEnum(TxStatus)
  status?: TxStatus = TxStatus.PENDING;

  @IsOptional()
  @IsString()
  block_number?: string; // bigint as string

  @IsOptional()
  confirmed_at?: Date;
}

export class UpdateWdtWithdrawalExecutionDto {
  @IsOptional()
  @IsUUID()
  withdrawal_request_id?: string;

  @IsOptional()
  @IsUUID()
  withdrawal_contract_id?: string;

  @IsOptional()
  @IsString()
  spender_address_snapshot?: string;

  @IsOptional()
  @IsString()
  amount_sent?: string;

  @IsOptional()
  @IsString()
  fee_applied?: string;

  @IsOptional()
  @IsString()
  tx_hash?: string;

  @IsOptional()
  @IsEnum(TxStatus)
  status?: TxStatus;

  @IsOptional()
  @IsString()
  block_number?: string;

  @IsOptional()
  confirmed_at?: Date;
}

export class WdtWithdrawalExecutionFilterDto {
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
  orderBy?: 'created_at' | 'updated_at' | 'block_number' = 'created_at';

  @IsOptional()
  order?: 'ASC' | 'DESC' = 'DESC';

  // filtros
  @IsOptional()
  @IsUUID()
  withdrawal_request_id?: string;

  @IsOptional()
  @IsUUID()
  withdrawal_contract_id?: string;

  @IsOptional()
  @IsString()
  tx_hash?: string;

  @IsOptional()
  @IsEnum(TxStatus)
  status?: TxStatus;

  // búsqueda libre
  @IsOptional()
  @IsString()
  q?: string; // busca en tx_hash / spender_address_snapshot
}
