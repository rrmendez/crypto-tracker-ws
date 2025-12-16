import { DATA_SOURCE, REPOSITORY } from 'src/database/constants';
import { DataSource } from 'typeorm';
import { CryptoAddress } from '../entities/crypto-address.entity';

export const cryptoAddressProviders = [
  {
    provide: REPOSITORY.CRYPTO_ADDRESSES,
    useFactory: (dataSource: DataSource) =>
      dataSource.getRepository(CryptoAddress),
    inject: [DATA_SOURCE],
  },
];
