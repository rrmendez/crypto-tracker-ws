import { Injectable, Logger, NotFoundException } from '@nestjs/common';

export interface CoinGeckoMarketData {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_percentage_24h: number;
  price_change_24h: number;
}

export interface NativeTokenPriceResponse {
  usdPrice: number;
  nativePrice: {
    value: number;
    decimals?: number;
    name?: string;
    symbol?: string;
  };
  usdPriceFormatted?: string;
  '24hrPercentChange'?: string;
  usdPrice24hr?: number;
  usdPrice24hrPercentChange?: number;
  usdPrice24hrUsdChange?: number;
}

@Injectable()
export class CoinGeckoUtils {
  private readonly logger = new Logger(CoinGeckoUtils.name);
  private readonly baseUrl = 'https://api.coingecko.com/api/v3';

  /**
   * Obtiene precios de múltiples monedas nativas desde CoinGecko en una sola llamada.
   *
   * @returns Map con los precios indexados por coingeckoId
   */
  async getNativeTokenPrices(): Promise<CoinGeckoMarketData[]> {
    try {
      const ids = 'ethereum,binancecoin,matic-network';
      const url = `${this.baseUrl}/coins/markets?vs_currency=usd&ids=${ids}&price_change_percentage=24h`;

      this.logger.log(`Consultando CoinGecko para: ${ids}`);

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.statusText}`);
      }

      const data = (await response.json()) as CoinGeckoMarketData[];

      if (!data || data.length === 0) {
        this.logger.warn(`No se encontraron precios para: ${ids}`);
        throw new NotFoundException(`No se encontraron precios para: ${ids}`);
      }

      return data;
    } catch (error) {
      this.logger.error(
        `Error al obtener precios de CoinGecko: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Busca el precio de una moneda específica en el Map de precios.
   *
   * @param coingeckoId ID de la moneda en CoinGecko
   * @param pricesMap Map con los precios previamente obtenidos
   * @returns Precio de la moneda o lanza excepción si no se encuentra
   */
  findPriceInCache(
    coingeckoId: string,
    pricesMap: CoinGeckoMarketData[],
  ): NativeTokenPriceResponse {
    const price = pricesMap.find((item) => item.id === coingeckoId);

    if (!price) {
      throw new NotFoundException(
        `Precio no encontrado para coingeckoId: ${coingeckoId}`,
      );
    }

    return {
      usdPrice: price.current_price,
      nativePrice: {
        value: price.current_price,
        decimals: 18,
        name: price.name,
        symbol: price.symbol,
      },
      usdPriceFormatted: price.current_price?.toFixed(2) ?? '0.00',
      '24hrPercentChange':
        price.price_change_percentage_24h?.toFixed(2) ?? '0.00',
      usdPrice24hr: price.current_price - price.price_change_24h,
      usdPrice24hrPercentChange: price.price_change_percentage_24h,
      usdPrice24hrUsdChange: price.price_change_24h,
    };
  }
}
