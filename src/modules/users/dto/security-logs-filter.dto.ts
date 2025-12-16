/* eslint-disable prettier/prettier */
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { UserSecurityActionType } from '@/common/enums/user-security-action.enum';

export class SecurityLogsFilterDto {
  @ApiPropertyOptional({ enum: UserSecurityActionType })
  @IsOptional()
  @IsEnum(UserSecurityActionType)
  actionType?: UserSecurityActionType;

  @ApiPropertyOptional({ description: 'Filter by date (createdAt)' })
  @IsOptional()
  @IsDateString()
  createdAt?: string;
}