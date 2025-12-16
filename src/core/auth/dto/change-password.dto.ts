import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class ChangePasswordDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: i18nValidationMessage('validations.isEmail') })
  @IsNotEmpty({ message: i18nValidationMessage('validations.isNotEmpty') })
  email: string;

  @ApiProperty({ minLength: 8 })
  @IsString({ message: i18nValidationMessage('validations.isString') })
  @MinLength(8, { message: i18nValidationMessage('validations.minLength') })
  password: string;

  @ApiProperty({ description: 'Single-use reset token' })
  @IsString({ message: i18nValidationMessage('validations.isString') })
  @IsNotEmpty({ message: i18nValidationMessage('validations.isNotEmpty') })
  token: string;
}
