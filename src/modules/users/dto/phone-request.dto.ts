import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class PhoneRequestDto {
  @ApiProperty({
    example: '+555123456789',
  })
  @IsNotEmpty()
  phone: string;
}
