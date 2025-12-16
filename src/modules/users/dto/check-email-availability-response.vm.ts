import { ApiProperty } from '@nestjs/swagger';

export class CheckEmailAvailabilityResponseVm {
  @ApiProperty({
    example: true,
    description: 'Indicates if the email is available for use',
  })
  available: boolean;

  @ApiProperty({
    example: 'admin@example.com',
    description: 'The email address that was checked',
  })
  email: string;

  constructor(available: boolean, email: string) {
    this.available = available;
    this.email = email;
  }
}
