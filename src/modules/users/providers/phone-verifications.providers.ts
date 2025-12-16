import { DATA_SOURCE, REPOSITORY } from 'src/database/constants';
import { DataSource } from 'typeorm';
import { PhoneVerification } from '../entities/phone-verification.entity';

export const phoneVerificationsProviders = [
  {
    provide: REPOSITORY.PHONE_VERIFICATIONS,
    useFactory: (dataSource: DataSource) =>
      dataSource.getRepository(PhoneVerification),
    inject: [DATA_SOURCE],
  },
];
