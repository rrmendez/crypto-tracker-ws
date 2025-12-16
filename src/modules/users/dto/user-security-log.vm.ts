import { ApiProperty } from '@nestjs/swagger';
import { UserSecurityLog } from '../entities/user-security-log.entity';
import { UserSecurityActionType } from '@/common/enums/user-security-action.enum';

export class UserSecurityLogVm {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty({ enum: UserSecurityActionType })
  actionType: UserSecurityActionType;

  @ApiProperty({ required: false })
  reason?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ description: 'Created by user', required: false })
  createdBy?: { id: string; email: string; fullName: string; avatar?: string };

  constructor(log: UserSecurityLog) {
    this.id = log.id;
    this.userId = log.user.id;
    this.actionType = log.actionType;
    this.reason = log.reason;
    this.createdAt = log.createdAt;
    this.createdBy = log.createdBy
      ? {
          id: log.createdBy.id,
          email: log.createdBy.email,
          fullName: log.createdBy.fullName,
          avatar: log.createdBy.avatar,
        }
      : undefined;
  }
}
