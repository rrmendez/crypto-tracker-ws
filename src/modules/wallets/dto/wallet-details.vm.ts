import { Currency } from '@/modules/currencies/entities/currency.entity';
import { Card } from '../entities/card.entity';
import { Wallet } from '../entities/wallet.entity';
import Decimal from 'decimal.js';

export class WalletDetailsVm {
  id: string;
  address?: string;
  balance: string;
  isDefault: boolean;
  currency: Currency;
  card?: Card;
  income?: string;
  expense?: string;

  constructor(
    wallet: Wallet,
    income: decimal.Decimal,
    expense: decimal.Decimal,
  ) {
    this.id = wallet.id;
    this.address = wallet.address;
    this.balance = wallet.balance;
    this.isDefault = wallet.isDefault;
    this.currency = wallet.currency;
    this.card = wallet.card;

    if (income && wallet.currency) {
      this.income = rountAmount(income, wallet.currency);
    }

    if (expense && wallet.currency) {
      this.expense = rountAmount(expense, wallet.currency);
    }
  }
}

// --------------------------------------------------------------------------------

const rountAmount = (amount: decimal.Decimal, currency: Currency) => {
  const decimalPlaces = currency.decimals;
  return new Decimal(amount)
    .toDecimalPlaces(decimalPlaces)
    .toFixed(decimalPlaces);
};
