import { DATA_SOURCE, REPOSITORY } from 'src/database/constants';
import { DataSource } from 'typeorm';
import { Transaction } from '../entities/transaction.entity';

export const transactionProviders = [
  {
    provide: REPOSITORY.TRANSACTIONS,
    useFactory: (dataSource: DataSource) =>
      dataSource.getRepository(Transaction),
    inject: [DATA_SOURCE],
  },
];
