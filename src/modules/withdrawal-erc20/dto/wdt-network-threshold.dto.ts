import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateWdtNetworkThresholdDto {
  @IsUUID()
  network_id!: string; // uuid de wdt_network

  @IsString()
  min_native_balance_for_approve!: string; // decimal string (ej. '0.003')
}

export class UpdateWdtNetworkThresholdDto {
  @IsOptional()
  @IsUUID()
  network_id?: string; // si permites moverlo (no recomendado)

  @IsOptional()
  @IsString()
  min_native_balance_for_approve?: string;

  @IsOptional()
  @IsString()
  min_native_balance_for_withdraw?: string;
}

export class WdtNetworkThresholdFilterDto {
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
  orderBy?: 'created_at' | 'updated_at' = 'created_at';

  @IsOptional()
  order?: 'ASC' | 'DESC' = 'DESC';

  // filtros
  @IsOptional()
  @IsUUID()
  network_id?: string;
}
