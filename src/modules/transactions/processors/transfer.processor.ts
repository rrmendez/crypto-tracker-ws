import { HdWalletUtils } from '@/common/utils/hd-wallet.utils';
import { WalletsService } from '@/modules/wallets/wallets.service';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { TransactionsService } from '../transactions.service';
import {
  Erc20TransferDto,
  MoralisWebhookDto,
  TxDto,
} from '../dto/moralis-webhook.dto';
import { ethers, TransactionReceipt } from 'ethers';
import { TransactionStatus } from '@/common/enums/transaction-status.enum';
import { Inject, Logger } from '@nestjs/common';
import { BadRequestException, NotFoundException } from '@/common/exceptions';
import { NotificationsGateway } from '@/modules/notifications/notifications.gateway';
import { NotificationType } from '@/common/enums/notification-type.enum';
import { Wallet } from '@/modules/wallets/entities/wallet.entity';
import { Transaction } from '../entities/transaction.entity';
import Decimal from 'decimal.js';
import { cryptoAddressEquals } from '@/common/utils/crypto.utils';
import { DataSource } from 'typeorm';
import { DATA_SOURCE } from '@/database/constants';
import { I18nService } from 'nestjs-i18n';
import { I18nTranslations } from '@/generated/i18n.generated';
import { ErrorCodes } from '@/common/utils/code.utils';
import { WdtWithdrawalFlowService } from '@/modules/withdrawal-erc20/services/wdt-withdrawal-flow.service';
import { cryptoCurrencies } from '@/config/currency.config';
import { ConfigService } from '@nestjs/config';
import { Currency } from '@/modules/currencies/entities/currency.entity';
import { User } from '@/modules/users/entities/user.entity';

interface WithdrawJob {
  wallet: Wallet;
  mnemonic: string;
  to: string;
  amount: string;
  fees?: number;
}

interface WithdrawForAdminJob {
  currency: Currency;
  mnemonic: string;
  fromIndex: number;
  to: string;
  amount: string;
  user: User;
}

interface DepositJob {
  data: MoralisWebhookDto;
}

interface ConfirmWithdrawJob {
  data: MoralisWebhookDto;
  tx: Transaction;
}

interface TestNotificationJob {
  userId: string;
}

@Processor('transfer')
export class TransferProcessor extends WorkerHost {
  private logger = new Logger(TransferProcessor.name);

