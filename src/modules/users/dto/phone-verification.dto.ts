import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, Matches } from 'class-validator';

export class PhoneVerificationDto {
  @ApiProperty({
    example: '+555123456789',
  })
  @IsNotEmpty()
  phone: string;

  @ApiProperty({
    example: '123456',
    description: 'Código OTP de 6 dígitos numéricos',
  })
  @IsNotEmpty()
  @Matches(/^\d{6}$/, {
    message: 'El código debe tener exactamente 6 dígitos numéricos',
  })
  code: string;
}
