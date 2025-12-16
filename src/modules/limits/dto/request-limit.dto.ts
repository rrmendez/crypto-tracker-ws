import { SystemOperation } from '@/common/enums/limit-type.enum';
import { IsEnum, IsUUID } from 'class-validator';

export class RequestLimitDto {
  @IsEnum(SystemOperation)
  operation: SystemOperation;

  @IsUUID()
  walletId: string;
}
