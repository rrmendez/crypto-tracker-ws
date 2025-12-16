import { PartialType } from '@nestjs/swagger';
import { CreateWithdrawalErc20Dto } from './create-withdrawal-erc20.dto';

export class UpdateWithdrawalErc20Dto extends PartialType(
  CreateWithdrawalErc20Dto,
) {}
