import { Test, TestingModule } from '@nestjs/testing';
import { KycsController } from './kycs.controller';
import { KycsService } from './kycs.service';

describe('KycsController', () => {
  let controller: KycsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [KycsController],
      providers: [KycsService],
    }).compile();

    controller = module.get<KycsController>(KycsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
