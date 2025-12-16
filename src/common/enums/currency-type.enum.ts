export enum CurrencyTypeEnum {
  FIAT = 'FIAT',
  VIRTUAL = 'VIRTUAL',
  CRYPTO = 'CRYPTO',
}

export const CURRENCIES_ORDERABLE_FIELDS = [
  'createdAt',
  'code',
  'name',
  'type',
  'decimals',
  'isActive',
] as const;

export type CurrenciesOrderableField =
  (typeof CURRENCIES_ORDERABLE_FIELDS)[number];

export interface CurrencyPrice {
  tokenName?: string;
  tokenSymbol?: string;
  tokenLogo?: string;
  tokenDecimals?: string;
  nativePrice?: {
    value: string;
    decimals: number;
    name: string;
    symbol: string;
    address: string;
  };
  usdPrice: number;
  usdPriceFormatted?: string;
  '24hrPercentChange'?: string;
  usdPrice24hr?: string;
  exchangeAddress?: string;
  exchangeName?: string;
  tokenAddress?: string;
  toBlock?: string;
  verifiedContract?: boolean;
  usdPrice24hrUsdChange?: string;
  usdPrice24hrPercentChange?: string;
}
