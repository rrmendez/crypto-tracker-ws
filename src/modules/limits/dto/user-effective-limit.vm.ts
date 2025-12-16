import { User } from '@/modules/users/entities/user.entity';
import { Limit } from '../entities/limit.entity';
import { UserLimit } from '../entities/user-limit.entity';

export class UserEffectiveLimitVm {
  id: string; // id del limit global o del userLimit
  operation: string;
  currencyCode: string;
  minimumPerOperation: number;
  maximumPerOperation: number;
  maximumPerOperationAtNight: number;
  maximumPerMonth: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;

  constructor(limit: Limit, userLimit?: UserLimit, user?: User) {
    // Si existe un límite específico de usuario, tomamos sus valores
    if (userLimit) {
      this.id = userLimit.id;
      this.operation = limit.operation;
      this.currencyCode = limit.currencyCode;
      this.minimumPerOperation = userLimit.minimumPerOperation;

      this.maximumPerOperation = userLimit.user.verified
        ? userLimit.maximumPerOperationValidated
        : userLimit.maximumPerOperation;

      this.maximumPerOperationAtNight = userLimit.user.verified
        ? userLimit.maximumPerOperationAtNightValidated
        : userLimit.maximumPerOperationAtNight;

      this.maximumPerMonth = userLimit.user.verified
        ? userLimit.maximumPerMonthValidated
        : userLimit.maximumPerMonth;

      this.createdAt = userLimit.createdAt;
      this.updatedAt = userLimit.updatedAt;
      this.createdBy = userLimit.createdBy?.email;
      this.updatedBy = userLimit.updatedBy?.email;
    } else {
      // Si no existe, usamos el global
      this.id = limit.id;
      this.operation = limit.operation;
      this.currencyCode = limit.currencyCode;
      this.minimumPerOperation = limit.minimumPerOperation;
      this.maximumPerOperation = user?.verified
        ? limit.maximumPerOperationValidated
        : limit.maximumPerOperation;

      this.maximumPerOperationAtNight = user?.verified
        ? limit.maximumPerOperationAtNightValidated
        : limit.maximumPerOperationAtNight;

      this.maximumPerMonth = user?.verified
        ? limit.maximumPerMonthValidated
        : limit.maximumPerMonth;

      this.createdAt = limit.createdAt;
      this.updatedAt = limit.updatedAt;
      this.createdBy = limit.createdBy?.email;
      this.updatedBy = limit.updatedBy?.email;
    }
  }
}
