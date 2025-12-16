import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class CheckEmailAvailabilityDto {
  @ApiProperty({
    example: 'admin@example.com',
    description:
      'Email address to check availability for administrative account creation',
  })
  @IsEmail({}, { message: i18nValidationMessage('validations.isEmail') })
  @IsNotEmpty({ message: i18nValidationMessage('validations.isNotEmpty') })
  email: string;
}
