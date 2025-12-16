import { Module } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { BullModule } from '@nestjs/bullmq';
import { TransferProcessor } from './processors/transfer.processor';
import { HdWalletUtils } from '@/common/utils/hd-wallet.utils';
import { AuthModule } from '@/core/auth/auth.module';
import { walletProviders } from '../wallets/providers/wallet.providers';
import { DatabaseModule } from '@/database/database.module';
import { WalletsModule } from '../wallets/wallets.module';
import { transactionProviders } from './providers/transaction.providers';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';
import { WithdrawalErc20Module } from '../withdrawal-erc20/withdrawal-erc20.module';
import { LimitsModule } from '../limits/limits.module';
import { FeesModule } from '../fees/fees.module';
import { CurrenciesModule } from '../currencies/currencies.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'transfer' }),
    WalletsModule,
    AuthModule,
    UsersModule,
    DatabaseModule,
    NotificationsModule,
    WithdrawalErc20Module,
    LimitsModule,
    FeesModule,
    CurrenciesModule,
  ],
  controllers: [TransactionsController],
  providers: [
    TransactionsService,
    TransferProcessor,
    HdWalletUtils,
    ...walletProviders,
    ...transactionProviders,
  ],
  exports: [TransactionsService],
})
export class TransactionsModule {}
