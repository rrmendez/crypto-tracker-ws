import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CurrenciesService } from './currencies.service';
import { CurrenciesController } from './currencies.controller';
import { currencyProviders } from './providers/currency.providers';
import { DatabaseModule } from '@/database/database.module';
import { AuthModule } from '@/core/auth/auth.module';
import { priceProviders } from './providers/price.providers';
import { MoralisUtils } from '@/common/utils/moralis.utils';
import { CoinGeckoUtils } from '@/common/utils/coingecko.utils';
import { PriceScheduler } from '@/jobs/prices.scheduler';
import { PriceSyncProcessor } from '@/modules/currencies/processors/price-sync.processor';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    BullModule.registerQueue({ name: 'price-sync' }),
  ],
  controllers: [CurrenciesController],
  providers: [
    ...currencyProviders,
    ...priceProviders,
    CurrenciesService,
    MoralisUtils,
    CoinGeckoUtils,
    PriceScheduler,
    PriceSyncProcessor,
  ],
  exports: [CurrenciesService],
})
export class CurrenciesModule {}
