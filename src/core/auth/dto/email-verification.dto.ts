import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, Matches } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class EmailVerificationDto {
  @ApiProperty({
    example: 'user@example.com',
  })
  @IsEmail({}, { message: i18nValidationMessage('validations.isEmail') })
  @IsNotEmpty({ message: i18nValidationMessage('validations.isNotEmpty') })
  email: string;

  @ApiProperty({
    example: '123456',
    description: 'Código OTP de 6 dígitos numéricos',
  })
  @IsNotEmpty({ message: i18nValidationMessage('validations.isNotEmpty') })
  @Matches(/^\d{6}$/, {
    message: i18nValidationMessage('validations.matches'),
  })
  code: string;
}
