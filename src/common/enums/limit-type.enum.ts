export enum SystemOperation {
  DEPOSIT = 'DEPOSIT',
  WITHDRAW = 'WITHDRAW',
  EXCHANGE = 'EXCHANGE',
  SALE = 'SALE',
  PAYMENT = 'PAYMENT',
}

export enum LimitCurrencyCode {
  USD = 'USD',
  BRL = 'BRL',
  EUR = 'EUR',
  ARS = 'ARS',
}

export const LIMITS_ORDERABLE_FIELDS = [
  'createdAt',
  'updatedAt',
  'operation',
  'currencyCode',
] as const;

export type LimitsOrderableField = (typeof LIMITS_ORDERABLE_FIELDS)[number];
