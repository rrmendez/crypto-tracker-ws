import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { REPOSITORY } from '@/database/constants';
import { EntityManager, ILike, In, Repository } from 'typeorm';
import { Wallet } from './entities/wallet.entity';
import { Currency } from '../currencies/entities/currency.entity';
import { User } from '../users/entities/user.entity';
import { RoleEnum } from '@/common/enums/role.enum';
import Decimal from 'decimal.js';
import { ConfigService } from '@nestjs/config';
import { HdWalletUtils } from '@/common/utils/hd-wallet.utils';
import { CurrencyTypeEnum } from '@/common/enums/currency-type.enum';
import { EvmNetworkEnum } from '@/common/enums/crypto-network.enum';
import { CryptoAddress } from './entities/crypto-address.entity';
import { TransactionType } from '@/common/enums/transaction-type.enum';
import { TransactionSymbol } from '@/common/enums/transaction-symbol.enum';
import { ErrorCodes } from '@/common/utils/code.utils';
import { MoralisUtils } from '@/common/utils/moralis.utils';

@Injectable()
export class WalletsService {
  constructor(
    @Inject(REPOSITORY.WALLETS)
    private readonly walletsRepository: Repository<Wallet>,
    @Inject(REPOSITORY.CURRENCIES)
    private readonly currenciesRepository: Repository<Currency>,
    @Inject(REPOSITORY.USERS)
    private readonly usersRepository: Repository<User>,
    @Inject(REPOSITORY.CRYPTO_ADDRESSES)
    private readonly cryptoAddressesRepository: Repository<CryptoAddress>,
    private readonly configService: ConfigService,
    private readonly hdWalletUtils: HdWalletUtils,
    private readonly moralisUtils: MoralisUtils,
  ) {}

  findById(id: string, relations: string[] = ['currency']) {
    return this.walletsRepository.findOne({
      where: { id },
      relations,
    });
  }

  async findByUserPaginated(
    userId: string,
    page = 1,
    limit = 10,
    filters?: {
      currencyActive?: boolean;
    },
  ): Promise<[Wallet[], number]> {
    return this.walletsRepository.findAndCount({
      take: limit,
      skip: (page - 1) * limit,
      where: {
        user: {
          id: userId,
        },
        ...(filters?.currencyActive && { currency: { isActive: true } }),
      },
      order: { balance: 'DESC' },
    });
  }

