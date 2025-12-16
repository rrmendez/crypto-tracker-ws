import { Limit } from '../entities/limit.entity';

export class LimitResponseVm {
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

  constructor(limit: Limit) {
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
  }
}
