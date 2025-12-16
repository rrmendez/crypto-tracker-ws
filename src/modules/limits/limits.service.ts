import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { CreateLimitDto } from './dto/create-limit.dto';
import { UpdateLimitDto } from './dto/update-limit.dto';
import { RequestLimitDto } from './dto/request-limit.dto';
import {
  LimitCurrencyCode,
  SystemOperation,
} from '@/common/enums/limit-type.enum';
import { Limit } from './entities/limit.entity';
import { FindOptionsOrder, FindOptionsWhere, Not, Repository } from 'typeorm';
import { REPOSITORY } from '@/database/constants';
import { UserLimit } from './entities/user-limit.entity';
import { UserEffectiveLimitVm } from './dto/user-effective-limit.vm';
import { WalletsService } from '../wallets/wallets.service';
import { UserCalculatedLimitResponseVm } from './dto/user-calculated-limit-response.vm';
import { UsersService } from '../users/users.service';
import { UserLimitResponseVm } from './dto/user-limit-response.vm';
import { CreateSpecificLimitDto } from './dto/create-specific-limit.dto';
import { UpdateSpecificLimitDto } from './dto/update-specific-limit.dto';
import { Price } from '../currencies/entities/price.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { TransactionStatus } from '@/common/enums/transaction-status.enum';
import Decimal from 'decimal.js';
import { UNLIMITED } from './constants/limits.constants';
import { mapOperationToTransactionType } from '@/common/utils/operation.utils';
import { ErrorCodes } from '@/common/utils/code.utils';
import { NotFoundException } from '@/common/exceptions/not-found.exception';
import { ConfigService } from '@nestjs/config';
import { DateTime } from 'luxon';

@Injectable()
export class LimitsService {
  private readonly logger = new Logger(LimitsService.name);

  // init of nighttime hour
  private startOfNighttime: string = '22';

  // end of nighttime hour
  private endOfNighttime: string = '08';

  // timezone for nighttime hour
  private timezone: string = 'America/Sao_Paulo';

