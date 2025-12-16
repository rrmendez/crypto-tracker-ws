import { ApiProperty } from '@nestjs/swagger';
import { Fee } from '../entities/fee.entity';
import { SystemOperation } from '@/common/enums/limit-type.enum';
import { FeeType } from '@/common/enums/fees-enum';

export class FeeDetailsVm {
  @ApiProperty({
    description: 'ID de la tasa',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    enum: SystemOperation,
    description: 'Tipo de operación',
  })
  operation: SystemOperation;

  @ApiProperty({
    description: 'Información de la moneda',
  })
  currency: {
    id: string;
    code: string;
    name: string;
    network?: string;
    chainId?: string;
  };

  @ApiProperty({
    enum: FeeType,
    description: 'Tipo de tasa (FIXED o PERCENT)',
  })
  type: FeeType;

  @ApiProperty({
    description: 'Tasa',
  })
  value: string;

  @ApiProperty({
    description: 'Indica si la tasa está activa',
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Fecha de creación',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Fecha de última actualización',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'Email del usuario que creó el registro',
    required: false,
  })
  createdBy?: string;

  @ApiProperty({
    description: 'Email del usuario que actualizó el registro',
    required: false,
  })
  updatedBy?: string;

  constructor(fee: Fee) {
    this.id = fee.id;
    this.operation = fee.operation;
    this.currency = {
      id: fee.currency.id,
      code: fee.currency.code,
      name: fee.currency.name,
      network: fee.currency.network,
      chainId: fee.currency.chainId,
    };
    this.type = fee.type;
    this.value = fee.value;
    this.isActive = fee.isActive;
    this.createdAt = fee.createdAt;
    this.updatedAt = fee.updatedAt;
    this.createdBy = fee.createdBy?.email;
    this.updatedBy = fee.updatedBy?.email;
  }
}
