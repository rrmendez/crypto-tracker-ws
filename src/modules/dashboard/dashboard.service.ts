import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HdWalletUtils } from '@/common/utils/hd-wallet.utils';
import { CurrenciesService } from '../currencies/currencies.service';
import { NotFoundException } from '@/common/exceptions';
import { UsersService } from '../users/users.service';
import { TransactionsService } from '../transactions/transactions.service';
import { TransactionStatus } from '@/common/enums/transaction-status.enum';

@Injectable()
export class DashboardService {
  constructor(
    private readonly configService: ConfigService,
    private readonly hdWalletUtils: HdWalletUtils,
    private readonly currenciesService: CurrenciesService,
    private readonly usersService: UsersService,
    private readonly transactionsService: TransactionsService,
  ) {}

  async findAdminWallets() {
    const gasAddressIndex = this.configService.get<number>(
      'ERC20_GAS_PROVIDER_INDEX',
      0,
    );
    const feeAddressIndex = this.configService.get<number>(
      'ERC20_FEE_ADDRESS_INDEX',
      0,
    );
    const exchangeAddressIndex = this.configService.get<number>(
      'ERC20_EXCHANGE_INDEX',
      0,
    );

    const mnemonic = this.configService.getOrThrow<string>('BNB_MNEMONIC');

    const gasAddress = this.hdWalletUtils.getAddressFromIndex(
      mnemonic,
      gasAddressIndex,
    );
    const feeAddress = this.hdWalletUtils.getAddressFromIndex(
      mnemonic,
      feeAddressIndex,
    );
    const exchangeAddress = this.hdWalletUtils.getAddressFromIndex(
      mnemonic,
      exchangeAddressIndex,
    );

    const result = [
      {
        address: gasAddress,
        name: 'Gas Provider',
        balances: await this.getWalletBalances(gasAddress, true),
      },
      {
        address: feeAddress,
        name: 'Fee Address',
        balances: await this.getWalletBalances(feeAddress),
      },
      {
        address: exchangeAddress,
        name: 'Exchange Address',
        balances: await this.getWalletBalances(exchangeAddress),
      },
    ];

    return result;
  }

  async findClientsCount() {
    return this.usersService.countClientsByRole();
  }

  async getTotalBalanceForCurrency() {
    return this.currenciesService.getTotalBalanceForCurrency();
  }

  async getTotalTransactionsAmount(status?: TransactionStatus) {
    return this.transactionsService.getTotalTransactionsAmount(status);
  }

  /******************************************************************************/
  /******************   Auxiliary methods for Dashboard   ***********************/
  /******************************************************************************/

  async getWalletBalances(address: string, onlyNative: boolean = false) {
    const currencies = await this.currenciesService.findAll();

    const activeCurrencies = currencies.filter((c) => c.isActive);

    if (!activeCurrencies.length) {
      throw new NotFoundException({
        errorCode: 'CURRENCY_NOT_FOUND',
        i18nKey: 'errors.currency.notFound',
      });
    }

    const prices = await this.currenciesService.getLatestPrices();

    const balances = [];

    for (const currency of activeCurrencies) {
      if (onlyNative && currency.smartContractAddress !== 'main') {
        continue;
      }

      const usdPrice = prices.find(
        (p) => p.currencyId === currency.id,
      )?.usdPrice;

      const balance = await this.hdWalletUtils.getBalance(address, currency);
      balances.push({
        currency: {
          id: currency.id,
          code: currency.code,
          name: currency.name,
          price: currency.price,
          usdPrice: usdPrice,
          decimals: currency.decimals,
          chainId: currency.chainId,
          network: currency.network,
          networkCode: currency.networkCode,
          smartContractAddress: currency.smartContractAddress,
          explorerUrl: currency.explorerUrl,
        },
        balance,
      });
    }

    return balances;
  }
}
