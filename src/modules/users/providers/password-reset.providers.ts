import { DATA_SOURCE, REPOSITORY } from '@/database/constants';
import { DataSource } from 'typeorm';
import { PasswordReset } from '../entities/password-reset.entity';

export const passwordResetProviders = [
  {
    provide: REPOSITORY.PASSWORD_RESETS,
    useFactory: (dataSource: DataSource) =>
      dataSource.getRepository(PasswordReset),
    inject: [DATA_SOURCE],
  },
];
