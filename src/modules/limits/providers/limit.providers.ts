import { DATA_SOURCE, REPOSITORY } from 'src/database/constants';
import { DataSource } from 'typeorm';
import { Limit } from '../entities/limit.entity';

export const limitProviders = [
  {
    provide: REPOSITORY.LIMITS,
    useFactory: (dataSource: DataSource) => dataSource.getRepository(Limit),
    inject: [DATA_SOURCE],
  },
];
