import { ApiProperty } from '@nestjs/swagger';
import { Price } from '../entities/price.entity';

export class PriceResponseVm {
  @ApiProperty({
    example: 'tBNB',
  })
  code: string;

  @ApiProperty({
    example: '2025-09-23T07:14:24.392Z',
  })
  date: Date;

  @ApiProperty({
    example: '0.00',
  })
  usdPrice: string;

  constructor(price: Price) {
    this.code = price.code;
    this.date = price.createdAt;
    this.usdPrice = price.usdPrice.toString();
  }
}
