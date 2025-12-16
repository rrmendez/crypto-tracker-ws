import { Test, TestingModule } from '@nestjs/testing';
import { KycsService } from './kycs.service';

describe('KycsService', () => {
  let service: KycsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [KycsService],
    }).compile();

    service = module.get<KycsService>(KycsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
