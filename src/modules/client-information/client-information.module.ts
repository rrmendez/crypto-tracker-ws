import { forwardRef, Module } from '@nestjs/common';
import { ClientInformationService } from './client-information.service';
import { ClientInformationController } from './client-information.controller';
import { clientInformationProviders } from './providers/client-information.providers';
import { AuthModule } from '@/core/auth/auth.module';
import { DatabaseModule } from '@/database/database.module';

@Module({
  imports: [forwardRef(() => AuthModule), DatabaseModule],
  controllers: [ClientInformationController],
  providers: [ClientInformationService, ...clientInformationProviders],
  exports: [ClientInformationService],
})
export class ClientInformationModule {}
