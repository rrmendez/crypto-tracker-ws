import { User } from '@/modules/users/entities/user.entity';
import { ApiProperty } from '@nestjs/swagger';
import { CountryEnum } from '@/common/enums/country-enum';
import { UserAddress } from '@/modules/user-addresses/entities/user-address.entity';

export class SignUpResponseVm {
  @ApiProperty({ example: 'uuid', description: 'User ID' })
  id: string;

  @ApiProperty({ example: 'user@example.com', description: 'User email' })
  email: string;

  @ApiProperty({ example: 'John', description: 'User first name' })
  firstName: string;

  @ApiProperty({
    example: 'Doe',
    description: 'User last name',
    required: false,
  })
  lastName?: string;

  @ApiProperty({ example: 'John Doe', description: 'User full name' })
  fullName: string;

  @ApiProperty({
    example: '+555123456789',
    description: 'User phone number',
    required: false,
  })
  phone?: string;

  @ApiProperty({
    example: 'pt',
    description: 'User language',
    required: false,
  })
  lang?: string;

  @ApiProperty({ example: ['user'], description: 'User roles' })
  roles: string[];

  // -----------------------------
  // ClientInformation
  // -----------------------------
  @ApiProperty({
    example: '123.456.789-00',
    description: 'CPF',
    required: false,
  })
  cpf?: string;

  @ApiProperty({
    example: 'Empresa S.A.',
    description: 'Business name',
    required: false,
  })
  bussinessName?: string;

  @ApiProperty({
    example: 'Mi Tienda',
    description: 'Fantasy name',
    required: false,
  })
  fantasyName?: string;

  @ApiProperty({
    example: '12.345.678/0001-00',
    description: 'CNPJ',
    required: false,
  })
  cnpj?: string;

  @ApiProperty({
    example: '1990-05-15',
    description: 'Birthday',
    required: false,
  })
  birthday?: Date;

  @ApiProperty({
    example: '2005-03-10',
    description: 'Incorporation date',
    required: false,
  })
  incorporationDate?: Date;

  @ApiProperty({
    example: 'Jane Doe',
    description: 'Mother name',
    required: false,
  })
  motherName?: string;

  // -----------------------------
  // Address
  // -----------------------------
  @ApiProperty({
    description: 'Primary user address',
    type: Object,
  })
  address?: {
    zipCode: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    country: CountryEnum;
    status: string;
  };

  // -----------------------------
  // Tokens
  // -----------------------------
  @ApiProperty({ example: 'jwt-access-token', description: 'Access token' })
  accessToken: string;

  @ApiProperty({ example: 'jwt-refresh-token', description: 'Refresh token' })
  refreshToken: string;

  constructor(user: User, accessToken: string, refreshToken: string) {
    this.id = user.id;
    this.email = user.email;
    this.firstName = user.firstName;
    this.lastName = user.lastName;
    this.fullName = user.fullName;
    this.phone = user.phone;
    this.roles = user.roles.map((role) => role.name);
    this.lang = user.lang;

    // ClientInformation
    if (user.clientInformation) {
      this.cpf = user.clientInformation.cpf;
      this.bussinessName = user.clientInformation.bussinessName;
      this.fantasyName = user.clientInformation.fantasyName;
      this.cnpj = user.clientInformation.cnpj;
      this.birthday = user.clientInformation.birthday;
      this.incorporationDate = user.clientInformation.incorporationDate;
      this.motherName = user.clientInformation.motherName;
    }

    // Address (solo la principal)
    if (user.addresses && user.addresses.length > 0) {
      const a: UserAddress = user.addresses[0];
      this.address = {
        zipCode: a.zipCode,
        street: a.street,
        number: a.number,
        complement: a.complement,
        neighborhood: a.neighborhood,
        city: a.city,
        state: a.state,
        country: a.country,
        status: a.status,
      };
    }

    // Tokens
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
  }
}
