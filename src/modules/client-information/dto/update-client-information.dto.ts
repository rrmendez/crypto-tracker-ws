import { PartialType } from '@nestjs/swagger';
import { CreateClientInformationDto } from './create-client-information.dto';

export class UpdateClientInformationDto extends PartialType(
  CreateClientInformationDto,
) {}
