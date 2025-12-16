import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GetHdWalletMnemonicDto {
  @ApiProperty({
    description: 'Administrator user password',
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}
