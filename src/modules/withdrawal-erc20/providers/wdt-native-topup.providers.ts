import { DATA_SOURCE } from 'src/database/constants';
import { DataSource } from 'typeorm';
import { WdtNativeTopupEntity } from '../entities/wdt-native-topup.entity';

export const wdtNativeTopupEntityProviders = [
  {
    provide: 'WdtNativeTopupEntityRepository',
    useFactory: (dataSource: DataSource) =>
      dataSource.getRepository(WdtNativeTopupEntity),
    inject: [DATA_SOURCE],
  },
];
