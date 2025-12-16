import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Moralis from 'moralis';
import { ChainIdEnum } from '../enums/crypto-network.enum';

interface CreateStreamDto {
  webhookUrl: string;
  description: string;
  tag: string;
  chains: string[];
  includeNativeTxs: boolean;
}

const stableTokens: { [chain: string]: string } = {
  [ChainIdEnum.ETHEREUM]: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  [ChainIdEnum.BSC]: '0x55d398326f99059fF775485246999027B3197955',
  // Polygon USDT (Moralis reference): 0xC2132D05D31c914A87C6611C10748AEb04B58e8F
  // Normalize to lowercase to avoid checksum issues
  [ChainIdEnum.POLYGON]: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
};

const testnetToMainnet: Record<string, string> = {
  [ChainIdEnum.SEPOLIA]: ChainIdEnum.ETHEREUM,
  [ChainIdEnum.MUMBAI]: ChainIdEnum.POLYGON,
  [ChainIdEnum.BSC_TESTNET]: ChainIdEnum.BSC,
};

// -----------------------------------------------------------------------------

@Injectable()
export class MoralisUtils {
  private static initialized = false;

  constructor(protected readonly configService: ConfigService) {}

  /**
   * Arranca Moralis una sola vez al iniciar el modulo.
   */
  async onModuleInit() {
    // await Moralis.start({
    //   apiKey: this.configService.get<string>('MORALIS_API_KEY'),
    // });

    if (!MoralisUtils.initialized) {
      await Moralis.start({
        apiKey: this.configService.get<string>('MORALIS_API_KEY'),
      });
      MoralisUtils.initialized = true;
    }
  }

  /**
   * Obtiene el balance de una dirección en la red de Ethereum.
   *
   * @param address
   */
  async getBalance(
    address: string,
    chain: string = ChainIdEnum.ETHEREUM,
  ): Promise<string> {
    const nativeBalance = await Moralis.EvmApi.balance.getNativeBalance({
      address,
      chain,
    });

    return nativeBalance.result.balance.ether;
  }

  /**
   * Obtiene el balance de una dirección en la red de Ethereum.
   */
  async getTokenBalance(
    address: string,
    chain: string = ChainIdEnum.ETHEREUM,
    addresses?: string[],
  ) {
    const response = await Moralis.EvmApi.token.getWalletTokenBalances({
      address,
      chain,
      ...(addresses && { tokenAddresses: addresses }),
    });

    return response.toJSON();
  }

  /**
   * Crea un stream de transacciones en la red.
   *
   * @param webhookUrl
   * @param description
   * @param tag
   * @param chains
   * @param includeNativeTxs
   */
  async createStream({
    webhookUrl = 'https://webhook.site/1e7ded60-9b44-4708-8a2e-d1c86b2e82d8',
    description = 'My first stream',
    tag = 'my_stream',
    chains = ['0x61'],
    includeNativeTxs = true,
  }: CreateStreamDto) {
    const response = await Moralis.Streams.add({
      webhookUrl,
      description,
      tag,
      chains,
      includeNativeTxs,
    });

    console.log(response.toJSON().id); // print the stream id

    return response.toJSON().id;
  }

  /**
   * Agrega una o más direcciones a un stream.
   *
   * @param streamId
   * @param address
   */
  async addAddressToStream(streamId: string, address: string[]) {
    const response = await Moralis.Streams.addAddress({
      id: streamId,
      address,
    });

    console.log(
      `Direcciones agregadas al stream ${streamId}: `,
      response.toJSON(),
    );

    return response.toJSON();
  }

  /**
   * Obtiene el precio de una moneda en una cadena.
   *
   * @param chain
   * @param smartContractAddress
   */
  async getCurrencyPrice(chain: string, smartContractAddress?: string) {
    try {
      if (!smartContractAddress) {
        const chainId = testnetToMainnet[chain] ?? chain;

        return MoralisUtils.getNativeTokenPrice(chainId, stableTokens[chainId]);
      }

      // Precio de un token ERC20
      const response = await Moralis.EvmApi.token.getTokenPrice({
        chain,
        address: smartContractAddress.toLowerCase(),
      });

      return response.toJSON();
    } catch (error) {
      console.error(error);
      throw new NotFoundException('Price not found');
    }
  }

  /**
   * Get multiple token prices from Moralis API.
   *
   * @param chain
   * @param smartContractAddresses
   * @returns
   */
  async getMultipleTokenPrices(
    chain: string,
    smartContractAddresses: string[],
  ) {
    try {
      const response = await Moralis.EvmApi.token.getMultipleTokenPrices(
        {
          chain,
        },
        {
          tokens: smartContractAddresses.map((tokenAddress) => ({
            tokenAddress: tokenAddress.toLowerCase(),
          })),
        },
      );

      return response.toJSON();
    } catch (error: any) {
      console.error((error as Error).message);
      // throw new NotFoundException('Price not found');
      return smartContractAddresses.map((address) => ({
        usdPrice: 0,
        tokenSymbol: '',
        usdPriceFormatted: '0.00',
        nativePrice: {
          value: 0,
          decimals: 18,
        },
        tokenAddress: address,
      }));
    }
  }

  /******************************************************************************/
  /*******************   Auxiliary methods for Moralis   ************************/
  /******************************************************************************/

  /**
   * Obtiene el precio de la moneda nativa de la red (ETH, BNB, MATIC, etc.)
   * a partir de un token estable de referencia (ej: USDT).
   *
   * @param chain cadena EVM (ej: "0x38" para BSC, "0x1" para Ethereum)
   * @param stableToken dirección del token estable (ej: USDT)
   */
  static async getNativeTokenPrice(chain: string, stableToken: string) {
    try {
      console.log('Llamando a Moralis ::: ', chain, stableToken);

      const response = await Moralis.EvmApi.token.getTokenPrice({
        chain,
        address: stableToken.toLowerCase(),
      });

      console.log('Respuesta de Moralis ::: ', response);

      const data = response.toJSON();

      const usdPriceStable = Number(data.usdPrice); // ≈ 1 USD
      const nativeValue =
        Number(data.nativePrice?.value) /
        10 ** (data.nativePrice?.decimals || 8); // nativa por 1 USDT

      const nativePriceInUsd = usdPriceStable / nativeValue;

      return {
        symbol: data.nativePrice?.symbol,
        usdPrice: nativePriceInUsd,
        nativePrice: {
          ...data.nativePrice,
          value: 1,
        },
      };
    } catch (error) {
      console.error(error);
      throw new Error('No se pudo obtener el precio de la moneda nativa');
    }
  }
}
