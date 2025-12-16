import { forwardRef, Module } from '@nestjs/common';
import { UserAddressesService } from './user-addresses.service';
import { UserAddressesController } from './user-addresses.controller';
import { userAddressProviders } from './providers/user-address.providers';
import { AuthModule } from '@/core/auth/auth.module';
import { DatabaseModule } from '@/database/database.module';

@Module({
  imports: [forwardRef(() => AuthModule), DatabaseModule],
  controllers: [UserAddressesController],
  providers: [UserAddressesService, ...userAddressProviders],
  exports: [UserAddressesService],
})
export class UserAddressesModule {}
