import { IsBrazilianDocument } from '@/common/decorators/is-brazilian-document.decorator';
import { CountryEnum } from '@/common/enums/country-enum';
import { CreateUserAddressDto } from '@/modules/user-addresses/dto/create-user-address.dto';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, ValidateNested } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class DocumentVerificationDto {
  @ApiProperty({
    example: '12.345.678/0001-00',
    description: 'Documento a verificar',
  })
  @IsNotEmpty({ message: i18nValidationMessage('validations.isNotEmpty') })
  @IsBrazilianDocument({ message: 'Documento inválido' })
  document: string;

  @ApiProperty({
    type: PartialType(CreateUserAddressDto),
    description: 'Dirección del usuario',
    example: {
      country: CountryEnum.BR,
    },
  })
  @ValidateNested()
  @IsOptional()
  @Type(() => PartialType(CreateUserAddressDto))
  address?: Partial<CreateUserAddressDto>;
}
