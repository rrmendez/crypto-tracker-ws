import { CountryEnum } from '@/common/enums/country-enum';
import { UserAddressStatusEnum } from '@/common/enums/user-address-status.enum';
import { ClientInformation } from '@/modules/client-information/entities/client-information.entity';
import { User } from '@/modules/users/entities/user.entity';
import { ApiProperty, PartialType } from '@nestjs/swagger';

export class UsersProfileResponseVm {
  @ApiProperty({
    example: 1,
    description: 'User ID',
  })
  id: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'User email',
  })
  email: string;

  @ApiProperty({
    example: 'John',
    description: 'User first name',
  })
  firstName: string;

  @ApiProperty({
    example: 'Doe',
    description: 'User last name',
  })
  lastName?: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'User full name',
  })
  fullName: string;

  @ApiProperty({
    example: '+555123456789',
    description: 'User phone number',
    required: false,
  })
  phone?: string;

  @ApiProperty({
    example: 'https://example.com/avatar.jpg',
    description: 'User avatar URL',
    required: false,
  })
  avatar?: string;

  @ApiProperty({
    example: ['admin', 'user'],
    description: 'User roles',
  })
  roles: string[];

  @ApiProperty({
    example: '2023-01-01T00:00:00Z',
    description: 'User creation date',
  })
  createdAt: Date;

  @ApiProperty({
    example: false,
    description: 'User verified',
  })
  verify: boolean;

  @ApiProperty({
    example: false,
    description: 'User blocked',
  })
  isBlocked?: boolean;

  @ApiProperty({
    example: false,
    description: 'User withdraw blocked',
  })
  withdrawBlocked?: boolean;

  @ApiProperty({
    example: false,
    description: 'User second factor enabled',
  })
  isSecondFactorEnabled?: boolean;

  @ApiProperty({
    example: 'pt',
    description: 'User language',
  })
  lang?: string;

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
  // Client Information
  // -----------------------------
  @ApiProperty({
    description: 'Client information',
    type: PartialType<ClientInformation>,
  })
  information: Partial<ClientInformation>;

  constructor(user: User) {
    this.id = user.id;
    this.email = user.email;
    this.firstName = user.firstName;
    this.lastName = user.lastName;
    this.fullName = user.fullName;
    this.phone = user.phone;
    this.avatar = user.avatar;
    this.roles = user.roles.map((role) => role.name);
    this.createdAt = user.createdAt;
    this.verify = user.verified;
    this.isBlocked = !!user.isBlocked;
    this.withdrawBlocked = !!user.withdrawBlocked;
    this.isSecondFactorEnabled = !!user.isSecondFactorEnabled;
    this.lang = user.lang;
    this.address = user.addresses.find(
      (a) => a.status === UserAddressStatusEnum.ACTIVE,
    );
    this.information = {
      cpf: user.clientInformation?.cpf ?? undefined,
      bussinessName: user.clientInformation?.bussinessName ?? undefined,
      fantasyName: user.clientInformation?.fantasyName ?? undefined,
      cnpj: user.clientInformation?.cnpj ?? undefined,
      birthday: user.clientInformation?.birthday ?? undefined,
      incorporationDate: user.clientInformation?.incorporationDate ?? undefined,
      motherName: user.clientInformation?.motherName ?? undefined,
    };
  }
}
