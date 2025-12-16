import { SystemOperation } from '@/common/enums/limit-type.enum';
import { TransactionType } from '@/common/enums/transaction-type.enum';

/**
 * Mapea SystemOperation a TransactionType
 * Útil para consultas de transacciones basadas en operaciones de límites
 */
export const OPERATION_TO_TRANSACTION_TYPE_MAP: Record<
  SystemOperation,
  TransactionType
> = {
  [SystemOperation.DEPOSIT]: TransactionType.DEPOSIT,
  [SystemOperation.WITHDRAW]: TransactionType.WITHDRAW,
  [SystemOperation.EXCHANGE]: TransactionType.EXCHANGE,
  [SystemOperation.SALE]: TransactionType.SALE,
  [SystemOperation.PAYMENT]: TransactionType.PAYMENT,
};

/**
 * Convierte un SystemOperation a TransactionType
 * @param operation SystemOperation a convertir
 * @returns TransactionType correspondiente
 */
export function mapOperationToTransactionType(
  operation: SystemOperation,
): TransactionType {
  return OPERATION_TO_TRANSACTION_TYPE_MAP[operation];
}
