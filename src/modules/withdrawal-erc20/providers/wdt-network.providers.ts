import { DATA_SOURCE } from 'src/database/constants';
import { DataSource } from 'typeorm';
import { WdtNetworkEntity } from '../entities/wdt-network.entity';

export const wdtNetworkEntityProviders = [
  {
    provide: 'WdtNetworkEntityRepository',
    useFactory: (dataSource: DataSource) =>
      dataSource.getRepository(WdtNetworkEntity),
    inject: [DATA_SOURCE],
  },
];
