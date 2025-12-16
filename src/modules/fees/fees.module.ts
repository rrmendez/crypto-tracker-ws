import { forwardRef, Module } from '@nestjs/common';
import { FeesService } from './fees.service';
import { FeesController } from './fees.controller';
import { feeProviders } from './providers/fee.providers';
import { DatabaseModule } from '@/database/database.module';
import { AuthModule } from '@/core/auth/auth.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { currencyProviders } from '../currencies/providers/currency.providers';
import { userProviders } from '../users/providers/user.providers';

@Module({
  imports: [
    DatabaseModule,
    forwardRef(() => AuthModule),
    forwardRef(() => TransactionsModule),
  ],
  controllers: [FeesController],
  providers: [
    FeesService,
    ...feeProviders,
    ...currencyProviders,
    ...userProviders,
  ],
  exports: [FeesService],
})
export class FeesModule {}
