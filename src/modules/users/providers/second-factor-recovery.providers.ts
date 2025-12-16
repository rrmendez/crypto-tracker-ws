import { DATA_SOURCE, REPOSITORY } from '@/database/constants';
import { DataSource } from 'typeorm';
import { SecondFactorRecovery } from '../entities/second-factor-recovery.entity';

export const secondFactorRecoveryProviders = [
  {
    provide: REPOSITORY.SECOND_FACTOR_RECOVERIES,
    useFactory: (dataSource: DataSource) =>
      dataSource.getRepository(SecondFactorRecovery),
    inject: [DATA_SOURCE],
  },
];
