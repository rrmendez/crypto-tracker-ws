import { DATA_SOURCE, REPOSITORY } from 'src/database/constants';
import { DataSource } from 'typeorm';
import { ClientInformation } from '../entities/client-information.entity';

export const clientInformationProviders = [
  {
    provide: REPOSITORY.CLIENT_INFORMATION,
    useFactory: (dataSource: DataSource) =>
      dataSource.getRepository(ClientInformation),
    inject: [DATA_SOURCE],
  },
];
