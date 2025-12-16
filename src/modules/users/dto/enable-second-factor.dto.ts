import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class EnableSecondFactorDto {
  @ApiProperty({
    example: 'User*123',
  })
  @IsOptional()
  password?: string;

  @ApiProperty({
    example: '000000',
  })
  @IsOptional()
  secondFactorCode?: string;
}
