export enum TransactionType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAW = 'WITHDRAW',
  EXCHANGE = 'EXCHANGE',
  SALE = 'SALE',
  PAYMENT = 'PAYMENT',
}

export const TRANSACTIONS_ORDERABLE_FIELDS = [
  'createdAt',
  'updatedAt',
  'type',
  'symbol',
  'status',
  'currencyCode',
] as const;

export type TransactionsOrderableField =
  (typeof TRANSACTIONS_ORDERABLE_FIELDS)[number];
