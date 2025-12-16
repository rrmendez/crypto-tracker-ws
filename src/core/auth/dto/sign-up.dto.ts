import { IsBrazilianDocument } from '@/common/decorators/is-brazilian-document.decorator';
import { MinAge } from '@/common/decorators/min-age-decorator';
import { CountryEnum } from '@/common/enums/country-enum';
import { RoleEnum } from '@/common/enums/role.enum';
import { CreateUserAddressDto } from '@/modules/user-addresses/dto/create-user-address.dto';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsString,
  MinLength,
  IsArray,
  IsEnum,
  IsNotEmpty,
  Matches,
  IsOptional,
  NotContains,
  ValidateIf,
  IsDateString,
  ValidateNested,
  ArrayNotEmpty,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class SignUpDto {
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
  emailVerificationCode: string;

  @ApiProperty({
    example: 'password123',
  })
  @IsString({ message: i18nValidationMessage('validations.isString') })
  @MinLength(6, { message: i18nValidationMessage('validations.minLength') })
  @IsNotEmpty({ message: i18nValidationMessage('validations.isNotEmpty') })
  password: string;

  @ApiProperty({
    example: 'John',
  })
  @IsString({ message: i18nValidationMessage('validations.isString') })
  @MinLength(2, { message: i18nValidationMessage('validations.minLength') })
  @IsNotEmpty({ message: i18nValidationMessage('validations.isNotEmpty') })
  firstName: string;

  @ApiProperty({
    example: 'Doe',
  })
  @IsString({ message: i18nValidationMessage('validations.isString') })
  @MinLength(2, { message: i18nValidationMessage('validations.minLength') })
  @IsNotEmpty({ message: i18nValidationMessage('validations.isNotEmpty') })
  lastName: string;

  @ApiProperty({
    example: '+555123456789',
    required: false,
  })
  @IsString({ message: i18nValidationMessage('validations.isString') })
  @IsOptional()
  @Matches(/^\+?[1-9]\d{6,14}$/, {
    message: i18nValidationMessage('validations.matches'),
  })
  phone?: string;

  @ApiProperty({
    example: ['merchant', 'user'],
    enum: RoleEnum,
  })
  @IsArray({ message: i18nValidationMessage('validations.isArray') })
  @ArrayNotEmpty({ message: i18nValidationMessage('validations.isNotEmpty') })
  @IsEnum(RoleEnum, {
    each: true,
    message: i18nValidationMessage('validations.isEnum'),
  })
  @NotContains('admin', { each: true })
  roles: RoleEnum[];

  // -----------------------------
  // ClientInformation fields
  // -----------------------------

  @ApiProperty({ example: '123.456.789-00' })
  @IsString({ message: i18nValidationMessage('validations.isString') })
  @IsBrazilianDocument({
    message: i18nValidationMessage('validations.isBrazilianDocument', {
      type: 'cpf',
    }),
  })
  @IsNotEmpty({ message: i18nValidationMessage('validations.isNotEmpty') })
  cpf: string;

  @ApiProperty({ example: 'Empresa S.A.', required: false })
  @ValidateIf((o: SignUpDto) => o.roles?.includes(RoleEnum.MERCHANT))
  @IsString({ message: i18nValidationMessage('validations.isString') })
  @IsNotEmpty({ message: i18nValidationMessage('validations.isNotEmpty') })
  bussinessName?: string;

  @ApiProperty({ example: 'Mi Tienda', required: false })
  @ValidateIf((o: SignUpDto) => o.roles?.includes(RoleEnum.MERCHANT))
  @IsString({ message: i18nValidationMessage('validations.isString') })
  @IsOptional()
  fantasyName?: string;

  @ApiProperty({ example: '12.345.678/0001-00', required: false })
  @ValidateIf((o: SignUpDto) => o.roles?.includes(RoleEnum.MERCHANT))
  @IsString({ message: i18nValidationMessage('validations.isString') })
  @IsBrazilianDocument({
    message: i18nValidationMessage('validations.isBrazilianDocument', {
      type: 'cnpj',
    }),
  })
  @IsNotEmpty({ message: i18nValidationMessage('validations.isNotEmpty') })
  cnpj?: string;

  @ApiProperty({ example: '1990-05-15', required: false })
  @ValidateIf((o: SignUpDto) => !o.roles?.includes(RoleEnum.MERCHANT))
  @IsDateString({}, { message: i18nValidationMessage('validations.isDate') })
  @MinAge(18, { message: i18nValidationMessage('validations.min') })
  @IsNotEmpty({ message: i18nValidationMessage('validations.isNotEmpty') })
  birthday?: Date;

  @ApiProperty({ example: '2005-03-10', required: false })
  @ValidateIf((o: SignUpDto) => o.roles?.includes(RoleEnum.MERCHANT))
  @IsDateString({}, { message: i18nValidationMessage('validations.isDate') })
  @IsNotEmpty({ message: i18nValidationMessage('validations.isNotEmpty') })
  incorporationDate?: Date;

  @ApiProperty({ example: 'Jane Doe', required: false })
  @ValidateIf((o: SignUpDto) => !o.roles?.includes(RoleEnum.MERCHANT))
  @IsString({ message: i18nValidationMessage('validations.isString') })
  @IsOptional()
  motherName?: string;

  @ApiProperty({
    type: CreateUserAddressDto,
    description: 'Direcciones del usuario',
    example: {
      zipCode: '12345-678',
      street: 'Av. Paulista',
      number: '1000',
      complement: 'Apto 101',
      neighborhood: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
      country: CountryEnum.BR,
    },
  })
  @ValidateNested()
  @Type(() => CreateUserAddressDto)
  address: CreateUserAddressDto;
}
