import { DATA_SOURCE } from 'src/database/constants';
import { DataSource } from 'typeorm';
import { WdtAllowanceApprovalEntity } from '../entities/wdt-allowance-approval.entity';

export const wdtAllowanceApprovalEntityProviders = [
  {
    provide: 'WdtAllowanceApprovalEntityRepository',
    useFactory: (dataSource: DataSource) =>
      dataSource.getRepository(WdtAllowanceApprovalEntity),
    inject: [DATA_SOURCE],
  },
];
