import { NoForbiddenRoles } from '@/common/decorators/no-forbidden-roles.decorator';
import { RoleEnum } from '@/common/enums/role.enum';
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

// --------------------------------------------------------------------------------

const ADMIN_ROLES = Object.values(RoleEnum).filter(
  (r) => ![RoleEnum.USER, RoleEnum.MERCHANT].includes(r),
);

// --------------------------------------------------------------------------------

export class CreateAdminUserDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'John',
    description: 'User first name',
  })
  @IsString()
  @MinLength(2)
  firstName: string;

  @ApiProperty({
    example: 'Doe',
    description: 'User last name',
  })
  @IsString()
  @MinLength(2)
  lastName: string;

  @ApiProperty({
    example: '+1234567890',
    description: 'User phone number',
  })
  @IsString()
  @IsPhoneNumber()
  phone?: string;

  @ApiProperty({
    example: 'es',
    required: false,
  })
  @IsOptional()
  @IsEnum(['pt', 'en', 'es'])
  lang?: string;

  @ApiProperty({
    example: [RoleEnum.ADMIN, RoleEnum.ADMIN_CLIENT_MANAGER],
    enum: ADMIN_ROLES,
    isArray: true,
    description: 'User roles',
  })
  @IsArray({ message: i18nValidationMessage('validations.isArray') })
  @ArrayNotEmpty({ message: i18nValidationMessage('validations.isNotEmpty') })
  @IsEnum(RoleEnum, {
    each: true,
    message: i18nValidationMessage('validations.isEnum'),
  })
  @NoForbiddenRoles([RoleEnum.USER, RoleEnum.MERCHANT])
  roles: RoleEnum[];
}
