import { DATA_SOURCE } from 'src/database/constants';
import { DataSource } from 'typeorm';
import { WdtWithdrawalContractEntity } from '../entities/wdt-withdrawal-contract.entity';

export const wdtWithdrawalContractEntityProviders = [
  {
    provide: 'WdtWithdrawalContractEntityRepository',
    useFactory: (dataSource: DataSource) =>
      dataSource.getRepository(WdtWithdrawalContractEntity),
    inject: [DATA_SOURCE],
  },
];
