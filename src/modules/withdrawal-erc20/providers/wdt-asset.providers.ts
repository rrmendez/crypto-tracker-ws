import { DATA_SOURCE } from 'src/database/constants';
import { DataSource } from 'typeorm';
import { WdtAssetEntity } from '../entities/wdt-asset.entity';

export const wdtAssetEntityProviders = [
  {
    provide: 'WdtAssetEntityRepository',
    useFactory: (dataSource: DataSource) =>
      dataSource.getRepository(WdtAssetEntity),
    inject: [DATA_SOURCE],
  },
];
