import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateWdtWithdrawalAuditLogDto {
  @IsOptional()
  @IsUUID()
  withdrawal_request_id?: string;

  @IsString()
  topic!: string; // p.ej. 'STATE_CHANGE' | 'RPC_CALL' | ...

  @IsString()
  message!: string; // JSON/text (string)
}

export class WdtWithdrawalAuditLogFilterDto {
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
  orderBy?: 'created_at' = 'created_at';

  @IsOptional()
  order?: 'ASC' | 'DESC' = 'DESC';

  // filtros
  @IsOptional()
  @IsUUID()
  withdrawal_request_id?: string;

  @IsOptional()
  @IsString()
  topic?: string;

  // rango por fecha (ISO strings)
  @IsOptional()
  @IsString()
  created_from?: string; // '2025-10-16T00:00:00Z'

  @IsOptional()
  @IsString()
  created_to?: string;

  // búsqueda libre
  @IsOptional()
  @IsString()
  q?: string; // busca en topic y message
}
