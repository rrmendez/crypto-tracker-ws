import { DATA_SOURCE, REPOSITORY } from 'src/database/constants';
import { DataSource } from 'typeorm';
import { Currency } from '../entities/currency.entity';

export const currencyProviders = [
  {
    provide: REPOSITORY.CURRENCIES,
    useFactory: (dataSource: DataSource) => dataSource.getRepository(Currency),
    inject: [DATA_SOURCE],
  },
];
