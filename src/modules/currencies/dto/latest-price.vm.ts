import { ApiProperty } from '@nestjs/swagger';
import { Price } from '../entities/price.entity';

export class LatestPriceVm {
  @ApiProperty({ example: 'uuid-currency' })
  currencyId: string;

  @ApiProperty({ example: 'tBNB' })
  code: string;

  @ApiProperty({ example: 'bnb' })
  network?: string;

  @ApiProperty({ example: 'bep20' })
  networkCode?: string;

  @ApiProperty({ example: '2025-09-23T07:14:24.392Z' })
  date: Date;

  @ApiProperty({ example: '0.00' })
  usdPrice: string;

  @ApiProperty({ required: false })
  usdPriceFormatted?: string;

  @ApiProperty({ required: false })
  usdPrice24hr?: string;

  @ApiProperty({ required: false })
  usdPrice24hrUsdChange?: string;

  @ApiProperty({ required: false })
  usdPrice24hrPercentChange?: string;

  @ApiProperty({ name: '24hrPercentChange', required: false })
  '24hrPercentChange'?: string;

  constructor(price: Price) {
    this.currencyId = price.currency.id;
    this.code = price.code ?? price.currency?.code ?? '';
    this.network = price.currency?.network;
    this.networkCode = price.currency?.networkCode;
    this.date = price.createdAt;
    this.usdPrice = price.usdPrice?.toString();
    this.usdPriceFormatted = price.usdPriceFormatted;
    this.usdPrice24hr =
      price.usdPrice24hr !== null && price.usdPrice24hr !== undefined
        ? price.usdPrice24hr.toString()
        : undefined;
    this.usdPrice24hrUsdChange =
      price.usdPrice24hrUsdChange !== null &&
      price.usdPrice24hrUsdChange !== undefined
        ? price.usdPrice24hrUsdChange.toString()
        : undefined;
    this.usdPrice24hrPercentChange =
      price.usdPrice24hrPercentChange !== null &&
      price.usdPrice24hrPercentChange !== undefined
        ? price.usdPrice24hrPercentChange.toString()
        : undefined;
    this['24hrPercentChange'] = price['24hrPercentChange'] ?? undefined;
  }
}
