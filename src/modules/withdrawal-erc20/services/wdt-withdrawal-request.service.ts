import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Repository } from 'typeorm';
import { WdtWithdrawalRequestEntity } from '../entities/wdt-withdrawal-request.entity';
import {
  CreateWdtWithdrawalRequestDto,
  UpdateWdtWithdrawalRequestDto,
  WdtWithdrawalRequestFilterDto,
} from '../dto/wdt-withdrawal-request.dto';
import { WithdrawalStatus } from '../enums/withdrawal-status.enum';

@Injectable()
export class WdtWithdrawalRequestService {
  constructor(
    @InjectRepository(WdtWithdrawalRequestEntity)
    private readonly repo: Repository<WdtWithdrawalRequestEntity>,
  ) {}

  // -------- helpers ----------
  private normAddr(addr?: string) {
    return addr ? addr.trim().toLowerCase() : addr;
  }

  private validateAddresses(from: string, to: string) {
    if (from.toLowerCase() === to.toLowerCase()) {
      throw new BadRequestException(
        '"from" and "to" must be different addresses',
      );
    }
  }

  // -------- CREATE ----------
  async create(
    dto: CreateWdtWithdrawalRequestDto,
  ): Promise<WdtWithdrawalRequestEntity> {
    // idempotencia por client_request_id (si viene)
    if (dto.client_request_id) {
      const exists = await this.repo.findOne({
        where: { client_request_id: dto.client_request_id },
      });
      if (exists) {
        throw new ConflictException(
          `Request already exists for client_request_id=${dto.client_request_id}`,
        );
      }
    }

    const from = this.normAddr(dto.from)!;
    const to = this.normAddr(dto.to)!;
    const addressFee = this.normAddr(dto.addressFee);

    this.validateAddresses(from, to);

    const entity = this.repo.create({
      from,
      to,
      amount: dto.amount,
      addressFee,
      amountFee: dto.amountFee,
      chain_id: dto.chain_id,

      // resueltos (pueden venir seteados desde la orquestación)
      network_id: dto.network_id,
      asset_id: dto.asset_id,

      status: dto.status ?? WithdrawalStatus.CREATED,
      client_request_id: dto.client_request_id,
    });

    return this.repo.save(entity);
  }

  // -------- LIST (paginado + filtros) ----------
  async findAll(filters: WdtWithdrawalRequestFilterDto) {
    const page = Math.max(1, Number(filters.page ?? 1));
    const limit = Math.max(1, Math.min(100, Number(filters.limit ?? 10)));
    const skip = (page - 1) * limit;

    const base: FindOptionsWhere<WdtWithdrawalRequestEntity> = {};
    if (filters.from) base.from = this.normAddr(filters.from)!;
    if (filters.to) base.to = this.normAddr(filters.to)!;
    if (typeof filters.chain_id === 'number') base.chain_id = filters.chain_id;
    if (filters.network_id) base.network_id = filters.network_id;
    if (filters.asset_id) base.asset_id = filters.asset_id;
    if (filters.status) base.status = filters.status;
    if (filters.client_request_id)
      base.client_request_id = filters.client_request_id;

    const where: FindOptionsWhere<WdtWithdrawalRequestEntity>[] = [];
    if (filters.q?.trim()) {
      const q = `%${filters.q.trim()}%`;
      where.push({ ...base, from: ILike(q) });
      where.push({ ...base, to: ILike(q) });
    } else {
      where.push(base);
    }

    const [data, total] = await this.repo.findAndCount({
      where,
      order: {
        [filters.orderBy ?? 'created_at']: filters.order ?? 'DESC',
      },
      skip,
      take: limit,
    });

    return { data, total, page, limit };
  }

  // -------- GET by id ----------
  async findOne(id: string): Promise<WdtWithdrawalRequestEntity> {
    const e = await this.repo.findOne({ where: { id } });
    if (!e) throw new NotFoundException('Withdrawal request not found');
    return e;
  }

  // -------- UPDATE ----------
  async update(
    id: string,
    dto: UpdateWdtWithdrawalRequestDto,
  ): Promise<WdtWithdrawalRequestEntity> {
    const entity = await this.findOne(id);

    // Validar idempotencia si cambia client_request_id
    if (
      dto.client_request_id &&
      dto.client_request_id !== entity.client_request_id
    ) {
      const dup = await this.repo.findOne({
        where: { client_request_id: dto.client_request_id },
      });
      if (dup)
        throw new ConflictException(
          `client_request_id ${dto.client_request_id} already exists`,
        );
    }

    if (dto.from) dto.from = this.normAddr(dto.from);
    if (dto.to) dto.to = this.normAddr(dto.to);
    if (dto.addressFee) dto.addressFee = this.normAddr(dto.addressFee);

    const next = { ...entity, ...dto };

    // Revalidar addresses si se tocaron
    if (dto.from || dto.to) {
      this.validateAddresses(next.from, next.to);
    }

    Object.assign(entity, dto);
    return this.repo.save(entity);
  }

  // -------- DELETE ----------
  async remove(id: string) {
    const res = await this.repo.delete(id);
    if (!res.affected)
      throw new NotFoundException('Withdrawal request not found');
    return { deleted: true };
  }

  // -------- Helpers operativos --------

  /** Cambia el estado (FSM queda a tu criterio a nivel de servicio/orquestador). */
  async setStatus(id: string, status: WithdrawalStatus) {
    const entity = await this.findOne(id);
    entity.status = status;
    return this.repo.save(entity);
  }

  /** Búsqueda por client_request_id (idempotencia) */
  async getByClientRequestId(client_request_id: string) {
    const e = await this.repo.findOne({ where: { client_request_id } });
    if (!e)
      throw new NotFoundException(
        'Withdrawal request not found for client_request_id',
      );
    return e;
  }

  /** Upsert por client_request_id (si no existe crea; si existe devuelve). */
  async upsertByClientRequestId(dto: CreateWdtWithdrawalRequestDto) {
    if (!dto.client_request_id) {
      return this.create(dto);
    }
    const found = await this.repo.findOne({
      where: { client_request_id: dto.client_request_id },
    });
    if (found) return found;
    return this.create(dto);
  }
}
