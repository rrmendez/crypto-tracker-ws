import { DATA_SOURCE, REPOSITORY } from 'src/database/constants';
import { DataSource } from 'typeorm';
import { Price } from '../entities/price.entity';

export const priceProviders = [
  {
    provide: REPOSITORY.PRICES,
    useFactory: (dataSource: DataSource) => dataSource.getRepository(Price),
    inject: [DATA_SOURCE],
  },
];
