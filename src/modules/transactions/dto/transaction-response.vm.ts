import { Currency } from '@/modules/currencies/entities/currency.entity';
import { Transaction } from '../entities/transaction.entity';

export class TransactionResponseVm {
  id: string;
  type: string;
  walletId: string;
  status: string;
  txHash: string;
  fromAddress: string;
  toAddress: string;
  amount: string;
  symbol: string;
  creditedAmount?: string;
  fee?: string;
  price?: number;
  withdrawAmount?: string;
  currencyCode: string;
  extras?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;

  currency?: Partial<Currency>;

  user?: {
    id?: string;
    email?: string;
    fullName?: string;
  };

  constructor(transaction: Transaction, showExtras: boolean = false) {
    this.id = transaction.id;
    this.type = transaction.type;
    this.walletId = transaction.wallet.id;
    this.status = transaction.status;
    this.txHash = transaction.txHash;
    this.fromAddress = transaction.fromAddress;
    this.toAddress = transaction.toAddress;
    this.amount = transaction.amount;
    this.creditedAmount = transaction.creditedAmount;
    this.fee = transaction.fee;
    this.price = transaction.price;
    this.withdrawAmount = transaction.withdrawAmount;
    this.symbol = transaction.symbol;
    this.currencyCode = transaction.currencyCode;
    this.extras = showExtras ? transaction.extras : undefined;
    this.createdAt = transaction.createdAt;
    this.updatedAt = transaction.updatedAt;

    this.currency = transaction.wallet.currency
      ? {
          code: transaction.wallet.currency.code,
          name: transaction.wallet.currency.name,
          type: transaction.wallet.currency.type,
          logo: transaction.wallet.currency.logo,
          symbol: transaction.wallet.currency.symbol,
          decimals: transaction.wallet.currency.decimals,
          isToken: transaction.wallet.currency.isToken,
          network: transaction.wallet.currency.network,
          chainId: transaction.wallet.currency.chainId,
          smartContractAddress:
            transaction.wallet.currency.smartContractAddress,
          explorerUrl: transaction.wallet.currency.explorerUrl,
        }
      : undefined;

    this.user = transaction.wallet.user
      ? {
          id: transaction.wallet.user.id,
          email: transaction.wallet.user.email,
          fullName: transaction.wallet.user.fullName,
        }
      : undefined;
  }
}
