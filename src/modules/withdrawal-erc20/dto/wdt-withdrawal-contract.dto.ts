import {
  IsBoolean,
  IsOptional,
  IsInt,
  Min,
  IsString,
  IsEthereumAddress,
  IsUUID,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateWdtWithdrawalContractDto {
  @IsUUID()
  network_id!: string;

  @IsString()
  contract_address!: string; // se normaliza a lowercase

  @IsOptional()
  @IsString()
  version?: string; // ej. 'v1.2.0'

  @IsOptional()
  @IsBoolean()
  is_active?: boolean = true; // si true, se desactivan otros de la misma red
}

export class UpdateWdtWithdrawalContractDto {
  @IsOptional()
  @IsUUID()
  network_id?: string;

  @IsOptional()
  @IsString()
  contract_address?: string; // lowercase

  @IsOptional()
  @IsString()
  version?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean; // si pasa a true, se desactivan otros
}

export class WdtWithdrawalContractFilterDto {
  // paginación
  @IsOptional() page?: number = 1;
  @IsOptional() limit?: number = 10;

  // orden
  @IsOptional() orderBy?: 'created_at' | 'updated_at' | 'version' =
    'created_at';
  @IsOptional() order?: 'ASC' | 'DESC' = 'DESC';

  // filtros
  @IsOptional() @IsUUID() network_id?: string;
  @IsOptional() @IsBoolean() is_active?: boolean;
  @IsOptional() @IsString() version?: string;
  @IsOptional() @IsString() contract_address?: string;

  // búsqueda libre
  @IsOptional() @IsString() q?: string; // busca por contract_address / version
}

export class DeployContractDto {
  @Transform(({ value }) =>
    value === '' || value == null ? 0 : parseInt(value, 10),
  )
  @IsInt()
  @Min(0)
  indexDeployer!: number; // 👈 obligatorio, default 0 si no viene

  @IsString()
  rpcUrl!: string;

  @IsString()
  mnemonic!: string;

  @IsEthereumAddress()
  admin!: string;

  @IsString() // puede ser 0x0 si no quieres operador inicial
  operator!: string;
}
