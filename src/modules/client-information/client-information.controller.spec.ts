import { Test, TestingModule } from '@nestjs/testing';
import { ClientInformationController } from './client-information.controller';
import { ClientInformationService } from './client-information.service';

describe('ClientInformationController', () => {
  let controller: ClientInformationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClientInformationController],
      providers: [ClientInformationService],
    }).compile();

    controller = module.get<ClientInformationController>(
      ClientInformationController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
