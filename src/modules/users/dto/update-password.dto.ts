import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, MinLength } from 'class-validator';

export class UpdatePasswordDto {
  @ApiProperty({
    example: 'User*123',
  })
  @IsNotEmpty()
  password: string;

  @ApiProperty({
    example: 'NewPassword*123',
  })
  @IsNotEmpty()
  @MinLength(6)
  newPassword: string;
}
