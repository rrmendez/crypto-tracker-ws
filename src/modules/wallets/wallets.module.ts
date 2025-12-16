import { forwardRef, Module } from '@nestjs/common';
import { WalletsService } from './wallets.service';
import { WalletsController } from './wallets.controller';
import { AuthModule } from '@/core/auth/auth.module';
import { DatabaseModule } from '@/database/database.module';
import { walletProviders } from './providers/wallet.providers';
import { userProviders } from '../users/providers/user.providers';
import { currencyProviders } from '../currencies/providers/currency.providers';
import { MoralisUtils } from '@/common/utils/moralis.utils';
import { HdWalletUtils } from '@/common/utils/hd-wallet.utils';
import { cryptoAddressProviders } from './providers/crypto-address.providers';

@Module({
  imports: [forwardRef(() => AuthModule), DatabaseModule],
  controllers: [WalletsController],
  providers: [
    ...walletProviders,
    ...userProviders,
    ...currencyProviders,
    ...cryptoAddressProviders,
    WalletsService,
    MoralisUtils,
    HdWalletUtils,
  ],
  exports: [WalletsService],
})
export class WalletsModule {}
