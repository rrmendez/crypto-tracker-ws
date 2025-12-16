import { forwardRef, Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { HdWalletUtils } from '@/common/utils/hd-wallet.utils';
import { MoralisUtils } from '@/common/utils/moralis.utils';
import { AuthModule } from '@/core/auth/auth.module';
import { CurrenciesModule } from '../currencies/currencies.module';
import { UsersModule } from '../users/users.module';
import { TransactionsModule } from '../transactions/transactions.module';

@Module({
  controllers: [DashboardController],
  imports: [
    forwardRef(() => AuthModule),
    CurrenciesModule,
    UsersModule,
    TransactionsModule,
  ],
  providers: [DashboardService, HdWalletUtils, MoralisUtils],
})
export class DashboardModule {}
