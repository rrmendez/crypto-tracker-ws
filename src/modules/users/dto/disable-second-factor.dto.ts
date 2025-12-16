import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional } from 'class-validator';

export class DisableSecondFactorDto {
  @ApiProperty({
    example: 'User*123',
  })
  @IsNotEmpty()
  password: string;

  @ApiProperty({
    example: '000000',
  })
  @IsOptional()
  secondFactorCode?: string;
}