  async find(walletId: string): Promise<Wallet> {
    const wallet = await this.walletsRepository.findOne({
      where: {
        id: walletId,
      },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return wallet;
  }

  async findByUser(userId: string, walletId: string): Promise<Wallet | null> {
    const wallet = await this.walletsRepository.findOne({
      where: {
        user: {
          id: userId,
        },
        id: walletId,
        currency: {
          isActive: true,
        },
      },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return wallet;
  }

  async createWalletsForUser(userId: string): Promise<Wallet[]> {
    const user = await this.usersRepository.findOne({
      where: {
        id: userId,
        roles: { name: In([RoleEnum.USER, RoleEnum.MERCHANT]) },
      },
      relations: ['wallets', 'wallets.currency', 'wallets.cryptoAddress'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const activeCurrencies = await this.currenciesRepository.find({
      where: { isActive: true },
    });

    const currenciesToCreate = activeCurrencies.filter(
      (c) => !user.wallets.some((w) => w.currency.id === c.id),
    );

    // 1) Cache en memoria por red y descubrimiento de índice EVM a reutilizar
    const byNetwork = new Map<string, CryptoAddress>();

    // Lista de redes EVM admitidas
    const evmNetworks = Object.values(EvmNetworkEnum);

    // Intentar detectar si el usuario ya tiene un index EVM existente para reutilizar
    let selectedEvmIndex: number | undefined = undefined;

    // Pre‑cargar lo que ya tiene el usuario y capturar un index EVM existente
    for (const w of user.wallets) {
      if (w.cryptoAddress && w.currency?.network) {
        byNetwork.set(w.currency.network, w.cryptoAddress);

        if (
          selectedEvmIndex === undefined &&
          evmNetworks.includes(w.currency.network as EvmNetworkEnum)
        ) {
          selectedEvmIndex = w.cryptoAddress.index;
        }
      }
    }

    const newWallets: Wallet[] = [];

    for (const currency of currenciesToCreate) {
      let cryptoAddress: CryptoAddress | undefined;
      let address: string | undefined;

      if (currency.type === CurrencyTypeEnum.CRYPTO && currency.network) {
        const isEvm = evmNetworks.includes(currency.network as EvmNetworkEnum);

        // 2) primero mira el cache en memoria
        cryptoAddress = byNetwork.get(currency.network);

        if (!cryptoAddress) {
          // Determinar el índice a usar
          let indexToUse: number;

          if (isEvm) {
            // Para redes EVM reutilizamos SIEMPRE el mismo index
            if (selectedEvmIndex === undefined) {
              // Buscar el último index usado en cualquier red EVM y avanzar uno
              const lastEvm = await this.cryptoAddressesRepository.findOne({
                where: { network: In(evmNetworks as string[]) },
                order: { index: 'DESC' },
              });

              const defaultInitIndex = this.configService.get<number>(
                'ERC20_INITIAL_WALLETS_INDEX',
                0,
              );

              selectedEvmIndex = lastEvm ? lastEvm.index + 1 : defaultInitIndex;
            }
            indexToUse = selectedEvmIndex;
          } else {
            // Para no-EVM mantenemos el comportamiento anterior (por red)
            const last = await this.cryptoAddressesRepository.findOne({
              where: { network: currency.network },
              order: { index: 'DESC' },
            });

            const defaultInitIndex = this.configService.get<number>(
              'ERC20_INITIAL_WALLETS_INDEX',
              0,
            );

            indexToUse = last ? last.index + 1 : defaultInitIndex;
          }

          // Obtener la dirección (usa la misma derivación para EVM)
          const derived = this.hdWalletUtils.deriveAddress(
            this.hdWalletUtils.getxPub(this.configService.get('BNB_MNEMONIC')!),
            currency.network as EvmNetworkEnum,
            indexToUse,
          );

          const addrLc = derived.address.toLowerCase();

          // Si ya existe una CryptoAddress para esta red+address, reutilizarla
          const existing = await this.cryptoAddressesRepository.findOne({
            where: { network: currency.network, address: addrLc },
          });

          if (existing) {
            cryptoAddress = existing;
          } else {
            // Crear la entidad por red específica
            cryptoAddress = this.cryptoAddressesRepository.create({
              address: addrLc,
              network: currency.network,
              index: indexToUse,
            });

            // Guardar en base de datos
            await this.cryptoAddressesRepository.save(cryptoAddress);
          }

          // Actualiza el cache para las siguientes monedas de la misma red
          byNetwork.set(currency.network, cryptoAddress);
        }

        address = cryptoAddress.address;
      }

      const wallet = this.walletsRepository.create({
        balance: new Decimal(0).toDecimalPlaces(currency.decimals).toString(),
        isDefault:
          currency.code === this.configService.get('DEFAULT_MAIN_CURRENCY'),
        user: { id: userId },
        currency,
        address,
        cryptoAddress,
      });

      newWallets.push(wallet);
    }

    const createdWallets = await this.walletsRepository.save(newWallets);

    // 2. Agregar direcciones al stream de moralis
    const streamId = this.configService.get<string>('MORALIS_STREAM_ID');

    // 2.1 Obtener direcciones únicas
    const addresses = Array.from(
      new Set(createdWallets.map((w) => w.address!).filter(Boolean)),
    );

    // 2.2 Si existe un stream de moralis y hay direcciones nuevas, agregarlas
    if (streamId && addresses.length > 0) {
      await this.moralisUtils.addAddressToStream(streamId, addresses);
    }

    return createdWallets;
  }

  async syncWalletBalance(walletId: string): Promise<Wallet> {
    // 1. Obtener el wallet
    const wallet = await this.walletsRepository.findOne({
      where: { id: walletId },
      relations: ['currency'],
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    // 2. Obtener balance de la wallet
    // const balance = await this.moralisUtils.getBalance(wallet.address!);
    const balance = await this.hdWalletUtils.getBalance(
      wallet.address!,
      wallet.currency,
    );

    // 3. Actualizar balance
    wallet.balance = new Decimal(balance)
      .toDecimalPlaces(wallet.currency.decimals)
      .toString();

    // 4. Guardar en base de datos
    const savedWallet = await this.walletsRepository.save(wallet);

    return savedWallet;
  }

  async syncWalletBalanceTx(
    manager: EntityManager,
    walletId: string,
  ): Promise<Wallet> {
    // 1. Obtener el wallet
    const wallet = await manager.findOne(Wallet, {
      where: { id: walletId },
      relations: ['currency'],
    });

    if (!wallet) {
      throw new NotFoundException({
        errorCode: ErrorCodes.WALLET_NOT_FOUND,
        i18nKey: 'errors.wallet.notFound',
      });
    }

    // 2. Obtener balance de la wallet
    const balance = await this.hdWalletUtils.getBalance(
      wallet.address!,
      wallet.currency,
    );

    // 3. Actualizar balance
    wallet.balance = new Decimal(balance)
      .toDecimalPlaces(wallet.currency.decimals)
      .toString();

    // 4. Guardar en base de datos
    return await manager.save(Wallet, wallet);
  }

  async getByAddress(address: string): Promise<Wallet | null> {
    return this.walletsRepository.findOne({
      where: { address: address.toLowerCase() },
      relations: ['currency', 'cryptoAddress', 'user'],
    });
  }

  async getByAddressAndContract(
    chainId: string,
    address: string,
    contract: string,
  ): Promise<Wallet | null> {
    return this.walletsRepository.findOne({
      where: {
        address: address.toLowerCase(),
        currency: {
          smartContractAddress: ILike(contract),
          chainId: ILike(chainId),
        },
      },
      relations: ['currency', 'cryptoAddress', 'user'],
    });
  }

  async getWalletResume(walletId: string) {
    const incomes = await this.getSumBySymbol(
      walletId,
      TransactionSymbol.POSITIVE,
    );

    const expenses = await this.getSumBySymbol(
      walletId,
      TransactionSymbol.NEGATIVE,
    );

    return { incomes, expenses };
  }

  async getSumByOperation(walletId: string, operations: TransactionType[]) {
    const wallet = await this.walletsRepository.findOne({
      where: { id: walletId, transactions: { type: In(operations) } },
      relations: ['transactions'],
    });

    if (!wallet) {
      return new Decimal(0);
    }

    return wallet.transactions.reduce(
      (acc, t) => acc.plus(t.amount),
      new Decimal(0),
    );
  }

  async getSumBySymbol(walletId: string, symbol: TransactionSymbol) {
    const wallet = await this.walletsRepository.findOne({
      where: { id: walletId, transactions: { symbol } },
      relations: ['transactions'],
    });

    if (!wallet) {
      return new Decimal(0);
    }

    return wallet.transactions.reduce(
      (acc, t) => acc.plus(t.amount),
      new Decimal(0),
    );
  }
}
