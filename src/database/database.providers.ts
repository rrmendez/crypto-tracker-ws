import { DataSource } from 'typeorm';
import { DATA_SOURCE } from './constants';
import { runInitialSeed } from './seeds/initial.seed';
// import * as fs from 'fs';
// import * as path from 'path';

// -------------------------------------------------------------------------
// Aiven DB config
//-----------------------------------------------------------------------------
// const DB_SSL = {
//   ca: fs.readFileSync(
//     path.resolve(process.cwd(), 'src/database/certs/ca.pem'),
//     'utf8',
//   ),
//   rejectUnauthorized: true, // o false si estás en pruebas o con certificados autofirmados
// };

// -------------------------------------------------------------------------

export const databaseProviders = [
  {
    provide: DATA_SOURCE,
    useFactory: async () => {
      const dataSource = new DataSource({
        type: process.env.DB_TYPE as 'mysql' | 'postgres',
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT!),
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: process.env.DB_SSL === 'true',
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
        synchronize: true,
        extra: {
          ssl:
            process.env.DB_SSL === 'true'
              ? {
                  rejectUnauthorized: false,
                }
              : null,
        },
      });

      const initialized = await dataSource.initialize();
      await runInitialSeed(initialized);
      return initialized;
    },
  },
];
