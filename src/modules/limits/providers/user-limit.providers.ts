import { DATA_SOURCE, REPOSITORY } from 'src/database/constants';
import { DataSource } from 'typeorm';
import { UserLimit } from '../entities/user-limit.entity';

export const userLimitProviders = [
  {
    provide: REPOSITORY.USER_LIMITS,
    useFactory: (dataSource: DataSource) => dataSource.getRepository(UserLimit),
    inject: [DATA_SOURCE],
  },
];
