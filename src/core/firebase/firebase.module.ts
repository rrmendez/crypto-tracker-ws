import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { FirebaseService } from './firebase.service';
import { AppCheckService } from './app-check.service';
import { FirebaseAppCheckGuard } from './guards/firebase-app-check.guard';

/**
 * Firebase module configuration options.
 * These options are used to initialize the Firebase Admin SDK.
 */
export interface FirebaseOptions {
  projectId?: string;
  clientEmail?: string;
  privateKey?: string;
  appCheckEnabled?: boolean;
  appId?: string;
}

/**
 * Provider token for Firebase options injection.
 * Use this token to inject FirebaseOptions into services.
 */
export const FIREBASE_OPTIONS = Symbol('FIREBASE_OPTIONS');

/**
 * FirebaseModule provides Firebase Admin SDK integration and App Check verification.
 *
 * This module is marked as @Global() to make Firebase services available throughout
 * the application without requiring explicit imports in every module.
 *
 * Configuration is provided via the forRootAsync() method, following NestJS best practices
 * for configurable modules. This allows:
 * - Environment-specific configurations
 * - Easy testing with mock configurations
 * - Lazy loading of configuration from ConfigService
 *
 * @example
 * ```typescript
 * FirebaseModule.forRootAsync({
 *   imports: [ConfigModule],
 *   inject: [ConfigService],
 *   useFactory: (configService: ConfigService) => ({
 *     projectId: configService.get('FIREBASE_PROJECT_ID'),
 *     clientEmail: configService.get('FIREBASE_CLIENT_EMAIL'),
 *     privateKey: configService.get('FIREBASE_PRIVATE_KEY'),
 *     appCheckEnabled: configService.get('FIREBASE_APP_CHECK_ENABLED') === 'true',
 *     appId: configService.get('FIREBASE_APP_ID'),
 *   }),
 * })
 * ```
 */
@Global()
@Module({})
export class FirebaseModule {
  /**
   * Configures the Firebase module with async options.
   * This method returns a DynamicModule that provides FirebaseOptions via the
   * FIREBASE_OPTIONS token, which is then consumed by FirebaseService and
   * FirebaseAppCheckGuard.
   *
   * @param options - Async module options following NestJS DynamicModule pattern
   * @returns Configured DynamicModule with providers and exports
   */
  static forRootAsync(options: {
    imports?: any[];
    inject?: any[];
    useFactory: (...args: any[]) => Promise<FirebaseOptions> | FirebaseOptions;
  }): DynamicModule {
    const firebaseOptionsProvider: Provider = {
      provide: FIREBASE_OPTIONS,
      useFactory: options.useFactory,
      inject: options.inject || [],
    };

    return {
      module: FirebaseModule,
      imports: options.imports || [],
      providers: [
        firebaseOptionsProvider,
        FirebaseService,
        AppCheckService,
        FirebaseAppCheckGuard,
      ],
      exports: [
        FIREBASE_OPTIONS,
        FirebaseService,
        AppCheckService,
        FirebaseAppCheckGuard,
      ],
    };
  }
}
