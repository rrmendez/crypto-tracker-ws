import { forwardRef, Module } from '@nestjs/common';
import { LimitsService } from './limits.service';
import { LimitsController } from './limits.controller';
import { limitProviders } from './providers/limit.providers';
import { AuthModule } from '@/core/auth/auth.module';
import { DatabaseModule } from '@/database/database.module';
import { userLimitProviders } from './providers/user-limit.providers';
import { WalletsModule } from '../wallets/wallets.module';
import { UsersModule } from '../users/users.module';
import { priceProviders } from '../currencies/providers/price.providers';
import { transactionProviders } from '../transactions/providers/transaction.providers';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    DatabaseModule,
    WalletsModule,
    UsersModule,
  ],
  controllers: [LimitsController],
  providers: [
    LimitsService,
    ...limitProviders,
    ...userLimitProviders,
    ...priceProviders,
    ...transactionProviders,
  ],
  exports: [LimitsService],
})
export class LimitsModule {}
