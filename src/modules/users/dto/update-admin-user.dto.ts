import { NoForbiddenRoles } from '@/common/decorators/no-forbidden-roles.decorator';
import { RoleEnum } from '@/common/enums/role.enum';
import { ADMIN_ROLES } from '../constants/role.constants';
import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsEmail,
  IsEnum,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MinLength,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class UpdateAdminUserDto {
  @ApiProperty({
    example: 'John',
    description: 'User first name',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  firstName?: string;

  @ApiProperty({
    example: 'Doe',
    description: 'User last name',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  lastName?: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'User email (only modifiable if user is not active)',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    example: '+1234567890',
    description: 'User phone number',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsPhoneNumber()
  phone?: string;

  @ApiProperty({
    example: [RoleEnum.ADMIN, RoleEnum.ADMIN_CLIENT_MANAGER],
    enum: ADMIN_ROLES,
    isArray: true,
    description: 'User roles',
    required: false,
  })
  @IsOptional()
  @IsArray({ message: i18nValidationMessage('validations.isArray') })
  @ArrayNotEmpty({ message: i18nValidationMessage('validations.isNotEmpty') })
  @IsEnum(RoleEnum, {
    each: true,
    message: i18nValidationMessage('validations.isEnum'),
  })
  @NoForbiddenRoles([RoleEnum.USER, RoleEnum.MERCHANT])
  roles?: RoleEnum[];
}
