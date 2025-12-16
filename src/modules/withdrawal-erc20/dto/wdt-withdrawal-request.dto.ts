import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateIf,
} from 'class-validator';
import { WithdrawalStatus } from '../enums/withdrawal-status.enum';

export class CreateWdtWithdrawalRequestDto {
  // ---- entrada del front ----
  @IsString() from!: string; // owner_address (lowercase)
  @IsString() to!: string; // destino final (lowercase)
  @IsString() amount!: string; // decimal string
  @IsOptional() @IsString() addressFee?: string; // lowercase
  @ValidateIf((o) => o.addressFee !== undefined)
  @IsString()
  amountFee?: string; // decimal string (si addressFee existe)
  @IsInt() chain_id!: number;

  // ---- idempotencia opcional ----
  @IsOptional()
  @IsString()
  client_request_id?: string;

  // ---- campos resueltos por el módulo ----
  @IsOptional()
  @IsUUID()
  network_id?: string;

  @IsOptional()
  @IsUUID()
  asset_id?: string;

  // Estado inicial (opcional, por defecto CREATED)
  @IsOptional()
  @IsEnum(WithdrawalStatus)
  status?: WithdrawalStatus = WithdrawalStatus.CREATED;
}

export class UpdateWdtWithdrawalRequestDto {
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
  @IsOptional() @IsString() amount?: string;
  @IsOptional() @IsString() addressFee?: string;
  @IsOptional() @IsString() amountFee?: string;
  @IsOptional() @IsInt() chain_id?: number;

  @IsOptional() @IsUUID() network_id?: string;
  @IsOptional() @IsUUID() asset_id?: string;

  @IsOptional() @IsEnum(WithdrawalStatus) status?: WithdrawalStatus;

  @IsOptional() @IsString() client_request_id?: string;
}

export class WdtWithdrawalRequestFilterDto {
  // paginación
  @IsOptional() @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @IsInt() @Min(1) limit?: number = 10;

  // orden
  @IsOptional() orderBy?: 'created_at' | 'updated_at' = 'created_at';
  @IsOptional() order?: 'ASC' | 'DESC' = 'DESC';

  // filtros
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
  @IsOptional() @IsInt() chain_id?: number;
  @IsOptional() @IsUUID() network_id?: string;
  @IsOptional() @IsUUID() asset_id?: string;
  @IsOptional() @IsEnum(WithdrawalStatus) status?: WithdrawalStatus;
  @IsOptional() @IsString() client_request_id?: string;

  // búsqueda libre
  @IsOptional() @IsString() q?: string; // busca en from / to
}
