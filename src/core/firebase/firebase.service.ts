import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { FIREBASE_OPTIONS, FirebaseOptions } from './firebase.module';

/**
 * FirebaseService provides access to the Firebase Admin SDK.
 * It initializes the Firebase Admin app using configuration injected via FIREBASE_OPTIONS.
 */
@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private app: admin.app.App;

  constructor(
    @Inject(FIREBASE_OPTIONS) private readonly options: FirebaseOptions,
  ) {}

  onModuleInit() {
    try {
      // Check if Firebase Admin is already initialized
      if (admin.apps.length === 0) {
        const { projectId, clientEmail, privateKey } = this.options;

        if (!projectId || !clientEmail || !privateKey) {
          this.logger.warn(
            'Firebase credentials not configured. App Check will not work.',
          );
          this.logger.debug(
            `ProjectId: ${!!projectId}, ClientEmail: ${!!clientEmail}, PrivateKey: ${!!privateKey}`,
          );
          return;
        }

        // Normalize private key (replace escaped newlines with actual newlines)
        const normalizedPrivateKey = privateKey.replace(/\\n/g, '\n');

        this.app = admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey: normalizedPrivateKey,
          }),
          projectId,
        });

        this.logger.log('Firebase Admin SDK initialized successfully');
      } else {
        this.app = admin.app();
        this.logger.log('Firebase Admin SDK already initialized');
      }
    } catch (error) {
      this.logger.error('Failed to initialize Firebase Admin SDK', error);
      throw error;
    }
  }

  getApp(): admin.app.App {
    if (!this.app) {
      throw new Error('Firebase Admin SDK not initialized');
    }
    return this.app;
  }

  getAppCheck(): admin.appCheck.AppCheck {
    return this.getApp().appCheck();
  }

  async onModuleDestroy() {
    if (this.app) {
      try {
        await this.app.delete();
        this.logger.log('Firebase Admin SDK deleted successfully');
      } catch (error) {
        this.logger.error('Failed to delete Firebase Admin SDK', error);
      }
    }
  }
}
