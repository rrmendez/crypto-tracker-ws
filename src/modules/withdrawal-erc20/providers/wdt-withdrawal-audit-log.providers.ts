import { DATA_SOURCE } from 'src/database/constants';
import { DataSource } from 'typeorm';
import { WdtWithdrawalAuditLogEntity } from '../entities/wdt-withdrawal-audit-log.entity';

export const wdtWithdrawalAuditLogEntityProviders = [
  {
    provide: 'WdtWithdrawalAuditLogEntityRepository',
    useFactory: (dataSource: DataSource) =>
      dataSource.getRepository(WdtWithdrawalAuditLogEntity),
    inject: [DATA_SOURCE],
  },
];
