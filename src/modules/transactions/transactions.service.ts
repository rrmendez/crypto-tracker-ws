/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { REPOSITORY } from '@/database/constants';
import {
  Between,
  EntityManager,
  FindOptionsOrder,
  FindOptionsWhere,
  In,
  LessThanOrEqual,
  Like,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { Wallet } from '../wallets/entities/wallet.entity';
import Decimal from 'decimal.js';
import { ConfigService } from '@nestjs/config';
import { Transaction } from './entities/transaction.entity';
import { TransactionReceipt } from 'ethers';
import { TransactionSymbol } from '@/common/enums/transaction-symbol.enum';
import { TransactionStatus } from '@/common/enums/transaction-status.enum';
import { MoralisWebhookDto } from './dto/moralis-webhook.dto';
import { TransactionType } from '@/common/enums/transaction-type.enum';
import { TransactionsQueryDto } from './dto/transactions-query.dto';
import { UsersService } from '../users/users.service';
import { LimitsService } from '../limits/limits.service';
import { SystemOperation } from '@/common/enums/limit-type.enum';
import { FeesService } from '../fees/fees.service';
import { FeeType } from '@/common/enums/fees-enum';
import { CurrenciesService } from '../currencies/currencies.service';
import { cryptoCurrencies } from '@/config/currency.config';
import { BadRequestException as BadRequestError } from '@/common/exceptions';
import { HdWalletUtils } from '@/common/utils/hd-wallet.utils';
import GetWithdrawNativeFeeResponseVm from './dto/get-withdraw-native-fee-response.vm';
import { Currency } from '../currencies/entities/currency.entity';
import { WalletType } from '@/common/enums/wallet-type.enum';

@Injectable()
export class TransactionsService {
  private logger = new Logger(TransactionsService.name);

  private mnemonic: string;

  constructor(
    @InjectQueue('transfer')
    private readonly transferQ: Queue,
    @Inject(REPOSITORY.WALLETS)
    private readonly walletsRepository: Repository<Wallet>,
    @Inject(REPOSITORY.TRANSACTIONS)
    private readonly transactionsRepository: Repository<Transaction>,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly limitsService: LimitsService,
    private readonly feesService: FeesService,
    private readonly currencyService: CurrenciesService,
    private readonly hdWalletUtils: HdWalletUtils,
  ) {
    this.mnemonic = this.configService.getOrThrow<string>('BNB_MNEMONIC');
  }

  async findOne(id: string) {
    const res = await this.transactionsRepository.findOne({
      where: { id },
      relations: ['wallet.user', 'wallet.currency'],
    });

    if (!res) {
      throw new NotFoundException('Transaction not found');
    }

    return res;
  }

  async requestWithdrawByUserId(
    userId: string,
    to: string,
    amount: number,
    walletId: string,
  ) {
    const user = await this.usersService.findById(userId);

    if (user?.isBlocked) {
      throw new BadRequestException('User is blocked');
    }

    if (user?.withdrawBlocked) {
      throw new BadRequestException('User withdraw is blocked');
    }

    const wallet = await this.walletsRepository.findOne({
      where: {
        id: walletId,
        user: {
          id: userId,
        },
      },
      relations: ['currency', 'cryptoAddress', 'user'],
    });

    if (!wallet) {
      throw new NotFoundException('Not found wallet');
    }

    if (wallet.address === to) {
      throw new BadRequestException('You cannot send to yourself');
    }

    // calculate fees
    const totalFees = await this.getTotalFees(
      wallet.currency,
      amount,
      SystemOperation.WITHDRAW,
    );

    // check if balance is enough
    await this.checkBalance(
      userId,
      wallet,
      amount,
      totalFees,
      SystemOperation.WITHDRAW,
    );

    // const mnemonic = this.configService.getOrThrow<string>('BNB_MNEMONIC');

    const transactionType =
      wallet.currency.smartContractAddress === 'main'
        ? 'withdraw'
        : 'withdrawErc20';

    // await this.transferQ.add('withdraw', {
    await this.transferQ.add(transactionType, {
      wallet,
      mnemonic: this.mnemonic,
      to,
      amount,
      fees: totalFees,
    });
  }

  async getNativeWithdrawFees(
    walletId: string,
    amount: number,
    userId?: string,
  ) {
    const wallet = await this.walletsRepository.findOne({
      where: { id: walletId, user: { id: userId } },
      relations: ['currency', 'cryptoAddress', 'user'],
    });

    if (!wallet) {
      throw new NotFoundException('Not found wallet');
    }

    const res = await this.getNativeWithdrawTotalFees(wallet.currency, amount);

    return new GetWithdrawNativeFeeResponseVm(res);
  }

  /**
   * Nuevo servicio para solicitar retiro de fondos de la billetera de administrador
   *
   * @param userId
   * @param to
   * @param amount
   * @param type
   * @param currencyId
   */
  async requestWithdrawByAdmin(
    userId: string,
    to: string,
    amount: number,
    type: WalletType,
    currencyId: string,
  ) {
    const user = await this.usersService.findById(userId);

    if (user?.isBlocked) {
      throw new BadRequestException({
        errorCode: 'USER_IS_BLOCKED',
        i18nKey: 'errors.user.invalidStatus',
      });
    }

    let addressIndex: number = this.configService.get<number>(
      'ERC20_GAS_PROVIDER_INDEX',
      0,
    );

    if (type === WalletType.FEES) {
      addressIndex = this.configService.get<number>(
        'ERC20_FEE_ADDRESS_INDEX',
        1,
      );
    } else if (type === WalletType.EXCHANGE) {
      addressIndex = this.configService.get<number>('ERC20_EXCHANGE_INDEX', 2);
    }

    const address = this.hdWalletUtils.getAddressFromIndex(
      this.mnemonic,
      addressIndex,
    );

    if (address === to) {
      throw new BadRequestException('You cannot send to yourself');
    }

    const currency = await this.currencyService.findOne(currencyId);

    if (!currency) {
      throw new NotFoundException({
        errorCode: 'CURRENCY_NOT_FOUND',
        i18nKey: 'errors.currency.notFound',
      });
    }

    const transactionType =
      currency.smartContractAddress === 'main'
        ? 'withdrawAdmin'
        : 'withdrawAdminErc20';

    await this.transferQ.add(transactionType, {
      currency,
      mnemonic: this.mnemonic,
      fromIndex: addressIndex,
      to,
      amount,
      user,
    });
  }

  /**
   * Nuevo servicio para calcular el total de las comisiones de la transacción
   * de retiro de fondos nativos desde el admin
   *
   * @param currencyId
   * @param amount
   * @returns
   */
  async getNativeAdminWithdrawFees(currencyId: string) {
    const currency = await this.currencyService.findOne(currencyId);

    if (!currency) {
      throw new NotFoundException({
        errorCode: 'CURRENCY_NOT_FOUND',
        i18nKey: 'errors.currency.notFound',
      });
    }

    const config = cryptoCurrencies.find((c) => c.id === currency.configId);

    const countTransactions = new Decimal(1);

    // get gas fee and address
    const gasFee = config?.gasFee;
    const gasFeeAddress = this.configService.get<string>(
      'ERC20_GAS_FEE_ADDRESS',
    );

    if (!!gasFee && !!gasFeeAddress) {
      countTransactions.plus(1);
    }

    const estimatedGasFee = await this.hdWalletUtils.estimateNativeGas(
      currency,
      countTransactions.toNumber(),
    );

    return new GetWithdrawNativeFeeResponseVm(estimatedGasFee);
  }

  async checkTransactionStatus(data: MoralisWebhookDto) {
    const tx = await this.transactionsRepository.findOne({
      where: {
        txHash: data.txs[0].hash,
        type: TransactionType.WITHDRAW,
      },
      relations: ['wallet', 'wallet.user'],
    });

    if (tx) {
      await this.transferQ.add('confirmWithdraw', {
        data,
        tx,
      });
    }

    await this.transferQ.add('deposit', {
      data,
    });
  }

  async createWithdrawTransaction(
    wallet: Wallet,
    to: string,
    amount: string,
    txData?: TransactionReceipt | null,
  ) {
    const tx = this.transactionsRepository.create({
      wallet: { id: wallet.id },
      txHash: txData?.hash || '',
      fromAddress: wallet.address,
      toAddress: to,
      amount,
      type: TransactionType.WITHDRAW,
      symbol: TransactionSymbol.NEGATIVE,
      currencyCode: wallet.currency.code,
      status:
        txData?.hash && txData?.hash.length > 0
          ? TransactionStatus.PENDING
          : TransactionStatus.CREATED,
      extras: txData
        ? {
            blockNumber: txData.blockNumber,
            type: txData.type,
            status: txData.status,
            gasUsed: txData.gasUsed?.toString(),
            cumulativeGasUsed: txData.cumulativeGasUsed?.toString(),
          }
        : undefined,
    });

    return this.transactionsRepository.save(tx);
  }

  async confirmWithdrawTransaction(tx: Transaction) {
    await this.transactionsRepository.update(tx.id, {
      status: TransactionStatus.CONFIRMED,
    });
  }

  async createOrUpdateDepositTransaction(
    wallet: Wallet,
    txHash: string,
    from: string,
    amount: string,
    txData?: any,
    status?: TransactionStatus,
  ) {
    const tx = {
      wallet: { id: wallet.id },
      txHash,
      fromAddress: from,
      toAddress: wallet.cryptoAddress!.address,
      amount,
      type: TransactionType.DEPOSIT,
      status,
      symbol: TransactionSymbol.POSITIVE,
      currencyCode: wallet.currency.code,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      extras: txData ? JSON.parse(JSON.stringify(txData)) : undefined,
    };

    await this.transactionsRepository.upsert(tx, ['txHash', 'type', 'wallet']);
  }

  async createWithdrawTransactionTx(
    manager: EntityManager,
    wallet: Wallet,
    to: string,
    amount: string,
    txData?: TransactionReceipt | null,
    fee?: string,
  ) {
    const lastPrice = await this.currencyService.getPrice(wallet.currency.id);

    const transactionsRepository = manager.getRepository(Transaction);

    const tx = transactionsRepository.create({
      wallet: { id: wallet.id },
      txHash: txData?.hash || `temporal-hash-${new Date().getTime()}`,
      fromAddress: wallet.address,
      toAddress: to,
      amount: new Decimal(amount)
        .plus(fee ?? 0)
        .toFixed(wallet.currency.decimals),
      fee,
      withdrawAmount: amount,
      type: TransactionType.WITHDRAW,
      symbol: TransactionSymbol.NEGATIVE,
      currencyCode: wallet.currency.code,
      price: lastPrice?.usdPrice
        ? new Decimal(lastPrice.usdPrice).toNumber()
        : undefined,
      status: TransactionStatus.PENDING,
      extras: txData
        ? {
            blockNumber: txData.blockNumber,
            type: txData.type,
            status: txData.status,
            gasUsed: txData.gasUsed?.toString(),
            cumulativeGasUsed: txData.cumulativeGasUsed?.toString(),
          }
        : undefined,
    });

    return transactionsRepository.save(tx);
  }

  async confirmWithdrawTransactionTx(manager: EntityManager, tx: Transaction) {
    const transactionsRepository = manager.getRepository(Transaction);
    await transactionsRepository.update(tx.id, {
      status: TransactionStatus.CONFIRMED,
    });
  }

  async updateWithdrawTransactionTx(
    manager: EntityManager,
    id: string,
    txData?: TransactionReceipt | null,
    status?: TransactionStatus,
  ) {
    const transactionsRepository = manager.getRepository(Transaction);

    const partial: Partial<Transaction> = {
      txHash: txData?.hash ?? `temporal-hash-${new Date().getTime()}`,
      status:
        txData?.hash && txData?.hash.length > 0
          ? (status ?? TransactionStatus.PENDING)
          : (status ?? TransactionStatus.PENDING),
      extras: txData
        ? {
            blockNumber: txData.blockNumber,
            type: txData.type,
            status: txData.status,
            gasUsed: txData.gasUsed?.toString(),
            cumulativeGasUsed: txData.cumulativeGasUsed?.toString(),
          }
        : undefined,
    };

    await transactionsRepository.update(id, partial);

    return transactionsRepository.findOne({ where: { id } });
  }

  async createOrUpdateDepositTransactionTx(
    manager: EntityManager,
    wallet: Wallet,
    txHash: string,
    from: string,
    amount: string,
    txData?: any,
    status?: TransactionStatus,
  ) {
    const transactionsRepository = manager.getRepository(Transaction);
    const tx = {
      wallet: { id: wallet.id },
      txHash,
      fromAddress: from,
      toAddress: wallet.cryptoAddress!.address,
      amount,
      type: TransactionType.DEPOSIT,
      status,
      symbol: TransactionSymbol.POSITIVE,
      currencyCode: wallet.currency.code,
      creditedAmount: amount,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      extras: txData ? JSON.parse(JSON.stringify(txData)) : undefined,
    };

    // await transactionsRepository.upsert(tx, ['txHash', 'type', 'wallet']);
    await transactionsRepository.upsert(tx, [
      'txHash',
      'type',
      'fromAddress',
      'toAddress',
    ]);
  }

  async findByWalletPaginated(
    userId: string,
    walletId: string,
    page = 1,
    limit = 10,
    types?: TransactionType[],
  ) {
    const query = this.transactionsRepository
      .createQueryBuilder('transaction')
      .leftJoin('transaction.wallet', 'wallet')
      .leftJoin('wallet.user', 'user')
      .where('wallet.id = :walletId', { walletId })
      .andWhere('user.id = :userId', { userId });

    if (types && types.length > 0) {
      query.andWhere('transaction.type IN (:...types)', { types });
    }

    return query
      .orderBy('transaction.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
  }

  async findPaginated(page = 1, limit = 10, filters?: TransactionsQueryDto) {
    // Define el filtro base (por defecto: filtrar por usuario)
    const where:
      | FindOptionsWhere<Transaction>
      | FindOptionsWhere<Transaction>[] = {};

    // Aplica filtros dinámicos
    if (filters?.walletId || filters?.username) {
      where.wallet = {};

      if (filters.walletId) {
        (where.wallet as any).id = filters.walletId;
      }

      if (filters.username) {
        (where.wallet as any).user = { email: Like(`%${filters.username}%`) };
      }
    }

    if (filters?.types) {
      where.type = In(filters.types);
    }

    if (filters?.symbol) {
      where.symbol = filters.symbol;
    }

    if (filters?.status) {
      where.status = In(filters.status);
    }

    if (filters?.currencyCode) {
      where.currencyCode = In(filters.currencyCode);
    }

    if (filters?.createdAtFrom && filters?.createdAtTo) {
      where.createdAt = Between(filters.createdAtFrom, filters.createdAtTo);
    } else if (filters?.createdAtFrom) {
      where.createdAt = MoreThanOrEqual(filters.createdAtFrom);
    } else if (filters?.createdAtTo) {
      where.createdAt = LessThanOrEqual(filters.createdAtTo);
    }

    // Orden dinámico (por defecto: createdAt DESC)
    const order: FindOptionsOrder<Transaction> = {
      [filters?.orderBy ?? 'createdAt']:
        filters?.order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC',
    };

    // Buscar las transacciones
    return this.transactionsRepository.findAndCount({
      take: limit,
      skip: (page - 1) * limit,
      relations: ['wallet.currency', 'wallet.user'],
      where,
      order,
    });
  }

  async testNotification(userId: string) {
    await this.transferQ.add('testNotification', { userId });
  }

  /**************************************************************************
   * Auxiliary methods
   **************************************************************************/

  async checkBalance(
    userId: string,
    wallet: Wallet,
    amount: number,
    totalFees: number,
    operation: SystemOperation,
  ) {
    // get wallet balance
    const walletBalance = new Decimal(wallet.balance);

    // get limits
    const wdLimit = await this.limitsService.findOneByUserIdAndWalletId(
      userId,
      {
        walletId: wallet.id,
        operation,
      },
    );

    // estimate allowed amount
    const allowedAmount = wdLimit
      ? new Decimal(wdLimit.maximumAllowed)
      : walletBalance;

    // get gas fee and address
    const config = cryptoCurrencies.find(
      (c) => c.id === wallet.currency.configId,
    );
    const gasFee = config?.gasFee;
    const gasFeeAddress = this.configService.get<string>(
      'ERC20_GAS_FEE_ADDRESS',
    );

    // calculate new amount with fees
    const newAmount = new Decimal(amount).plus(totalFees);

    if (!!gasFee && !!gasFeeAddress) {
      newAmount.plus(gasFee ?? 0);
    }

    // check if balance is enough
    if (allowedAmount.lessThan(newAmount)) {
      throw new BadRequestException('Insufficient funds');
    }

    return true;
  }

  async getTotalFees(
    currency: Currency,
    amount: number,
    operation: SystemOperation,
  ) {
    const fees = await this.feesService.queryForCheck({
      currencyId: currency.id,
      operation,
    });

    if (!fees) {
      return 0;
    }

    const totalFixedFees = fees.reduce((sum, fee) => {
      if (fee.type === FeeType.FIXED) {
        return sum.plus(fee.value);
      }
      return new Decimal(sum);
    }, new Decimal(0));

    const totalPercentFees = fees.reduce((sum, fee) => {
      if (fee.type === FeeType.PERCENT) {
        return sum.plus(fee.value);
      }
      return new Decimal(sum);
    }, new Decimal(0));

    const percentFee = totalPercentFees
      .times(amount)
      .div(100)
      .toDecimalPlaces(currency.decimals)
      .toNumber();

    const totalFees = totalFixedFees.plus(percentFee).toNumber();

    return totalFees;
  }

  async getNativeWithdrawTotalFees(currency: Currency, amount: number) {
    const config = cryptoCurrencies.find((c) => c.id === currency.configId);

    const totalFees = await this.getTotalFees(
      currency,
      amount,
      SystemOperation.WITHDRAW,
    );

    const countTransactions = new Decimal(1);

    if (totalFees > 0) {
      countTransactions.plus(1);
    }

    // get gas fee and address
    const gasFee = config?.gasFee;
    const gasFeeAddress = this.configService.get<string>(
      'ERC20_GAS_FEE_ADDRESS',
    );

    if (!!gasFee && !!gasFeeAddress) {
      countTransactions.plus(1);
    }

    const estimatedGasFee = await this.hdWalletUtils.estimateNativeGas(
      currency,
      countTransactions.toNumber(),
    );

    return estimatedGasFee;
  }

  async getTotalTransactionsAmount(
    status: TransactionStatus = TransactionStatus.CONFIRMED,
  ): Promise<Array<{ type: TransactionType; totalAmount: number }>> {
    if (status && !Object.values(TransactionStatus).includes(status)) {
      throw new BadRequestError({
        errorCode: 'INVALID_TRANSACTION_STATUS',
        i18nKey: 'errors.transaction.invalidStatus',
      });
    }

    // Obtener precios actuales por moneda para fallback
    const latestPrices = await this.currencyService.getLatestPrices();
    const latestPriceMap = new Map<string, string>(); // currencyId -> usdPrice (string)
    for (const p of latestPrices) {
      if (p.currencyId && p.usdPrice) {
        latestPriceMap.set(p.currencyId, p.usdPrice);
      }
    }

    // Traer transacciones confirmadas con su moneda
    const txs = await this.transactionsRepository.find({
      where: { status },
      relations: ['wallet', 'wallet.currency'],
      select: {
        id: true,
        type: true,
        amount: true,
        price: true,
        wallet: { id: true, currency: { id: true } },
      },
    });

    // Acumular totales en USD por tipo
    const allTypes = Object.values(TransactionType) as TransactionType[];
    const totals = new Map(allTypes.map((t) => [t, new Decimal(0)]));

    for (const tx of txs) {
      const type = tx.type;
      const amountDec = new Decimal(tx.amount || '0');
      if (amountDec.isZero()) continue;

      const txPrice =
        tx.price !== undefined && tx.price !== null
          ? new Decimal(tx.price)
          : null;
      const currId = tx.wallet?.currency?.id;
      const fallbackStr = currId ? latestPriceMap.get(currId) : undefined;
      const fallback = fallbackStr ? new Decimal(fallbackStr) : undefined;
      const priceDec = txPrice ?? fallback ?? null;
      if (!priceDec) continue;

      totals.set(type, totals.get(type)!.plus(amountDec.times(priceDec)));
    }

    return allTypes.map((type) => ({
      type,
      totalAmount: Number(totals.get(type)!.toFixed(2)),
    }));
  }
}
