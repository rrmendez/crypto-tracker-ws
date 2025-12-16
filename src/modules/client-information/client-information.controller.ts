import { Controller } from '@nestjs/common';
import { ClientInformationService } from './client-information.service';

@Controller('client-information')
export class ClientInformationController {
  constructor(
    private readonly clientInformationService: ClientInformationService,
  ) {}
}
