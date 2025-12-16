import { CountryEnum } from '@/common/enums/country-enum';
import { ApiProperty } from '@nestjs/swagger';
import { UserAddress } from '../entities/user-address.entity';

export class UserAddressResponseVm {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: '12345-678' })
  zipCode: string;

  @ApiProperty({ example: 'Av. Paulista' })
  street: string;

  @ApiProperty({ example: '1000' })
  number: string;

  @ApiProperty({ example: 'Apto 101', required: false })
  complement?: string;

  @ApiProperty({ example: 'Bela Vista' })
  neighborhood: string;

  @ApiProperty({ example: 'São Paulo' })
  city: string;

  @ApiProperty({ example: 'SP' })
  state: string;

  @ApiProperty({ example: CountryEnum.BR })
  country: CountryEnum;

  constructor(address: UserAddress) {
    this.id = address.id;
    this.zipCode = address.zipCode;
    this.street = address.street;
    this.number = address.number;
    this.complement = address.complement;
    this.neighborhood = address.neighborhood;
    this.city = address.city;
    this.state = address.state;
    this.country = address.country;
  }
}
