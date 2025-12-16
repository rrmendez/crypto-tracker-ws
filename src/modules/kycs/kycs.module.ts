import { forwardRef, Module } from '@nestjs/common';
import { KycsService } from './kycs.service';
import { KycsController } from './kycs.controller';
import { kycProviders } from './providers/kyc.providers';
import { AuthModule } from '@/core/auth/auth.module';
import { DatabaseModule } from '@/database/database.module';
import { userProviders } from '../users/providers/user.providers';
import { UploadModule } from '@/core/uploads/upload.module';
import { kycDocumentsProviders } from './providers/kyc-documents.providers';
import { MailModule } from '@/core/mail/mail.module';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    DatabaseModule,
    UploadModule,
    MailModule,
  ],
  controllers: [KycsController],
  providers: [
    KycsService,
    ...kycProviders,
    ...userProviders,
    ...kycDocumentsProviders,
  ],
  exports: [KycsService],
})
export class KycsModule {}
