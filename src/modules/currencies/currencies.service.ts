/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { ConflictException, Inject, Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CreateCurrencyDto } from './dto/create-currency.dto';
import { UpdateCurrencyDto } from './dto/update-currency.dto';
import { CurrencyFilterDto } from './dto/currency-filter.dto';
import { REPOSITORY } from '@/database/constants';
import {
  Between,
  DeepPartial,
  FindOptionsOrder,
  FindOptionsWhere,
  ILike,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { Currency } from './entities/currency.entity';
import { cryptoCurrencies } from '@/config/currency.config';
import { EnableDisableCurrencyDto } from './dto/enable-disable-currency.dto';
import { MoralisUtils } from '@/common/utils/moralis.utils';
import {
  CoinGeckoUtils,
  CoinGeckoMarketData,
} from '@/common/utils/coingecko.utils';
import { Price } from './entities/price.entity';
import { PriceResponseVm } from './dto/price-response.vm';
import { NetworkPriceResponseDto } from './dto/network-price-response.dto';
import { NotFoundException } from '@/common/exceptions/not-found.exception';
import { BadRequestException } from '@/common/exceptions/bad-request.exception';
import { CurrencyPrice } from '@/common/enums/currency-type.enum';
import { LatestPriceVm } from './dto/latest-price.vm';
import Decimal from 'decimal.js';

@Injectable()
export class CurrenciesService {
  private readonly logger = new Logger(CurrenciesService.name);
  constructor(
    @Inject(REPOSITORY.CURRENCIES)
    private readonly currenciesRepository: Repository<Currency>,
    @Inject(REPOSITORY.PRICES)
    private readonly priceRepository: Repository<Price>,
    private readonly moralisUtils: MoralisUtils,
    private readonly coingeckoUtils: CoinGeckoUtils,
    @InjectQueue('price-sync')
    private readonly priceSyncQueue: Queue,
  ) {}

  async create(createCurrencyDto: CreateCurrencyDto) {
    const existsCurrency = await this.currenciesRepository.findOne({
      where: { configId: createCurrencyDto.configId },
    });

    if (existsCurrency) {
      throw new ConflictException(
        `Currency with this config has already exists`,
      );
    }

    const template = cryptoCurrencies.find(
      (c) => c.id === createCurrencyDto.configId,
    );

    if (!template) {
      throw new NotFoundException({
        errorCode: 'CURRENCY_TEMPLATE_NOT_FOUND',
        i18nKey: 'errors.currency.templateNotFound',
      });
    }

    await this.getFinalPrice(
      createCurrencyDto.configId,
      createCurrencyDto.price,
    );

    const newCurrency: Partial<Currency> = {
      ...createCurrencyDto,
      price:
        createCurrencyDto.price === undefined ||
        createCurrencyDto.price === null
          ? null
          : Number(createCurrencyDto.price),
      code: template.code,
      type: template.type,
      isToken: template.isToken,
      isActive: template.isActive,
      network: template.network,
      networkCode: template.networkCode,
      smartContractAddress: template.smartContractAddress,
      chainId: template.chainId,
    };

    let currency = this.currenciesRepository.create(newCurrency);

    currency = await this.currenciesRepository.save(currency);

    try {
      await this.priceSyncQueue.add('sync-currency-price', {
        currencyId: currency.id,
      });
    } catch (error) {
      this.logger.error(
        `Error al encolar el job de sincronización de precio para currency ${currency.id}: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        error instanceof Error ? error.stack : undefined,
      );
    }

    return currency;
  }

  private async getFinalPrice(
    configId: string,
    price?: number | null,
  ): Promise<number> {
    let finalPrice = price;

    // If no price is provided, try to get it from the network
    if (finalPrice === undefined || finalPrice === null) {
      try {
        const networkPrice = await this.checkNetworkPrice(configId);
        finalPrice = networkPrice.usdPrice;
      } catch {
        // If network price not found, throw error requiring fixed price
        throw new BadRequestException({
          errorCode: 'NETWORK_PRICE_NOT_FOUND',
          i18nKey: 'errors.currency.networkPriceNotFound',
        });
      }
    }
    return finalPrice;
  }

  findAll() {
    return this.currenciesRepository.find();
  }

  async findPaginated(
    page = 1,
    limit = 10,
    filters?: CurrencyFilterDto,
  ): Promise<[Currency[], number]> {
    const where: FindOptionsWhere<Currency>[] = [];

    // Base condition (sin composerSearch)
    const baseWhere: FindOptionsWhere<Currency> = {};

    if (filters?.code) {
      baseWhere.code = filters.code;
    }
    if (filters?.name) {
      baseWhere.name = filters.name;
    }
    if (filters?.isActive !== undefined) {
      baseWhere.isActive = filters.isActive;
    }
    if (filters?.from && filters?.to) {
      baseWhere.createdAt = Between(filters.from, filters.to);
    } else if (filters?.from) {
      baseWhere.createdAt = MoreThanOrEqual(filters.from);
    } else if (filters?.to) {
      baseWhere.createdAt = LessThanOrEqual(filters.to);
    }

    // 🔍 composerSearch: búsqueda insensible a mayúsculas en múltiples campos
    if (filters?.composerSearch) {
      const search = `%${filters.composerSearch}%`;

      where.push(
        { ...baseWhere, name: ILike(search) },
        { ...baseWhere, code: ILike(search) },
        { ...baseWhere, symbol: ILike(search) },
      );
    } else {
      where.push(baseWhere);
    }

    // Orden dinámico (por defecto: createdAt ASC)
    const order: FindOptionsOrder<Currency> = {
      [filters?.orderBy ?? 'createdAt']:
        filters?.order === 'DESC' ? 'DESC' : 'ASC',
    };

    return this.currenciesRepository.findAndCount({
      take: limit,
      skip: (page - 1) * limit,
      where,
      order,
    });
  }

  async findOne(id: string) {
    const currency = await this.currenciesRepository.findOne({ where: { id } });

    if (!currency) {
      throw new NotFoundException({
        errorCode: 'CURRENCY_NOT_FOUND',
        i18nKey: 'errors.currency.notFound',
      });
    }

    return currency;
  }

  async update(id: string, updateCurrencyDto: UpdateCurrencyDto) {
    const currency = await this.currenciesRepository.findOne({ where: { id } });

    if (!currency) {
      throw new NotFoundException({
        errorCode: 'CURRENCY_NOT_FOUND',
        i18nKey: 'errors.currency.notFound',
      });
    }

    const template = cryptoCurrencies.find(
      (c) => c.id === updateCurrencyDto.configId,
    );

    if (!template) {
      throw new NotFoundException({
        errorCode: 'CURRENCY_TEMPLATE_NOT_FOUND',
        i18nKey: 'errors.currency.templateNotFound',
      });
    }

    await this.getFinalPrice(
      updateCurrencyDto.configId!,
      updateCurrencyDto.price,
    );

    const newCurrency: Partial<Currency> = {
      ...updateCurrencyDto,
      price:
        updateCurrencyDto.price === undefined ||
        updateCurrencyDto.price === null
          ? null
          : Number(updateCurrencyDto.price),
      code: template.code,
      type: template.type,
      isToken: template.isToken,
      isActive: template.isActive,
      network: template.network,
      networkCode: template.networkCode,
      smartContractAddress: template.smartContractAddress,
      chainId: template.chainId,
    };

    await this.currenciesRepository.update(id, newCurrency);

    return { ...currency, ...newCurrency };
  }

  async enableOrDisable(id: string, dto: EnableDisableCurrencyDto) {
    const currency = await this.currenciesRepository.findOne({ where: { id } });

    if (!currency) {
      throw new NotFoundException({
        errorCode: 'CURRENCY_NOT_FOUND',
        i18nKey: 'errors.currency.notFound',
      });
    }

    await this.currenciesRepository.update(id, dto);

    return { ...currency, ...dto };
  }

  async remove(id: string) {
    const currency = await this.currenciesRepository.findOne({ where: { id } });

    if (!currency) {
      throw new NotFoundException({
        errorCode: 'CURRENCY_NOT_FOUND',
        i18nKey: 'errors.currency.notFound',
      });
    }

    await this.currenciesRepository.delete(id);

    return currency;
  }

  async checkNetworkPrice(configId: string): Promise<NetworkPriceResponseDto> {
    const template = cryptoCurrencies.find((c) => c.id === configId);

    if (!template) {
      throw new NotFoundException({
        errorCode: 'CURRENCY_TEMPLATE_NOT_FOUND',
        i18nKey: 'errors.currency.templateNotFound',
      });
    }

    if (!template.chainId) {
      throw new NotFoundException({
        errorCode: 'NETWORK_PRICE_NOT_FOUND',
        i18nKey: 'errors.currency.networkPriceNotFound',
      });
    }

    const address =
      template.smartContractAddress !== 'main'
        ? template.smartContractAddress
        : undefined;

    try {
      const priceData = await this.moralisUtils.getCurrencyPrice(
        template.chainId,
        address,
      );

      return new NetworkPriceResponseDto({
        usdPrice: priceData.usdPrice,
        nativePrice: priceData.nativePrice,
      });
    } catch {
      throw new NotFoundException({
        errorCode: 'NETWORK_PRICE_NOT_FOUND',
        i18nKey: 'errors.currency.networkPriceNotFound',
      });
    }
  }

  async syncPrice(currencyId: string) {
    const currency = await this.findOne(currencyId);

    if (!currency) {
      throw new NotFoundException({
        errorCode: 'CURRENCY_NOT_FOUND',
        i18nKey: 'errors.currency.notFound',
      });
    }

    if (currency.price) {
      const price = this.priceRepository.create({
        currency,
        code: currency.code,
        usdPrice: currency.price,
      });

      return this.priceRepository.save(price);
    }

    if (!currency.chainId) {
      throw new NotFoundException({
        errorCode: 'CHAIN_ID_NOT_FOUND',
        i18nKey: 'errors.currency.chainIdNotFound',
      });
    }

    const address =
      currency.smartContractAddress !== 'main'
        ? currency.smartContractAddress
        : undefined;

    const prices = await this.moralisUtils.getCurrencyPrice(
      currency.chainId,
      address,
    );

    const price = this.priceRepository.create({
      currency,
      code: currency.code,
      usdPrice: prices.usdPrice,
      nativePrice: prices.nativePrice,
      usdPriceFormatted: (prices as CurrencyPrice).usdPriceFormatted,
      '24hrPercentChange': (prices as CurrencyPrice)['24hrPercentChange'],
    });

    return this.priceRepository.save(price);
  }

  async getPrice(currencyId: string) {
    const currency = await this.findOne(currencyId);

    if (!currency.chainId) {
      throw new NotFoundException({
        errorCode: 'CHAIN_ID_NOT_FOUND',
        i18nKey: 'errors.currency.chainIdNotFound',
      });
    }

    const price = await this.priceRepository.findOne({
      where: { currency: { id: currencyId } },
      order: { updatedAt: 'DESC' },
    });

    if (!price) {
      throw new NotFoundException({
        errorCode: 'PRICE_NOT_FOUND',
        i18nKey: 'errors.currency.priceNotFound',
      });
    }

    return new PriceResponseVm(price);
  }

  async getPrices() {
    const currencies = await this.currenciesRepository.find({
      where: { isActive: true },
      select: ['id', 'smartContractAddress', 'chainId', 'code', 'price'],
    });

    let nativePrices: CoinGeckoMarketData[] | undefined;

    // Agrupamos por chainId, por si tienes varias redes
    const chains = [...new Set(currencies.map((c) => c.chainId))];

    for (const chain of chains) {
      const chainCurrencies = currencies.filter((c) => c.chainId === chain);

      // Separamos tokens normales de nativos
      const nativeCurrencies = chainCurrencies.filter(
        (c) => c.smartContractAddress === 'main',
      );

      const tokenCurrencies = chainCurrencies.filter(
        (c) => c.smartContractAddress !== 'main',
      );

      // 🔹 Procesamos los nativos usando CoinGecko
      for (const currency of nativeCurrencies) {
        let priceData: any = {};
        if (currency.price !== null && currency.price !== undefined) {
          priceData.usdPrice = Number(currency.price);
          priceData.nativePrice = Number(currency.price);
        } else {
          // Obtener el coingeckoId del template de configuración
          const template = cryptoCurrencies.find(
            (c) => c.code === currency.code && c.chainId === currency.chainId,
          );

          if (!template) {
            throw new NotFoundException({
              errorCode: 'CURRENCY_TEMPLATE_NOT_FOUND',
              i18nKey: 'errors.currency.templateNotFound',
            });
          }

          // Usar CoinGecko para monedas nativas con coingeckoId
          if (!nativePrices) {
            nativePrices = await this.coingeckoUtils.getNativeTokenPrices();
          }

          priceData = this.coingeckoUtils.findPriceInCache(
            template.coingeckoId!,
            nativePrices,
          );
        }

        const price = this.priceRepository.create({
          ...(priceData as DeepPartial<Price>),
          code: currency.code,
          usdPrice: priceData.usdPrice ?? 0,
          currency,
          nativePrice: priceData.nativePrice,
        });

        await this.priceRepository.save(price);
      }

      // 🔹 Procesamos los tokens ERC20 en batch con getMultipleTokenPrices
      if (tokenCurrencies.length > 0) {
        const currenciesWithPrice = tokenCurrencies.filter(
          (c) => c.price !== null && c.price !== undefined,
        );

        const currenciesWithoutPrice = tokenCurrencies.filter(
          (c) => c.price === null || c.price === undefined,
        );

        for (const currency of currenciesWithPrice) {
          const price = this.priceRepository.create({
            code: currency.code,
            usdPrice: Number(currency.price),
            currency,
            nativePrice: {
              value: Number(currency.price),
            },
            usdPriceFormatted: '0.00',
          });

          await this.priceRepository.save(price);
        }

        const prices =
          currenciesWithoutPrice.length > 0
            ? await this.moralisUtils.getMultipleTokenPrices(
                chain!,
                currenciesWithoutPrice.map((c) => c.smartContractAddress!),
              )
            : [];

        for (const priceData of prices) {
          const currency = tokenCurrencies.find(
            (c) =>
              c.smartContractAddress?.toLowerCase() ===
              priceData?.tokenAddress?.toLowerCase(),
          );

          if (!currency) continue;

          const price = this.priceRepository.create({
            ...(priceData as DeepPartial<Price>),
            code: currency.code,
            usdPrice: priceData.usdPrice ?? 0,
            usdPriceFormatted: priceData.usdPriceFormatted ?? '0.00',
            currency,
            nativePrice: priceData.nativePrice,
          });

          await this.priceRepository.save(price);
        }
      }
    }

    return { success: true };
  }

  async getLatestPrices(): Promise<LatestPriceVm[]> {
    const latestPrices = await this.priceRepository
      .createQueryBuilder('price')
      .innerJoinAndSelect('price.currency', 'currency')
      .where('currency.isActive = :isActive', { isActive: true })
      .andWhere((qb) => {
        const subQuery = qb
          .subQuery()
          .select('MAX(p.updatedAt)')
          .from(Price, 'p')
          .where('p.currency_id = price.currency_id')
          .getQuery();
        return `price.updatedAt = (${subQuery})`;
      })
      .getMany();

    return latestPrices.map((p) => new LatestPriceVm(p));
  }

  /**
   * Retorna la sumatoria de balances por moneda junto con su precio USD actual y balance en USD.
   * Estructura de salida por elemento:
   * {
   *   currencyId, code, networkCode, usdPrice, balance, usdBalance
   * }
   */
  async getTotalBalanceForCurrency(): Promise<
    Array<{
      currencyId: string;
      code: string;
      name: string;
      networkCode: string | null;
      usdPrice: string | null;
      balance: string;
      usdBalance: string;
    }>
  > {
    const rows = await this.currenciesRepository
      .createQueryBuilder('c')
      .leftJoin('c.wallets', 'w')
      .where('c.isActive = :isActive', { isActive: true })
      .select('c.id', 'currencyId')
      .addSelect('c.code', 'code')
      .addSelect('c.networkCode', 'networkCode')
      .addSelect('c.name', 'name')
      .addSelect('COALESCE(SUM(w.balance), 0)', 'balance')
      .addSelect(
        (qb) =>
          qb
            .subQuery()
            .select('p.usdPrice')
            .from(Price, 'p')
            .where('p.currency_id = c.id')
            .orderBy('p.updatedAt', 'DESC')
            .limit(1),
        'usdPrice',
      )
      .groupBy('c.id')
      .addGroupBy('c.code')
      .addGroupBy('c.networkCode')
      .getRawMany<{
        currencyId: string;
        code: string;
        name: string;
        networkCode: string | null;
        balance: string;
        usdPrice: string | null;
      }>();

    return rows.map((r) => {
      const balanceStr = r.balance?.toString() ?? '0';
      const usdPriceStr =
        r.usdPrice !== null && r.usdPrice !== undefined
          ? r.usdPrice.toString()
          : null;
      const usdBalance = usdPriceStr
        ? new Decimal(usdPriceStr).times(new Decimal(balanceStr)).toFixed(2)
        : '0';
      return {
        currencyId: r.currencyId,
        code: r.code,
        name: r.name,
        networkCode: r.networkCode ?? null,
        usdPrice: usdPriceStr,
        balance: balanceStr,
        usdBalance,
      };
    });
  }
}
