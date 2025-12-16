import { forwardRef, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { userProviders } from './providers/user.providers';
import { DatabaseModule } from 'src/database/database.module';
import { AuthModule } from '@/core/auth/auth.module';
import { roleProviders } from './providers/role.providers';
import { phoneVerificationsProviders } from './providers/phone-verifications.providers';
import { userAddressProviders } from '../user-addresses/providers/user-address.providers';
import { UploadModule } from '@/core/uploads/upload.module';
import { passwordResetProviders } from './providers/password-reset.providers';
import { userSecurityLogsProviders } from './providers/user-security-logs.providers';
import { secondFactorRecoveryProviders } from './providers/second-factor-recovery.providers';
import { MailModule } from '@/core/mail/mail.module';
import { WalletsCreationScheduler } from '@/jobs/wallets-creation.scheduler';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    BullModule.registerQueue({ name: 'accounts' }),
    DatabaseModule,
    UploadModule,
    MailModule,
  ],
  providers: [
    ...userProviders,
    ...roleProviders,
    ...userAddressProviders,
    ...passwordResetProviders,
    ...secondFactorRecoveryProviders,
    ...phoneVerificationsProviders,
    UsersService,
    ...userSecurityLogsProviders,
    WalletsCreationScheduler,
  ],
  controllers: [UsersController],
  exports: [
    UsersService,
    ...passwordResetProviders,
    ...secondFactorRecoveryProviders,
  ],
})
export class UsersModule {}
