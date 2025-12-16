import Decimal from 'decimal.js';
import { UserEffectiveLimitVm } from './user-effective-limit.vm';

export class UserCalculatedLimitResponseVm {
  minimumPerOperation: number;
  maximumPerOperation: number;
  maximumPerOperationAtNight: number;
  maximumPerMonth: number;
  maximumAllowed: number | string;
  isNighttime?: boolean;

  constructor(
    limit: UserEffectiveLimitVm & {
      maximumAllowed: number;
      decimals?: number;
      isNighttime?: boolean;
    },
  ) {
    this.minimumPerOperation = limit.minimumPerOperation;
    this.maximumPerOperation = limit.maximumPerOperation;
    this.maximumPerOperationAtNight = limit.maximumPerOperationAtNight;
    this.maximumPerMonth = limit.maximumPerMonth;
    this.maximumAllowed = Decimal(limit.maximumAllowed)
      .toDecimalPlaces(limit.decimals ?? 8)
      .toNumber();
    this.isNighttime = !!limit.isNighttime;
  }
}
