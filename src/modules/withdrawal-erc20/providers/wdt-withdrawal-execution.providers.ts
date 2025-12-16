import { DATA_SOURCE } from 'src/database/constants';
import { DataSource } from 'typeorm';
import { WdtWithdrawalExecutionEntity } from '../entities/wdt-withdrawal-execution.entity';

export const wdtWithdrawalExecutionEntityProviders = [
  {
    provide: 'WdtWithdrawalExecutionEntityRepository',
    useFactory: (dataSource: DataSource) =>
      dataSource.getRepository(WdtWithdrawalExecutionEntity),
    inject: [DATA_SOURCE],
  },
];
