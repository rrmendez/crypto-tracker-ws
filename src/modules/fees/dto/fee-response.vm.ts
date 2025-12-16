import { ApiProperty } from '@nestjs/swagger';
import { Fee } from '../entities/fee.entity';
import { FeeType } from '@/common/enums/fees-enum';

export class FeeResponseVm {
  @ApiProperty({
    description: 'ID de la tasa',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Tipo de tasa (FIXED o PERCENT)',
  })
  type: FeeType;

  @ApiProperty({
    description: 'Tasa',
  })
  value: string;

  constructor(fee: Pick<Fee, 'id' | 'type' | 'value'>) {
    this.id = fee.id;
    this.type = fee.type;
    this.value = fee.value;
  }
}
