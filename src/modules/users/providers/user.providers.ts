import { DATA_SOURCE, REPOSITORY } from 'src/database/constants';
import { User } from '../entities/user.entity';
import { DataSource } from 'typeorm';

export const userProviders = [
  {
    provide: REPOSITORY.USERS,
    useFactory: (dataSource: DataSource) => dataSource.getRepository(User),
    inject: [DATA_SOURCE],
  },
];
