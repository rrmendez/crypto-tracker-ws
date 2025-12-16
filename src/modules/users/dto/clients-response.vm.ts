import { CountryEnum } from '@/common/enums/country-enum';
import { RoleEnum } from '@/common/enums/role.enum';
import { User } from '@/modules/users/entities/user.entity';
import { ApiProperty } from '@nestjs/swagger';
import { KycStatusEnum } from '@/common/enums/kyc-type-enum';

export class ClientsResponseVm {
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
    description: 'Account verified',
  })
  verified: boolean;

  @ApiProperty({
    example: false,
    description: 'Account blocked',
  })
  isBlocked: boolean;

  @ApiProperty({
    example: false,
    description: 'Account withdraw blocked',
  })
  withdrawBlocked: boolean;

  @ApiProperty({
    example: false,
    description: 'Second factor enabled',
  })
  isSecondFactorEnabled?: boolean;

  @ApiProperty({
    example: '123.456.789-00',
    description: 'Document number',
  })
  document?: string;

  @ApiProperty({
    example: 'BR',
    description: 'Country code',
  })
  countryCode?: CountryEnum;

  @ApiProperty({
    example: 'pt',
    description: 'User language',
  })
  lang?: string;

  @ApiProperty({
    example: 'APPROVED',
    description: 'Compliance KYC status',
    required: false,
    enum: KycStatusEnum,
  })
  complianceKycStatus?: KycStatusEnum | null;

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
    this.verified = user.verified;
    this.isBlocked = !!user.isBlocked;
    this.withdrawBlocked = !!user.withdrawBlocked;
    this.isSecondFactorEnabled = !!user.isSecondFactorEnabled;
    this.lang = user.lang;

    const isMerchant = user.roles.some(
      (role) => (role.name as RoleEnum) === RoleEnum.MERCHANT,
    );

    this.document = isMerchant
      ? user.clientInformation?.cnpj
      : user.clientInformation?.cpf;

    this.countryCode = user.addresses?.[0]?.country ?? CountryEnum.BR;

    // Find compliance KYC status
    const complianceKyc = user.kyces?.find((kyc) => kyc.isForCompliance);
    this.complianceKycStatus = complianceKyc?.status ?? null;
  }
}
