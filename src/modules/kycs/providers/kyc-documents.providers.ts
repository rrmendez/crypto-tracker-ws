import { DATA_SOURCE, REPOSITORY } from 'src/database/constants';
import { DataSource } from 'typeorm';
import { KycDocuments } from '../entities/kyc-documents.entity';

export const kycDocumentsProviders = [
  {
    provide: REPOSITORY.KYC_DOCUMENTS,
    useFactory: (dataSource: DataSource) =>
      dataSource.getRepository(KycDocuments),
    inject: [DATA_SOURCE],
  },
];
