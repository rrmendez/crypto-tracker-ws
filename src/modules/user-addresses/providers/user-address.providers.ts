import { DATA_SOURCE, REPOSITORY } from 'src/database/constants';
import { DataSource } from 'typeorm';
import { UserAddress } from '../entities/user-address.entity';

export const userAddressProviders = [
  {
    provide: REPOSITORY.USER_ADDRESSES,
    useFactory: (dataSource: DataSource) =>
      dataSource.getRepository(UserAddress),
    inject: [DATA_SOURCE],
  },
];
