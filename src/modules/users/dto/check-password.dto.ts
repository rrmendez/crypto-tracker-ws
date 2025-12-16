import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class CheckPasswordDto {
  @ApiProperty({
    example: 'User*123',
  })
  @IsNotEmpty()
  password: string;
}
