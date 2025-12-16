import { DATA_SOURCE } from 'src/database/constants';
import { DataSource } from 'typeorm';
import { WdtWithdrawalRequestEntity } from '../entities/wdt-withdrawal-request.entity';

export const wdtWithdrawalRequestEntityProviders = [
  {
    provide: 'WdtWithdrawalRequestEntityRepository',
    useFactory: (dataSource: DataSource) =>
      dataSource.getRepository(WdtWithdrawalRequestEntity),
    inject: [DATA_SOURCE],
  },
];
