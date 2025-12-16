import { DATA_SOURCE } from 'src/database/constants';
import { DataSource } from 'typeorm';
import { WdtNetworkThresholdEntity } from '../entities/wdt-network-threshold.entity';

export const wdtNetworkThresholdEntityProviders = [
  {
    provide: 'WdtNetworkThresholdEntityRepository',
    useFactory: (dataSource: DataSource) =>
      dataSource.getRepository(WdtNetworkThresholdEntity),
    inject: [DATA_SOURCE],
  },
];