  constructor(
    @Inject(REPOSITORY.LIMITS)
    private readonly limitsRepository: Repository<Limit>,
    @Inject(REPOSITORY.USER_LIMITS)
    private readonly userLimitsRepository: Repository<UserLimit>,
    @Inject(REPOSITORY.PRICES)
    private readonly priceRepository: Repository<Price>,
    @Inject(REPOSITORY.TRANSACTIONS)
    private readonly transactionsRepository: Repository<Transaction>,
    private readonly walletsService: WalletsService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {
    // get nighttime hour from config
    const start = this.configService.get<string>('NIGHTTIME_START_HOUR');
    const end = this.configService.get<string>('NIGHTTIME_END_HOUR');
    const timezone = this.configService.get<string>('NIGHTTIME_TIMEZONE');

    // set nighttime hour
    if (start) this.startOfNighttime = start;
    if (end) this.endOfNighttime = end;
    if (timezone) this.timezone = timezone;
  }

  async create(userId: string, createLimitDto: CreateLimitDto) {
    const existLimit = await this.limitsRepository.findOne({
      where: {
        operation: createLimitDto.operation,
        currencyCode: createLimitDto.currencyCode,
      },
    });

    if (existLimit) {
      throw new ConflictException('Limit already exists');
    }

    const limit = this.limitsRepository.create({
      ...createLimitDto,
      createdBy: { id: userId },
      updatedBy: { id: userId },
    });

    return await this.limitsRepository.save(limit);
  }

  getPaginatedLimits(
    page = 1,
    limit = 10,
    filters?: {
      operation?: SystemOperation;
      currencyCode?: LimitCurrencyCode;
      order?: 'ASC' | 'DESC';
      orderBy?: keyof Limit;
    },
  ): Promise<[Limit[], number]> {
    // Define el filtro base (por defecto: filtrar por usuario)
    const where: FindOptionsWhere<Limit> | FindOptionsWhere<Limit>[] = {};

    // Aplica filtros dinámicos
    if (filters?.operation) {
      where.operation = filters.operation;
    }
    if (filters?.currencyCode) {
      where.currencyCode = filters.currencyCode;
    }

    // Orden dinámico (por defecto: createdAt ASC)
    const order: FindOptionsOrder<Limit> = {
      [filters?.orderBy ?? 'createdAt']:
        filters?.order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC',
    };

    return this.limitsRepository.findAndCount({
      take: limit,
      skip: (page - 1) * limit,
      relations: ['createdBy', 'updatedBy'],
      where,
      order,
    });
  }

  async findOne(id: string) {
    const limit = await this.limitsRepository.findOne({
      where: { id },
      relations: ['createdBy', 'updatedBy'],
    });

    if (!limit) {
      throw new NotFoundException({
        errorCode: ErrorCodes.LIMIT_NOT_FOUND,
        i18nKey: 'errors.limit.notFound',
      });
    }

    return limit;
  }

  async update(id: string, userId: string, updateLimitDto: UpdateLimitDto) {
    const limit = await this.limitsRepository.findOne({
      where: { id },
    });

    if (!limit) {
      throw new NotFoundException({
        errorCode: ErrorCodes.LIMIT_NOT_FOUND,
        i18nKey: 'errors.limit.notFound',
      });
    }

    const existLimit = await this.limitsRepository.findOne({
      where: {
        operation: updateLimitDto.operation,
        currencyCode: updateLimitDto.currencyCode,
        id: Not(id),
      },
    });

    if (existLimit) {
      throw new ConflictException({
        errorCode: ErrorCodes.LIMIT_ALREADY_EXISTS,
        i18nKey: 'errors.limit.alreadyExists',
      });
    }

    await this.limitsRepository.update(id, {
      ...updateLimitDto,
      updatedBy: { id: userId },
    });

    return this.limitsRepository.findOne({
      where: { id },
      relations: ['createdBy', 'updatedBy'],
    });
  }

  async remove(id: string, username: string) {
    const limit = await this.limitsRepository.findOne({
      where: { id },
    });

    if (!limit) {
      throw new NotFoundException({
        errorCode: ErrorCodes.LIMIT_NOT_FOUND,
        i18nKey: 'errors.limit.notFound',
      });
    }

    // 👇 logueamos la acción
    this.logger.log(
      `El usuario ${username} eliminó el límite con id ${id} (operación: ${limit.operation}, moneda: ${limit.currencyCode})`,
    );

    await this.limitsRepository.delete(id);

    return limit;
  }

  async createSpecificLimit(userAdminId: string, dto: CreateSpecificLimitDto) {
    const limit = await this.limitsRepository.findOne({
      where: { id: dto.limitId },
    });

    if (!limit) {
      throw new NotFoundException({
        errorCode: ErrorCodes.LIMIT_NOT_FOUND,
        i18nKey: 'errors.limit.notFound',
      });
    }

    const user = await this.usersService.findById(dto.userId, ['roles']);

    if (!user) {
      throw new NotFoundException({
        errorCode: ErrorCodes.USER_NOT_FOUND,
        i18nKey: 'errors.user.notFound',
      });
    }

    if (!user.verified) {
      throw new BadRequestException({
        errorCode: ErrorCodes.USER_NOT_VERIFIED,
        i18nKey: 'errors.user.notVerified',
      });
    }

    const existLimit = await this.userLimitsRepository.findOne({
      where: {
        limit: { id: dto.limitId },
        user: { id: dto.userId },
      },
    });

    if (existLimit) {
      throw new ConflictException({
        errorCode: ErrorCodes.LIMIT_ALREADY_EXISTS,
        i18nKey: 'errors.limit.alreadyExists',
      });
    }

    const userLimit = this.userLimitsRepository.create({
      user: { id: dto.userId },
      limit: { id: dto.limitId },
      minimumPerOperation: dto.minimumPerOperation,
      maximumPerOperation: dto.maximumPerOperation,
      maximumPerOperationAtNight: dto.maximumPerOperationAtNight,
      maximumPerOperationValidated: dto.maximumPerOperationValidated,
      maximumPerOperationAtNightValidated:
        dto.maximumPerOperationAtNightValidated,
      maximumPerMonth: dto.maximumPerMonth,
      maximumPerMonthValidated: dto.maximumPerMonthValidated,
      createdBy: { id: userAdminId },
      updatedBy: { id: userAdminId },
    });

    const res = await this.userLimitsRepository.save(userLimit);

    return res;
  }

  async updateSpecificLimit(
    userLimitId: string,
    userAdminId: string,
    dto: UpdateSpecificLimitDto,
  ) {
    const userLimit = await this.userLimitsRepository.findOne({
      where: {
        id: userLimitId,
      },
    });

    if (!userLimit) {
      throw new NotFoundException({
        errorCode: ErrorCodes.LIMIT_NOT_FOUND,
        i18nKey: 'errors.limit.notFound',
      });
    }

    await this.userLimitsRepository.update(userLimitId, {
      ...dto,
      updatedBy: { id: userAdminId },
    });

    return { ...userLimit, ...dto };
  }

  async removeSpecificLimit(id: string, username: string) {
    const userLimit = await this.userLimitsRepository.findOne({
      where: { id },
      relations: ['limit', 'user'],
    });

    if (!userLimit) {
      throw new NotFoundException({
        errorCode: ErrorCodes.LIMIT_NOT_FOUND,
        i18nKey: 'errors.limit.notFound',
      });
    }

    await this.userLimitsRepository.delete(id);

    // 👇 logueamos la acción
    this.logger.log(
      `El usuario ${username} eliminó el límite específico con id ${id} del cliente ${userLimit.user.email}`,
    );

    return userLimit;
  }

  async getPaginatedLimitsByUserId(
    userId: string,
    page = 1,
    limit = 10,
    filters?: {
      operation?: SystemOperation;
      currencyCode?: LimitCurrencyCode;
      order?: 'ASC' | 'DESC';
      orderBy?: keyof Limit;
    },
  ): Promise<[UserLimitResponseVm[], number]> {
    // Obtener el usuario
    const user = await this.usersService.findById(userId, [
      'roles',
      'userLimits',
      'userLimits.limit',
      'userLimits.createdBy',
      'userLimits.updatedBy',
    ]);

    if (!user) {
      throw new NotFoundException({
        errorCode: ErrorCodes.USER_NOT_FOUND,
        i18nKey: 'errors.user.notFound',
      });
    }

    // Define el filtro base (por defecto: filtrar por usuario)
    const where: FindOptionsWhere<Limit> | FindOptionsWhere<Limit>[] = {};

    // Aplica filtros dinámicos
    if (filters?.operation) {
      where.operation = filters.operation;
    }
    if (filters?.currencyCode) {
      where.currencyCode = filters.currencyCode;
    }

    // Orden dinámico (por defecto: createdAt ASC)
    const order: FindOptionsOrder<Limit> = {
      [filters?.orderBy ?? 'createdAt']:
        filters?.order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC',
    };

    // Buscar todos los límites globales
    const [limits, total] = await this.limitsRepository.findAndCount({
      take: limit,
      skip: (page - 1) * limit,
      relations: ['createdBy', 'updatedBy'],
      where,
      order,
    });

    // Mapear con posibles límites específicos del usuario
    const result = limits.map((globalLimit) => {
      const userLimit = user.userLimits.find(
        (ul) =>
          ul.limit.operation === globalLimit.operation &&
          ul.limit.currencyCode === globalLimit.currencyCode,
      );
      return new UserLimitResponseVm(globalLimit, userLimit, user);
    });

    return [result, total];
  }

  async findByUser(userId: string) {
    // 1. Obtener todos los límites globales
    const limits = await this.limitsRepository.find({
      relations: ['createdBy', 'updatedBy'],
    });

    // 2. Obtener el usuario
    const user = await this.usersService.findById(userId, ['roles']);

    if (!user) {
      throw new NotFoundException({
        errorCode: ErrorCodes.USER_NOT_FOUND,
        i18nKey: 'errors.user.notFound',
      });
    }

    // 3. Obtener los límites específicos del usuario (con su relación a Limit)
    const userLimits = await this.userLimitsRepository.find({
      where: { user: { id: userId } },
      relations: ['limit', 'user'],
    });

    // 4. Mapear en un diccionario { operation-currency: UserLimit }
    const userLimitsMap = new Map<string, (typeof userLimits)[0]>();
    for (const ul of userLimits) {
      const key = `${ul.limit.operation}-${ul.limit.currencyCode}`;
      userLimitsMap.set(key, ul);
    }

    // 5. Recorrer los límites globales y devolverlos con el límite específico del usuario
    return limits.map((limit) => {
      const key = `${limit.operation}-${limit.currencyCode}`;
      const userLimit = userLimitsMap.get(key);
      return new UserEffectiveLimitVm(limit, userLimit, user);
    });
  }

  /**
   * Obtiene el último precio de una moneda desde la tabla Price
   * @param currencyId ID de la moneda
   * @returns El precio en USD
   */
  private async getLatestCurrencyPrice(currencyId: string): Promise<number> {
    const price = await this.priceRepository.findOne({
      where: { currency: { id: currencyId } },
      order: { createdAt: 'DESC' },
    });

    if (!price) {
      throw new NotFoundException({
        errorCode: ErrorCodes.CURRENCY_PRICE_NOT_FOUND,
        i18nKey: 'errors.currency.priceNotFoundForCurrency',
      });
    }

    return Number(price.usdPrice);
  }

  /**
   * Calcula el uso mensual del usuario para una operación específica
   * @param userId ID del usuario
   * @param operation Tipo de operación
   * @param walletId ID del wallet para filtrar transacciones
   * @returns El monto total usado en el mes (en USD)
   */
  private async getMonthlyUsage(
    userId: string,
    operation: SystemOperation,
    walletId: string,
  ): Promise<number> {
    // Convertir SystemOperation a TransactionType usando utilidad
    const transactionType = mapOperationToTransactionType(operation);

    // Calcular el primer día del mes actual
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Obtener transacciones del mes actual del wallet específico
    const transactions = await this.transactionsRepository
      .createQueryBuilder('transaction')
      .leftJoin('transaction.wallet', 'wallet')
      .leftJoin('wallet.user', 'user')
      .where('user.id = :userId', { userId })
      .andWhere('wallet.id = :walletId', { walletId })
      .andWhere('transaction.type = :type', { type: transactionType })
      .andWhere('transaction.status = :status', {
        status: TransactionStatus.CONFIRMED,
      })
      .andWhere('transaction.createdAt >= :startOfMonth', { startOfMonth })
      .getMany();

    // Sumar los montos
    const total = transactions.reduce((sum, tx) => {
      return sum + Number(tx.amount);
    }, 0);

    return total;
  }

  async findOneByUserIdAndWalletId(userId: string, dto: RequestLimitDto) {
    const wallet = await this.walletsService.findById(dto.walletId);

    if (!wallet) {
      throw new NotFoundException({
        errorCode: ErrorCodes.WALLET_NOT_FOUND,
        i18nKey: 'errors.wallet.notFound',
      });
    }

    const limits = await this.findByUser(userId);

    const limit = limits.find(
      (l) => (l.operation as SystemOperation) === dto.operation,
    );

    if (!limit) {
      return new UserCalculatedLimitResponseVm({
        id: '',
        operation: dto.operation,
        currencyCode: wallet.currency.code,
        minimumPerOperation: 0,
        maximumPerOperation: Infinity,
        maximumPerOperationAtNight: Infinity,
        maximumPerMonth: Infinity,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: '',
        updatedBy: '',
        maximumAllowed: Infinity,
        decimals: wallet.currency.decimals,
        isNighttime: false,
      });
    }

    // 1. Obtener el precio actual de la moneda del wallet
    const currencyPrice = await this.getLatestCurrencyPrice(wallet.currency.id);

    // 2. Convertir los límites de USD a la moneda del wallet
    //    Si algún límite es UNLIMITED, se considera ilimitado y se devuelve -1 sin convertir
    const minimumPerOperationConverted =
      limit.minimumPerOperation === UNLIMITED
        ? UNLIMITED
        : new Decimal(limit.minimumPerOperation)
            .dividedBy(currencyPrice)
            .toNumber();

    const maximumPerOperationConverted =
      +limit.maximumPerOperation === UNLIMITED
        ? UNLIMITED
        : new Decimal(limit.maximumPerOperation)
            .dividedBy(currencyPrice)
            .toDecimalPlaces(wallet.currency.decimals)
            .toNumber();

    const maximumPerOperationAtNightConverted =
      +limit.maximumPerOperationAtNight === UNLIMITED
        ? UNLIMITED
        : new Decimal(limit.maximumPerOperationAtNight)
            .dividedBy(currencyPrice)
            .toDecimalPlaces(wallet.currency.decimals)
            .toNumber();

    const maximumPerMonthConverted =
      +limit.maximumPerMonth === UNLIMITED
        ? UNLIMITED
        : new Decimal(limit.maximumPerMonth)
            .dividedBy(currencyPrice)
            .toDecimalPlaces(wallet.currency.decimals)
            .toNumber();

    // 3. Calcular el uso mensual del usuario
    const monthlyUsageInCurrency = await this.getMonthlyUsage(
      userId,
      dto.operation,
      dto.walletId,
    );

    // 4. Convertir el uso mensual a la moneda del wallet
    // El uso mensual viene en la moneda de las transacciones, asumimos misma moneda por ahora
    const monthlyUsage = monthlyUsageInCurrency;

    // 5. Calcular cuánto queda disponible del límite mensual
    //    Si es ilimitado (UNLIMITED), se mantiene -1
    const monthlyAvailable =
      maximumPerMonthConverted === UNLIMITED
        ? Infinity
        : Math.max(0, maximumPerMonthConverted - monthlyUsage);

    // 6. Obtener el balance del wallet
    const walletBalance = new Decimal(wallet.balance).toNumber();

    // 7. Determinar si es horario nocturno en Brasil
    const nowBrazil = DateTime.now().setZone(this.timezone);
    const hour = nowBrazil.hour;

    const start = parseInt(this.startOfNighttime, 10);
    const end = parseInt(this.endOfNighttime, 10);

    // Ejemplo: de 22:00 a 08:00 es noche
    const isNight = (start <= hour && hour <= 23) || (0 <= hour && hour < end);

    // 8. Seleccionar el límite por operación según hora
    const activeMaxPerOperation = isNight
      ? maximumPerOperationAtNightConverted
      : maximumPerOperationConverted;

    // 9. Calcular el maximumAllowed como el mínimo entre:
    //    - límite por operación
    //    - límite mensual disponible
    //    - balance del wallet
    const maximumAllowed = Math.min(
      activeMaxPerOperation === UNLIMITED ? Infinity : activeMaxPerOperation,
      monthlyAvailable,
      walletBalance,
    );

    // 10. Crear el objeto de respuesta con los valores convertidos
    const limitData = {
      id: limit.id,
      operation: limit.operation,
      currencyCode: limit.currencyCode,
      minimumPerOperation: minimumPerOperationConverted,
      maximumPerOperation: maximumPerOperationConverted,
      maximumPerOperationAtNight: maximumPerOperationAtNightConverted,
      maximumPerMonth: maximumPerMonthConverted,
      createdAt: limit.createdAt,
      updatedAt: limit.updatedAt,
      createdBy: limit.createdBy,
      updatedBy: limit.updatedBy,
      maximumAllowed: maximumAllowed,
      decimals: wallet.currency.decimals,
      isNighttime: isNight,
    };

    const calculated = new UserCalculatedLimitResponseVm(
      limitData as UserEffectiveLimitVm & {
        maximumAllowed: number;
        decimals?: number;
        isNighttime?: boolean;
      },
    );

    return calculated;
  }
}
