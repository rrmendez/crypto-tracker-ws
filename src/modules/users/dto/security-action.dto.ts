import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SecurityActionDto {
  @ApiPropertyOptional({ description: 'Reason for the security action' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
