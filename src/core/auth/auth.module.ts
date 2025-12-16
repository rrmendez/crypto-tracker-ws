import { forwardRef, Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '@/modules/users/users.module';
import { WalletsModule } from '@/modules/wallets/wallets.module';
import { BullModule } from '@nestjs/bullmq';
import { AccountsProcessor } from './processors/accounts.processor';
import { ClientInformationModule } from '@/modules/client-information/client-information.module';
import { UserAddressesModule } from '@/modules/user-addresses/user-addresses.module';
import { KycsModule } from '@/modules/kycs/kycs.module';
import { TwoFactorGuard } from './guards/two-factor.guard';
import { Jwt2FAGuard } from './guards/jwt-second-factor-auth.guard';
import { OriginAudienceGuard } from './guards/origin-audience.guard';
import { MailModule } from '../mail/mail.module';
import { DatabaseModule } from '@/database/database.module';
import { emailVerificationsProviders } from '@/modules/users/providers/email-verifications.providers';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'accounts' }),
    forwardRef(() => UsersModule),
    forwardRef(() => WalletsModule),
    forwardRef(() => ClientInformationModule),
    forwardRef(() => UserAddressesModule),
    forwardRef(() => KycsModule),
    MailModule,
    DatabaseModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: configService.get('JWT_EXPIRATION') },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    AccountsProcessor,
    TwoFactorGuard,
    Jwt2FAGuard,
    OriginAudienceGuard,
    ...emailVerificationsProviders,
  ],
  exports: [
    JwtStrategy,
    JwtModule,
    TwoFactorGuard,
    AuthService,
    Jwt2FAGuard,
    ...emailVerificationsProviders,
  ],
})
export class AuthModule {}
