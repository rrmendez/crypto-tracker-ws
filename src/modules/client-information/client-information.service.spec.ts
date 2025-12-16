import { Test, TestingModule } from '@nestjs/testing';
import { ClientInformationService } from './client-information.service';

describe('ClientInformationService', () => {
  let service: ClientInformationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClientInformationService],
    }).compile();

    service = module.get<ClientInformationService>(ClientInformationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
