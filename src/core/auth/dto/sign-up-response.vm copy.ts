import { User } from '@/modules/users/entities/user.entity';
import { ApiProperty } from '@nestjs/swagger';

export class SignUpResponseVmOld {
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
    example: ['admin', 'user'],
    description: 'User roles',
  })
  roles: string[];

  constructor(user: User) {
    this.id = user.id;
    this.email = user.email;
    this.firstName = user.firstName;
    this.lastName = user.lastName;
    this.fullName = user.fullName;
    this.phone = user.phone;
    this.roles = user.roles.map((role) => role.name);
  }
}
