/* eslint-disable @typescript-eslint/no-unsafe-return */

import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import Keyv from 'keyv';
import KeyvRedis from '@keyv/redis';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseModule } from '@/database/database.module';
import { AuthModule } from '@/core/auth/auth.module';
import { UsersModule } from '@/modules/users/users.module';
import { WalletsModule } from './modules/wallets/wallets.module';
import { KycsModule } from './modules/kycs/kycs.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { CurrenciesModule } from './modules/currencies/currencies.module';
import { SettingsModule } from './modules/settings/settings.module';
import { BullModule } from '@nestjs/bullmq';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { UserAddressesModule } from './modules/user-addresses/user-addresses.module';
import { ClientInformationModule } from './modules/client-information/client-information.module';
import { UploadModule } from './core/uploads/upload.module';
import { ScheduleModule } from '@nestjs/schedule';
import { LimitsModule } from './modules/limits/limits.module';
import { FeesModule } from './modules/fees/fees.module';
import { I18nModule, AcceptLanguageResolver } from 'nestjs-i18n';
import { WithdrawalErc20Module } from './modules/withdrawal-erc20/withdrawal-erc20.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { FirebaseModule } from './core/firebase/firebase.module';
import { firebaseConfig } from './config/configuration';
import * as path from 'path';
@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const host = configService.get<string>('REDIS_HOST');
        const port = configService.get<number>('REDIS_PORT');
        const username = configService.get<string>('REDIS_USERNAME');
        const password = configService.get<string>('REDIS_PASSWORD');
        const useTls = configService.get<string>('REDIS_TLS') === 'true';
        const url = `${useTls ? 'rediss' : 'redis'}://${
          username || password
            ? `${encodeURIComponent(username ?? '')}:${encodeURIComponent(
                password ?? '',
              )}@`
            : ''
        }${host}:${port}`;

        const store = new Keyv({ store: new KeyvRedis(url) });
        return { stores: [store] } as any;
      },
    }),
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get<number>('THROTTLE_TTL', 60000), // Default: 60 segundos
          limit: configService.get<number>('THROTTLE_LIMIT', 10), // Default: 10 requests
        },
      ],
    }),
    I18nModule.forRoot({
      fallbackLanguage: 'pt',
      loaderOptions: {
        path: path.join(__dirname, '/i18n/'),
        watch: true,
      },
      resolvers: [AcceptLanguageResolver],
      typesOutputPath: path.join(
        __dirname,
        '../src/generated/i18n.generated.ts',
      ),
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const username = configService.get<string>('REDIS_USERNAME');
        const password = configService.get<string>('REDIS_PASSWORD');
        const host = configService.get<string>('REDIS_HOST');
        const port = configService.get<number>('REDIS_PORT');
        const useTls = configService.get<string>('REDIS_TLS') === 'true';

        return {
          connection: {
            host,
            port,
            ...(username ? { username } : {}),
            ...(password ? { password } : {}),
            ...(useTls ? { tls: {} } : {}), // 👈 TLS activado solo si REDIS_TLS=true
          },
        };
      },
    }),
    FirebaseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const projectId = configService.get<string>(
          firebaseConfig.FIREBASE_PROJECT_ID,
        );
        const clientEmail = configService.get<string>(
          firebaseConfig.FIREBASE_CLIENT_EMAIL,
        );
        const privateKey = configService.get<string>(
          firebaseConfig.FIREBASE_PRIVATE_KEY,
        );
        const appCheckEnabled = configService.get<string>(
          firebaseConfig.FIREBASE_APP_CHECK_ENABLED,
        );
        const appId = configService.get<string>(firebaseConfig.FIREBASE_APP_ID);

        if (
          (!projectId || !clientEmail || !privateKey) &&
          appCheckEnabled === 'true'
        ) {
          throw new Error(
            'Firebase configuration is incomplete. Please provide FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.',
          );
        }

        return {
          projectId,
          clientEmail,
          privateKey,
          appCheckEnabled: appCheckEnabled === 'true',
          appId,
        };
      },
    }),
    AuthModule,
    UsersModule,
    UploadModule,
    DatabaseModule,
    WalletsModule,
    KycsModule,
    TransactionsModule,
    CurrenciesModule,
    SettingsModule,
    NotificationsModule,
    UserAddressesModule,
    ClientInformationModule,
    LimitsModule,
    FeesModule,
    WithdrawalErc20Module,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
