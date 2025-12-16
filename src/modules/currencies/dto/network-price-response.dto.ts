export class NetworkPriceResponseDto {
  usdPrice: number;
  symbol?: string;
  nativePrice?: any;

  constructor(data: { usdPrice: number; symbol?: string; nativePrice?: any }) {
    this.usdPrice = data.usdPrice;
    this.nativePrice = data.nativePrice;
  }
}
