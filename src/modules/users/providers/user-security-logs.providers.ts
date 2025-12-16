import { DATA_SOURCE, REPOSITORY } from 'src/database/constants';
import { DataSource } from 'typeorm';
import { UserSecurityLog } from '../entities/user-security-log.entity';

export const userSecurityLogsProviders = [
  {
    provide: REPOSITORY.USER_SECURITY_LOGS,
    useFactory: (dataSource: DataSource) =>
      dataSource.getRepository(UserSecurityLog),
    inject: [DATA_SOURCE],
  },
];
