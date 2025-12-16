import { User } from '@/modules/users/entities/user.entity';
import { ApiProperty } from '@nestjs/swagger';
import { UserSecurityActionType } from '@/common/enums/user-security-action.enum';

export class UsersResponseVm {
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
    example: false,
    description: 'User blocked',
  })
  isBlocked?: boolean;

  @ApiProperty({
    example: false,
    description: 'User account verified',
  })
  verified: boolean;

  @ApiProperty({
    example: false,
    description: 'Second factor enabled',
  })
  isSecondFactorEnabled?: boolean;

  @ApiProperty({
    example: '2023-01-01T00:00:00Z',
    description: 'User creation date',
  })
  createdAt: Date;

  @ApiProperty({
    example: 'user@example.com',
    description: 'Admin user who created the user',
  })
  createdBy?: string;

  constructor(user: User) {
    this.id = user.id;
    this.email = user.email;
    this.firstName = user.firstName;
    this.lastName = user.lastName;
    this.fullName = user.fullName;
    this.phone = user.phone;
    this.avatar = user.avatar;
    this.isBlocked = user.isBlocked;
    this.verified = user.verified;
    this.roles = user.roles.map((role) => role.name);
    this.createdAt = user.createdAt;
    this.isSecondFactorEnabled = !!user.isSecondFactorEnabled;

    if (user.securityLogs) {
      const adminLog = user.securityLogs.find(
        (log) => log.actionType === UserSecurityActionType.ADMIN_USER_CREATED,
      );
      this.createdBy = adminLog ? adminLog.createdBy?.email : undefined;
    }
  }
}
