import { TxStatus } from '../enums/tx-status.enum';
export class CreateWdtAllowanceApprovalDto {
  owner_address!: string; // EOA (from)
  token_asset_id!: string; // uuid Asset (ERC20)
  spender_contract_id!: string; // uuid WithdrawalContract
  intended_amount!: string; // decimal string (p.ej. MaxUint256 en decimal)
  tx_hash!: string;
}

export class UpdateWdtAllowanceApprovalDto {
  owner_address?: string;
  token_asset_id?: string;
  spender_contract_id?: string;
  intended_amount?: string;
  tx_hash?: string;
  status?: TxStatus;
  block_number?: string;
  confirmed_at?: Date;
}

export class WdtAllowanceApprovalFilterDto {
  // paginación
  page?: number = 1;
  limit?: number = 10;

  // orden
  orderBy?: 'created_at' | 'updated_at' | 'block_number' = 'created_at';
  order?: 'ASC' | 'DESC' = 'DESC';

  // filtros
  owner_address?: string;
  token_asset_id?: string;
  spender_contract_id?: string;
  tx_hash?: string;
  status?: TxStatus;

  // búsqueda libre (owner/tx)
  q?: string;
}
