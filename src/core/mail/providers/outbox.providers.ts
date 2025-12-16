import { DATA_SOURCE, REPOSITORY } from '@/database/constants';
import { DataSource } from 'typeorm';
import { EmailOutbox } from '../entities/email-outbox.entity';

export const emailOutboxProviders = [
  {
    provide: REPOSITORY.EMAIL_OUTBOX,
    useFactory: (dataSource: DataSource) =>
      dataSource.getRepository(EmailOutbox),
    inject: [DATA_SOURCE],
  },
];
