import {
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { FindOptionsOrder, FindOptionsWhere, In, Repository } from 'typeorm';
import { CreateFeeDto } from './dto/create-fee.dto';
import { UpdateFeeDto } from './dto/update-fee.dto';
import { QueryFeeDto } from './dto/query-fee.dto';
import { QueryAdminFeeDto } from './dto/query-admin-fee.dto';
import { Fee } from './entities/fee.entity';
import { Currency } from '../currencies/entities/currency.entity';
import { REPOSITORY } from '@/database/constants';
import { FeeResponseVm } from './dto/fee-response.vm';
import { FeeDetailsVm } from './dto/fee-details.vm';
import { FeesFilterDto } from './dto/fees-filter.dto';
import { User } from '@/modules/users/entities/user.entity';
import Decimal from 'decimal.js';
import { FeeType } from '@/common/enums/fees-enum';
import { cryptoCurrencies } from '@/config/currency.config';
import { ConfigService } from '@nestjs/config';
import { TransactionsService } from '../transactions/transactions.service';

@Injectable()
export class FeesService {
  constructor(
    @Inject(REPOSITORY.FEES)
    private readonly feesRepository: Repository<Fee>,
    @Inject(REPOSITORY.CURRENCIES)
    private readonly currenciesRepository: Repository<Currency>,
    @Inject(REPOSITORY.USERS)
    private readonly usersRepository: Repository<User>,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => TransactionsService))
    private readonly transactionsService: TransactionsService,
  ) {}

  async create(
    createFeeDto: CreateFeeDto,
    userId: string,
  ): Promise<FeeDetailsVm> {
    // Verificar que la moneda existe
    const currency = await this.currenciesRepository.findOne({
      where: { id: createFeeDto.currencyId },
    });

    if (!currency) {
      throw new NotFoundException(
        `Currency with id ${createFeeDto.currencyId} not found`,
      );
    }

    const fee = this.feesRepository.create({
      ...createFeeDto,
      value: new Decimal(createFeeDto.value).toFixed(currency.decimals),
      currency,
      isActive: createFeeDto.isActive ?? true,
      createdBy: this.usersRepository.create({ id: userId }),
    });

    const savedFee = await this.feesRepository.save(fee);

    return new FeeDetailsVm(savedFee);
  }

  async getPaginatedFees(
    page = 1,
    limit = 10,
    filters?: FeesFilterDto,
  ): Promise<[Fee[], number]> {
    const where: FindOptionsWhere<Fee> | FindOptionsWhere<Fee>[] = {};

    // Aplicar filtros dinámicos
    if (filters?.operation) {
      where.operation = In(filters.operation);
    }

    if (filters?.currencyId) {
      where.currency = { id: filters.currencyId };
    }

    if (filters?.type) {
      where.type = In(filters.type);
    }

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    // Orden dinámico (por defecto: createdAt DESC)
    const order: FindOptionsOrder<Fee> = {
      [filters?.orderBy ?? 'createdAt']:
        filters?.order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC',
    };

    return this.feesRepository.findAndCount({
      take: limit,
      skip: (page - 1) * limit,
      relations: ['currency', 'createdBy', 'updatedBy'],
      where,
      order,
    });
  }

  async findOne(id: string): Promise<FeeDetailsVm> {
    const fee = await this.feesRepository.findOne({
      where: { id },
      relations: ['currency', 'createdBy', 'updatedBy'],
    });

    if (!fee) {
      throw new NotFoundException(`Fee with id ${id} not found`);
    }

    return new FeeDetailsVm(fee);
  }

  async update(
    id: string,
    updateFeeDto: UpdateFeeDto,
    userId: string,
  ): Promise<FeeDetailsVm> {
    const fee = await this.feesRepository.findOne({
      where: { id },
      relations: ['currency', 'createdBy', 'updatedBy'],
    });

    if (!fee) {
      throw new NotFoundException(`Fee with id ${id} not found`);
    }

    const { currencyId, ...safeDto } = updateFeeDto;

    await this.feesRepository.update(id, {
      ...safeDto,
      value: safeDto.value
        ? new Decimal(safeDto.value).toFixed(fee.currency.decimals)
        : undefined,
      currency: currencyId
        ? {
            id: currencyId,
          }
        : undefined,
      updatedBy: this.usersRepository.create({ id: userId }),
    });

    const updatedFee = await this.feesRepository.findOne({
      where: { id },
      relations: ['currency', 'createdBy', 'updatedBy'],
    });

    return new FeeDetailsVm(updatedFee!);
  }

  async remove(id: string): Promise<void> {
    const fee = await this.feesRepository.findOne({
      where: { id },
    });

    if (!fee) {
      throw new NotFoundException(`Fee with id ${id} not found`);
    }

    await this.feesRepository.remove(fee);
  }

  /**
   * Endpoint para clientes: consultar tasas por moneda y operación
   * Solo retorna fees activas
   */
  async queryForClient(queryFeeDto: QueryFeeDto): Promise<FeeResponseVm[]> {
    const fees = await this.feesRepository.find({
      where: {
        currency: { id: queryFeeDto.currencyId },
        operation: queryFeeDto.operation,
        isActive: true,
      },
    });

    const currency = await this.currenciesRepository.findOne({
      where: { id: queryFeeDto.currencyId },
    });

    if (!currency) {
      throw new NotFoundException(
        `No active fee found for currency ${queryFeeDto.currencyId} and operation ${queryFeeDto.operation}`,
      );
    }

    // get gas fee and address
    const config = cryptoCurrencies.find((c) => c.id === currency.configId);
    const gasFee = config?.gasFee;
    const gasFeeAddress = this.configService.get<string>(
      'ERC20_GAS_FEE_ADDRESS',
    );

    if (!fees) {
      const emptyFee = new FeeResponseVm({
        id: '',
        value: '0.00',
        type: FeeType.FIXED,
      });

      const result = [emptyFee];

      if (!!gasFee && !!gasFeeAddress) {
        result.push(
          new FeeResponseVm({
            id: '',
            value: new Decimal(gasFee ?? 0).toFixed(currency.decimals),
            type: FeeType.FIXED,
          }),
        );
      }

      return result;
    }

    const result = fees.map((fee) => new FeeResponseVm(fee));

    if (!!gasFee && !!gasFeeAddress) {
      result.push(
        new FeeResponseVm({
          id: '',
          value: new Decimal(gasFee ?? 0).toFixed(currency.decimals),
          type: FeeType.FIXED,
        }),
      );
    }

    return result;
  }

  /**
   * Endpoint para clientes: consultar tasas por moneda y operación
   * Solo retorna fees activas
   */
  async queryForCheck(queryFeeDto: QueryFeeDto): Promise<FeeResponseVm[]> {
    const fees = await this.feesRepository.find({
      where: {
        currency: { id: queryFeeDto.currencyId },
        operation: queryFeeDto.operation,
        isActive: true,
      },
    });

    if (!fees) {
      const currency = await this.currenciesRepository.findOne({
        where: { id: queryFeeDto.currencyId },
      });

      if (!currency) {
        throw new NotFoundException(
          `No active fee found for currency ${queryFeeDto.currencyId} and operation ${queryFeeDto.operation}`,
        );
      }

      const emptyFee = new FeeResponseVm({
        id: '',
        value: '0.00',
        type: FeeType.FIXED,
      });

      return [emptyFee];
    }

    return fees.map((fee) => new FeeResponseVm(fee));
  }

  /**
   * Endpoint para administradores: consultar tasas de retiro
   */
  async queryForAdmin(
    queryAdminFeeDto: QueryAdminFeeDto,
  ): Promise<FeeResponseVm[]> {
    const currency = await this.currenciesRepository.findOne({
      where: { id: queryAdminFeeDto.currencyId },
    });

    if (!currency) {
      throw new NotFoundException({
        errorCode: 'CURRENCY_NOT_FOUND',
        i18nKey: 'errors.currency.notFound',
      });
    }

    // get gas fee and address
    const config = cryptoCurrencies.find((c) => c.id === currency.configId);
    const gasFee = config?.gasFee;
    const gasFeeAddress = this.configService.get<number>(
      'ERC20_GAS_FEE_ADDRESS',
      0,
    );

    const emptyFee = new FeeResponseVm({
      id: '',
      value: '0.00',
      type: FeeType.FIXED,
    });

    const result = [emptyFee];

    if (!!gasFee && !!gasFeeAddress) {
      result.push(
        new FeeResponseVm({
          id: '',
          value: new Decimal(gasFee ?? 0).toFixed(currency.decimals),
          type: FeeType.FIXED,
        }),
      );
    }

    return result;
  }
}
