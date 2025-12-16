import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

export class CreateWdtAssetDto {
  @IsString()
  @IsNotEmpty()
  network_id!: string; // uuid

  @IsString()
  @IsNotEmpty()
  @Length(1, 32)
  symbol!: string; // será uppercased

  @IsString()
  @IsNotEmpty()
  @Length(1, 128)
  name!: string;

  @IsString()
  @IsNotEmpty()
  contract_address!: string; // será lowercased

  @IsInt()
  @Min(0)
  @Max(36)
  decimals!: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean = true;
}

export class UpdateWdtAssetDto {
  @IsOptional() @IsString() network_id?: string;
  @IsOptional() @IsString() @Length(1, 32) symbol?: string;
  @IsOptional() @IsString() @Length(1, 128) name?: string;
  @IsOptional() @IsString() contract_address?: string; // requerido si se envía (no null)
  @IsOptional() @IsInt() @Min(0) @Max(36) decimals?: number;
  @IsOptional() @IsBoolean() is_active?: boolean;
}

export class WdtAssetFilterDto {
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
  orderBy?: 'created_at' | 'updated_at' | 'symbol' | 'name' = 'created_at';

  @IsOptional()
  @IsString()
  order?: 'ASC' | 'DESC' = 'DESC';

  // filtros
  @IsOptional() @IsString() network_id?: string;
  @IsOptional() @IsBoolean() is_active?: boolean;
  @IsOptional() @IsString() symbol?: string;
  @IsOptional() @IsString() contract_address?: string;

  // búsqueda libre
  @IsOptional()
  @IsString()
  q?: string; // busca por symbol/name/contract_address
}
