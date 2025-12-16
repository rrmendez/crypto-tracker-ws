import { ApiProperty } from '@nestjs/swagger';
import { UserLimit } from '../entities/user-limit.entity';
import { User } from '@/modules/users/entities/user.entity';
import { Limit } from '../entities/limit.entity';

export class UserLimitResponseVm {
  id: string;
  operation: string;
  currencyCode: string;
  minimumPerOperation: number;
  maximumPerOperation: number;
  maximumPerOperationAtNight: number;
  maximumPerOperationValidated: number;
  maximumPerOperationAtNightValidated: number;
  maximumPerMonth: number;
  maximumPerMonthValidated: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;

  @ApiProperty({
    example: {
      fullName: 'John Doe',
      email: 'john@example.com',
      phone: '+555123456789',
    },
    description: 'User information',
  })
  user: Partial<User>;

  @ApiProperty({
    description: 'Límite específico del usuario',
    type: UserLimit,
  })
  specificLimit?: {
    id: string;
    minimumPerOperation: number;
    maximumPerOperation: number;
    maximumPerOperationAtNight: number;
    maximumPerOperationValidated: number;
    maximumPerOperationAtNightValidated: number;
    maximumPerMonth: number;
    maximumPerMonthValidated: number;
    createdAt: Date;
    updatedAt: Date;
    createdBy?: string;
    updatedBy?: string;
  };

  constructor(limit: Limit, userLimit?: UserLimit, user?: User) {
    this.id = limit.id;
    this.operation = limit.operation;
    this.currencyCode = limit.currencyCode;
    this.minimumPerOperation = limit.minimumPerOperation;
    this.maximumPerOperation = limit.maximumPerOperation;
    this.maximumPerOperationAtNight = limit.maximumPerOperationAtNight;
    this.maximumPerOperationValidated = limit.maximumPerOperationValidated;
    this.maximumPerOperationAtNightValidated =
      limit.maximumPerOperationAtNightValidated;
    this.maximumPerMonth = limit.maximumPerMonth;
    this.maximumPerMonthValidated = limit.maximumPerMonthValidated;
    this.createdAt = limit.createdAt;
    this.updatedAt = limit.updatedAt;
    this.createdBy = limit.createdBy?.email;
    this.updatedBy = limit.updatedBy?.email;

    this.user = {
      fullName: userLimit?.user?.fullName || user?.fullName,
      email: userLimit?.user?.email || user?.email,
      phone: userLimit?.user?.phone || user?.phone,
    };

    this.specificLimit = userLimit
      ? {
          id: userLimit?.id,
          minimumPerOperation: userLimit?.minimumPerOperation,
          maximumPerOperation: userLimit?.maximumPerOperation,
          maximumPerOperationAtNight: userLimit?.maximumPerOperationAtNight,
          maximumPerOperationValidated: userLimit?.maximumPerOperationValidated,
          maximumPerOperationAtNightValidated:
            userLimit?.maximumPerOperationAtNightValidated,
          maximumPerMonth: userLimit?.maximumPerMonth,
          maximumPerMonthValidated: userLimit?.maximumPerMonthValidated,
          createdAt: userLimit?.createdAt,
          updatedAt: userLimit?.updatedAt,
          createdBy: userLimit?.createdBy?.email,
          updatedBy: userLimit?.updatedBy?.email,
        }
      : undefined;
  }
}
