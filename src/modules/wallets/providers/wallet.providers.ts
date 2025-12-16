import { DATA_SOURCE, REPOSITORY } from 'src/database/constants';
import { DataSource } from 'typeorm';
import { Wallet } from '../entities/wallet.entity';

export const walletProviders = [
  {
    provide: REPOSITORY.WALLETS,
    useFactory: (dataSource: DataSource) => dataSource.getRepository(Wallet),
    inject: [DATA_SOURCE],
  },
];
