import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  Max,
  Min,
} from 'class-validator';

export class CreateWdtNetworkDto {
  @IsInt()
  chain_id: number;

  @IsString()
  name: string;

  @IsString()
  native_symbol: string;

  @IsUrl()
  rpc_url: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean = true;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(64)
  min_confirmations?: number = 3;
}

export class UpdateWdtNetworkDto {
  @IsOptional()
  @IsInt()
  chain_id?: number;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  native_symbol?: string;

  @IsOptional()
  @IsUrl()
  rpc_url?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(64)
  min_confirmations?: number;
}

export class WdtNetworkFilterDto {
  // paginación
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  // orden
  @IsOptional()
  @IsString()
  orderBy?: 'created_at' | 'updated_at' | 'chain_id' | 'name' = 'created_at';

  @IsOptional()
  @IsString()
  order?: 'ASC' | 'DESC' = 'DESC';

  // filtros
  @IsOptional()
  @IsInt()
  chain_id?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsString()
  q?: string; // búsqueda por nombre/símbolo
}
