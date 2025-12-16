import { DATA_SOURCE, REPOSITORY } from '@/database/constants';
import { DataSource } from 'typeorm';
import { Fee } from '../entities/fee.entity';

export const feeProviders = [
  {
    provide: REPOSITORY.FEES,
    useFactory: (dataSource: DataSource) => dataSource.getRepository(Fee),
    inject: [DATA_SOURCE],
  },
];
