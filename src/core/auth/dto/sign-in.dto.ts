import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class SignInDto {
  @ApiProperty({
    example: 'user@example.com',
  })
  @IsEmail({}, { message: i18nValidationMessage('validations.isEmail') })
  email: string;

  @ApiProperty({
    example: 'password123',
  })
  @IsString({ message: i18nValidationMessage('validations.isString') })
  @MinLength(6, { message: i18nValidationMessage('validations.minLength') })
  password: string;
}
