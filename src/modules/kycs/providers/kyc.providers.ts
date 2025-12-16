import { DATA_SOURCE, REPOSITORY } from 'src/database/constants';
import { DataSource } from 'typeorm';
import { Kyc } from '../entities/kyc.entity';

export const kycProviders = [
  {
    provide: REPOSITORY.KYC,
    useFactory: (dataSource: DataSource) => dataSource.getRepository(Kyc),
    inject: [DATA_SOURCE],
  },
];