  constructor(
    private readonly hdWalletUtils: HdWalletUtils,
    private readonly walletsService: WalletsService,
    private readonly transactionsService: TransactionsService,
    private readonly notificationsGateway: NotificationsGateway,
    @Inject(DATA_SOURCE)
    private readonly dataSource: DataSource,
    private readonly i18n: I18nService<I18nTranslations>,
    private readonly wdtWithdrawalFlowService: WdtWithdrawalFlowService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async process(
    job: Job<
      | WithdrawJob
      | DepositJob
      | ConfirmWithdrawJob
      | TestNotificationJob
      | WithdrawForAdminJob
    >,
  ): Promise<void> {
    switch (job.name) {
      case 'withdraw':
        await this.handleNativeWithdraw(job as Job<WithdrawJob>);
        break;
      case 'withdrawAdmin':
        await this.handleNativeWithdrawForAdmin(
          job as Job<WithdrawForAdminJob>,
        );
        break;
      case 'withdrawErc20':
        await this.handleWithdrawErc20(job as Job<WithdrawJob>);
        break;
      case 'withdrawAdminErc20':
        await this.handleWithdrawForAdminErc20(job as Job<WithdrawForAdminJob>);
        break;
      case 'deposit':
        await this.handleDeposit(job as Job<DepositJob>);
        break;
      case 'confirmWithdraw':
        await this.handleConfirmWithdraw(job as Job<ConfirmWithdrawJob>);
        break;
      case 'testNotification':
        this.handleTestNotification(job as Job<TestNotificationJob>);
        break;
      default:
        throw new Error(`Unknown job type: ${job.name}`);
    }
  }

  async handleWithdrawErc20(job: Job<WithdrawJob>): Promise<void> {
    const { wallet, mnemonic, to, amount, fees } = job.data;

    const address = wallet.cryptoAddress!;
    const currency = wallet.currency;
    const lang = wallet.user.lang || 'pt';
    const config = cryptoCurrencies.find((c) => c.id === currency.configId);
    const decimals = currency.decimals > 8 ? 8 : currency.decimals;

    try {
      // get index for gas provider
      const indexOperatorAddress =
        this.configService.getOrThrow<number>('ERC20_GAS_PROVIDER_INDEX') ?? 0;

      // get index for fee address
      const indexFeeAddress =
        this.configService.getOrThrow<number>('ERC20_FEE_ADDRESS_INDEX') ?? 1;

      // get fee address
      const feeAddress = this.hdWalletUtils.getAddressFromIndex(
        mnemonic,
        indexFeeAddress,
      );

      // get gas fee and address
      const gasFee = config?.gasFee;
      const gasFeeAddress = this.configService.get<string>(
        'ERC20_GAS_FEE_ADDRESS',
      );

      const recipients = [to, ...(fees && feeAddress ? [feeAddress] : [])];

      const amounts = [
        new Decimal(amount).toFixed(currency.decimals),
        ...(fees ? [new Decimal(fees).toFixed(decimals)] : []),
      ];

      if (!!gasFee && !!gasFeeAddress) {
        recipients.push(gasFeeAddress);
        amounts.push(new Decimal(gasFee).toFixed(decimals));
      }

      this.logger.log('recipients ::: ', recipients);
      this.logger.log('amounts ::: ', amounts);

      // calculate total fees upfront (includes configured gas fee if any)
      const totalFees = new Decimal(fees ?? 0)
        .plus(gasFee ?? 0)
        .toFixed(decimals);

      // 1. Create placeholder transaction (status: CREATED) before long process
      const createdTx = await this.dataSource.transaction(async (manager) => {
        return this.transactionsService.createWithdrawTransactionTx(
          manager,
          wallet,
          to,
          amount,
          undefined,
          totalFees,
        );
      });

      // 2. Notify as CREATED immediately
      const createdMessage = this.i18n.t('transactions.withdraw.processing', {
        lang,
      });
      this.notificationsGateway.handleSendNotification(wallet.user.id, {
        type: NotificationType.WITHDRAW,
        message: createdMessage,
        withdraws: {
          amount: new Decimal(amount)
            .toDecimalPlaces(currency.decimals)
            .toFixed(currency.decimals),
          status: TransactionStatus.CREATED,
          currency: currency.code,
        },
      });

      // generate data
      const data = {
        userId: wallet.user.id,
        indexFromAddress: address.index,
        recipients,
        amounts,
        tokenContractAddress: wallet.currency.smartContractAddress!,
        rpcUrl: config!.rpcUrl!,
        mnemonic,
        indexOperatorAddress,
        indexFundingAddress: indexOperatorAddress,
        clientRequestId: `req-${new Date().getTime()}`,
        chainId: 97,
      };

      // Define default values
      let tx: TransactionReceipt | null = null;
      let status = TransactionStatus.CONFIRMED;
      let message = this.i18n.t('transactions.withdraw.confirmed', {
        lang,
      });

      // make withdrawal
      try {
        tx = await this.wdtWithdrawalFlowService.processWithdrawal(data);
      } catch (error) {
        this.logger.log('error ::: ', error);
        // Define error notification with translated message
        message = this.i18n.t('transactions.withdraw.error', {
          lang,
        });
        status = TransactionStatus.FAILED;
      }

      // 3. Update the previously created transaction with tx info and sync balance
      await this.dataSource.transaction(async (manager) => {
        await this.transactionsService.updateWithdrawTransactionTx(
          manager,
          createdTx.id,
          tx,
          status,
        );
        await this.walletsService.syncWalletBalanceTx(manager, wallet.id);
      });

      // 4. Send notification with translated message
      this.notificationsGateway.handleSendNotification(wallet.user.id, {
        type: NotificationType.WITHDRAW,
        message,
        withdraws: {
          amount: new Decimal(amount)
            .toDecimalPlaces(currency.decimals)
            .toFixed(currency.decimals),
          status,
          currency: currency.code,
        },
      });
    } catch (error) {
      this.logger.log(error);

      // Send error notification with translated message
      const errorMessage = this.i18n.t('transactions.withdraw.error', {
        lang,
      });

      this.notificationsGateway.handleSendNotification(wallet.user.id, {
        type: NotificationType.WITHDRAW,
        message: errorMessage,
        withdraws: {
          amount: new Decimal(amount)
            .toDecimalPlaces(currency.decimals)
            .toFixed(currency.decimals),
          status: TransactionStatus.FAILED,
          currency: currency.code,
        },
      });
    }
  }

  async handleNativeWithdraw(job: Job<WithdrawJob>): Promise<void> {
    const { wallet, mnemonic, to, amount, fees } = job.data;

    const currency = wallet.currency;
    const addressIndex = wallet.cryptoAddress?.index;
    const lang = wallet.user.lang || 'pt';
    const decimals = currency.decimals > 8 ? 8 : currency.decimals;
    const config = cryptoCurrencies.find((c) => c.id === currency.configId);

    if (!addressIndex) {
      throw new BadRequestException({
        errorCode: 'INVALID_ADDRESS_INDEX',
        i18nKey: 'errors.wallet.invalidAddress',
      });
    }

    try {
      // get index for fee address
      const indexFeeAddress =
        this.configService.getOrThrow<number>('ERC20_FEE_ADDRESS_INDEX') ?? 1;

      // get fee address
      const feeAddress = this.hdWalletUtils.getAddressFromIndex(
        mnemonic,
        indexFeeAddress,
      );

      // get gas fee and address
      const gasFee = config?.gasFee;
      const gasFeeAddress = this.configService.get<string>(
        'ERC20_GAS_FEE_ADDRESS',
      );

      const recipients = [to, ...(fees && feeAddress ? [feeAddress] : [])];

      const amounts = [
        new Decimal(amount).toFixed(currency.decimals),
        ...(fees ? [new Decimal(fees).toFixed(decimals)] : []),
      ];

      if (!!gasFee && !!gasFeeAddress) {
        recipients.push(gasFeeAddress);
        amounts.push(new Decimal(gasFee).toFixed(decimals));
      }

      const outputs = recipients.map((r, i) => ({
        to: r,
        amount: amounts[i],
      }));

      const gas = await this.hdWalletUtils.estimateNativeGas(
        currency,
        outputs.length,
        config?.rpcUrl,
      );

      this.logger.log('outputs ::: ', outputs);

      const res = await this.hdWalletUtils.createNativeSplitTransferTx(
        currency,
        outputs,
        mnemonic,
        addressIndex,
      );

      const totalFees = new Decimal(fees ?? 0)
        .plus(gas.totalGasNative ?? 0)
        .toFixed(decimals);

      // 1. Create placeholder transaction (status: CREATED) before long process
      await this.dataSource.transaction(async (manager) => {
        return this.transactionsService.createWithdrawTransactionTx(
          manager,
          wallet,
          to,
          amount,
          res.receipts?.[0],
          totalFees,
        );
      });

      // Update balance (relevant for native transfers signed by user's address)
      await this.walletsService.syncWalletBalance(wallet.id);

      // Notify
      const createdMessage = this.i18n.t('transactions.withdraw.processing', {
        lang,
      });
      this.notificationsGateway.handleSendNotification(wallet.user.id, {
        type: NotificationType.WITHDRAW,
        message: createdMessage,
        withdraws: {
          amount: new Decimal(amount)
            .toDecimalPlaces(currency.decimals)
            .toFixed(currency.decimals),
          status: TransactionStatus.CREATED,
          currency: currency.code,
        },
      });
    } catch (error) {
      this.logger.log(error);

      // Send error notification with translated message
      const errorMessage = this.i18n.t('transactions.withdraw.error', {
        lang,
      });

      this.notificationsGateway.handleSendNotification(wallet.user.id, {
        type: NotificationType.WITHDRAW,
        message: errorMessage,
        withdraws: {
          amount: new Decimal(amount)
            .toDecimalPlaces(currency.decimals)
            .toFixed(currency.decimals),
          status: TransactionStatus.FAILED,
          currency: currency.code,
        },
      });
    }
  }

  async handleWithdrawForAdminErc20(
    job: Job<WithdrawForAdminJob>,
  ): Promise<void> {
    const { currency, mnemonic, fromIndex, to, amount, user } = job.data;

    const lang = user.lang || 'pt';
    const config = cryptoCurrencies.find((c) => c.id === currency.configId);
    const decimals = currency.decimals > 8 ? 8 : currency.decimals;

    try {
      // get index for gas provider
      const indexOperatorAddress =
        this.configService.getOrThrow<number>('ERC20_GAS_PROVIDER_INDEX') ?? 0;

      // get gas fee and address
      const gasFee = config?.gasFee;
      const gasFeeAddress = this.configService.get<string>(
        'ERC20_GAS_FEE_ADDRESS',
      );

      const recipients = [to];

      const amounts = [new Decimal(amount).toFixed(currency.decimals)];

      if (!!gasFee && !!gasFeeAddress) {
        recipients.push(gasFeeAddress);
        amounts.push(new Decimal(gasFee).toFixed(decimals));
      }

      this.logger.log('recipients ::: ', recipients);
      this.logger.log('amounts ::: ', amounts);

      // 2. Notify as CREATED immediately
      const createdMessage = this.i18n.t('transactions.withdraw.processing', {
        lang,
      });

      this.notificationsGateway.handleSendNotification(user.id, {
        type: NotificationType.WITHDRAW,
        message: createdMessage,
        withdraws: {
          amount: new Decimal(amount)
            .toDecimalPlaces(currency.decimals)
            .toFixed(currency.decimals),
          status: TransactionStatus.CREATED,
          currency: currency.code,
        },
      });

      // generate data
      const data = {
        userId: user.id,
        indexFromAddress: fromIndex,
        recipients,
        amounts,
        tokenContractAddress: currency.smartContractAddress!,
        rpcUrl: config!.rpcUrl!,
        mnemonic,
        indexOperatorAddress,
        indexFundingAddress: indexOperatorAddress,
        clientRequestId: `req-${new Date().getTime()}`,
        chainId: 97,
      };

      // Define default values
      let status = TransactionStatus.CONFIRMED;
      let message = this.i18n.t('transactions.withdraw.confirmed', {
        lang,
      });

      // make withdrawal
      try {
        await this.wdtWithdrawalFlowService.processWithdrawal(data);
      } catch (error) {
        this.logger.error('error ::: ', error);
        // Define error notification with translated message
        message = this.i18n.t('transactions.withdraw.error', {
          lang,
        });
        status = TransactionStatus.FAILED;
      }

      // 4. Send notification with translated message
      this.notificationsGateway.handleSendNotification(user.id, {
        type: NotificationType.WITHDRAW,
        message,
        withdraws: {
          amount: new Decimal(amount)
            .toDecimalPlaces(currency.decimals)
            .toFixed(currency.decimals),
          status,
          currency: currency.code,
        },
      });
    } catch (error) {
      this.logger.error(error);

      // Send error notification with translated message
      const errorMessage = this.i18n.t('transactions.withdraw.error', {
        lang,
      });

      this.notificationsGateway.handleSendNotification(user.id, {
        type: NotificationType.WITHDRAW,
        message: errorMessage,
        withdraws: {
          amount: new Decimal(amount)
            .toDecimalPlaces(currency.decimals)
            .toFixed(currency.decimals),
          status: TransactionStatus.FAILED,
          currency: currency.code,
        },
      });
    }
  }

  async handleNativeWithdrawForAdmin(
    job: Job<WithdrawForAdminJob>,
  ): Promise<void> {
    const { currency, mnemonic, fromIndex, to, amount, user } = job.data;

    const lang = user.lang || 'pt';
    const decimals = currency.decimals > 8 ? 8 : currency.decimals;
    const config = cryptoCurrencies.find((c) => c.id === currency.configId);

    if (!fromIndex) {
      throw new BadRequestException({
        errorCode: 'INVALID_ADDRESS_INDEX',
        i18nKey: 'errors.wallet.invalidAddress',
      });
    }

    try {
      // get gas fee and address
      const gasFee = config?.gasFee;
      const gasFeeAddress = this.configService.get<string>(
        'ERC20_GAS_FEE_ADDRESS',
      );

      const recipients = [to];

      const amounts = [new Decimal(amount).toFixed(currency.decimals)];

      if (!!gasFee && !!gasFeeAddress) {
        recipients.push(gasFeeAddress);
        amounts.push(new Decimal(gasFee).toFixed(decimals));
      }

      const outputs = recipients.map((r, i) => ({
        to: r,
        amount: amounts[i],
      }));

      this.logger.log('outputs ::: ', outputs);

      await this.hdWalletUtils.createNativeSplitTransferTx(
        currency,
        outputs,
        mnemonic,
        fromIndex,
      );

      // Notify
      const createdMessage = this.i18n.t('transactions.withdraw.processing', {
        lang,
      });

      this.notificationsGateway.handleSendNotification(user.id, {
        type: NotificationType.WITHDRAW,
        message: createdMessage,
        withdraws: {
          amount: new Decimal(amount)
            .toDecimalPlaces(currency.decimals)
            .toFixed(currency.decimals),
          status: TransactionStatus.CREATED,
          currency: currency.code,
        },
      });
    } catch (error) {
      this.logger.error(error);

      // Send error notification with translated message
      const errorMessage = this.i18n.t('transactions.withdraw.error', {
        lang,
      });

      this.notificationsGateway.handleSendNotification(user.id, {
        type: NotificationType.WITHDRAW,
        message: errorMessage,
        withdraws: {
          amount: new Decimal(amount)
            .toDecimalPlaces(currency.decimals)
            .toFixed(currency.decimals),
          status: TransactionStatus.FAILED,
          currency: currency.code,
        },
      });
    }
  }

  async handleDeposit(job: Job<DepositJob>): Promise<void> {
    const { data } = job.data;

    this.logger.log(' ::: Llego al deposito ::: ');
    this.logger.log('data ::: ', data);

    // Procesar todas las transferencias ERC-20
    if (data.erc20Transfers && data.erc20Transfers.length > 0) {
      for (const transfer of data.erc20Transfers) {
        try {
          const address = transfer.to;
          const contract = transfer.contract;

          this.logger.log('Procesando transferencia ERC-20 ::: ', address);

          // 1. Get wallet
          const wallet = await this.walletsService.getByAddressAndContract(
            data.chainId,
            address,
            contract,
          );

          this.logger.log('Wallet encontrada ::: ', wallet?.id);

          if (wallet) {
            await this.processErc20Deposit(wallet, transfer);
          }
        } catch (error) {
          this.logger.error('Error procesando transferencia ERC-20:', error);
          // Continúa con la siguiente transferencia
        }
      }
    }

    // Procesar transacciones nativas (BNB)
    if (data.txs && data.txs.length > 0) {
      for (const tx of data.txs) {
        try {
          const address = tx.toAddress;
          const contract = 'main';

          this.logger.log('Procesando transacción nativa ::: ', address);

          // 1. Get wallet
          const wallet = await this.walletsService.getByAddressAndContract(
            data.chainId,
            address,
            contract,
          );

          this.logger.log('Wallet encontrada ::: ', wallet?.id);

          if (wallet) {
            await this.processBnbDeposit(wallet, tx);
          }
        } catch (error) {
          this.logger.error('Error procesando transacción nativa:', error);
          // Continúa con la siguiente transacción
        }
      }
    }
  }

  async handleConfirmWithdraw(job: Job<ConfirmWithdrawJob>): Promise<void> {
    const { data, tx } = job.data;

    if (!data.confirmed) return;

    const wallet = tx.wallet;
    const lang = wallet.user.lang || 'pt';

    // Update transaction and balance in atomic transaction
    await this.dataSource.transaction(async (manager) => {
      await this.transactionsService.confirmWithdrawTransactionTx(manager, tx);
      await this.walletsService.syncWalletBalanceTx(manager, wallet.id);
    });

    // Send notification with translated message
    const message = this.i18n.t('transactions.withdraw.confirmed', {
      lang,
    });

    this.notificationsGateway.handleSendNotification(wallet.user.id, {
      type: NotificationType.WITHDRAW,
      message,
      withdraws: {
        id: tx.id,
        amount: tx.amount,
        status: TransactionStatus.CONFIRMED,
        currency: wallet.currency.code,
        address: tx.fromAddress,
        txHash: tx.txHash,
      },
    });
  }

  handleTestNotification(job: Job<TestNotificationJob>) {
    const { userId } = job.data;

    this.logger.log('Test notification ::: ', userId);

    this.notificationsGateway.handleSendNotification(userId, {
      type: NotificationType.DEPOSIT,
      message: 'Test notification',
    });
  }

  // *************************************************************************
  // HELPERS
  // *************************************************************************

  // async processBnbDeposit(wallet: Wallet, data: MoralisWebhookDto) {
  async processBnbDeposit(wallet: Wallet, tx: TxDto) {
    const lang = wallet.user.lang || 'pt';

    // 1. Get transaction
    const trx = await this.hdWalletUtils.getTrx(tx.hash, wallet.currency);

    if (!trx || !cryptoAddressEquals(trx.to, wallet.address)) {
      this.logger.error(' ::: Transaction not found ::: ');
      throw new NotFoundException({
        errorCode: ErrorCodes.TRANSACTION_NOT_FOUND,
        i18nKey: 'errors.transaction.notFound',
      });
    }

    // 2. Get transaction receipt
    const receipt = await this.hdWalletUtils.getTrxReceipt(
      tx.hash,
      wallet.currency,
    );

    const status =
      receipt.status === 1
        ? TransactionStatus.CONFIRMED
        : TransactionStatus.PENDING;

    // 3. Save transaction and update balance in atomic transaction
    await this.dataSource.transaction(async (manager) => {
      if (trx.to && trx.to.toLowerCase() === wallet.cryptoAddress!.address) {
        await this.transactionsService.createOrUpdateDepositTransactionTx(
          manager,
          wallet,
          trx.hash,
          trx.from,
          ethers.formatEther(trx.value),
          receipt,
          status,
        );
      }

      await this.walletsService.syncWalletBalanceTx(manager, wallet.id);
    });

    this.logger.log(' ::: Wallet balance updated ::: ');

    // 4. Send notification with translated message
    const message = this.i18n.t('transactions.deposit.received', {
      lang,
    });

    this.notificationsGateway.handleSendNotification(wallet.user.id, {
      type: NotificationType.DEPOSIT,
      message,
      deposits: {
        amount: ethers.formatEther(trx.value),
        status,
        currency: wallet.currency.code,
        address: trx.from,
        txHash: trx.hash,
        blockNumber: receipt.blockNumber.toString(),
      },
    });
  }

  async processErc20Deposit(wallet: Wallet, tx: Erc20TransferDto) {
    const lang = wallet.user.lang || 'pt';

    // 1. Get transaction log
    const trx = await this.hdWalletUtils.getTokenTransfer(
      tx.transactionHash,
      wallet.currency,
    );

    // 2. Check if transaction is valid
    if (!trx || trx.transfers.length === 0) {
      this.logger.error(' ::: Transaction not found ::: ');
      throw new NotFoundException({
        errorCode: ErrorCodes.TRANSACTION_NOT_FOUND,
        i18nKey: 'errors.transaction.notFound',
      });
    }

    this.logger.log('Receipt ::: ', trx.receipt);

    const status =
      trx.receipt.status === 1
        ? TransactionStatus.CONFIRMED
        : TransactionStatus.PENDING;

    const decimals = cryptoCurrencies.find(
      (c) => c.id === wallet.currency.configId,
    )?.decimals;

    // 3. Process all transfers and update balance in atomic transaction
    await this.dataSource.transaction(async (manager) => {
      // Save all deposit transactions
      for (const transfer of trx.transfers) {
        this.logger.log('Transfer ::: ', transfer);

        if (
          transfer.to &&
          (transfer.to as string).toLowerCase() ===
            wallet.cryptoAddress!.address
        ) {
          // TODO: Check if deposit for this currency have fees and make a transfer for fee address

          await this.transactionsService.createOrUpdateDepositTransactionTx(
            manager,
            wallet,
            tx.transactionHash,
            transfer.from as string,
            ethers.formatUnits(
              transfer.value as string,
              decimals ?? wallet.currency.decimals,
            ),
            trx.receipt,
            status,
          );
        }
      }

      // Update balance once for all transfers
      await this.walletsService.syncWalletBalanceTx(manager, wallet.id);
    });

    this.logger.log(' ::: Wallet balance updated ::: ');

    // 4. Send notifications for each transfer (outside transaction)
    const message = this.i18n.t('transactions.deposit.received', {
      lang,
    });

    for (const transfer of trx.transfers) {
      if (
        transfer.to &&
        (transfer.to as string).toLowerCase() === wallet.cryptoAddress!.address
      ) {
        this.notificationsGateway.handleSendNotification(wallet.user.id, {
          type: NotificationType.DEPOSIT,
          message,
          deposits: {
            amount: ethers.formatUnits(
              transfer.value as string,
              decimals ?? wallet.currency.decimals,
            ),
            status,
            currency: wallet.currency.code,
            address: transfer.from as string,
            txHash: tx.transactionHash,
            blockNumber: trx.receipt.blockNumber.toString(),
          },
        });
      }
    }
  }
}
