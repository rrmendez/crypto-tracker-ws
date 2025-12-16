import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  FindOptionsWhere,
  ILike,
  MoreThanOrEqual,
  LessThanOrEqual,
  Repository,
} from 'typeorm';
import { WdtWithdrawalAuditLogEntity } from '../entities/wdt-withdrawal-audit-log.entity';
import {
  CreateWdtWithdrawalAuditLogDto,
  WdtWithdrawalAuditLogFilterDto,
} from '../dto/wdt-withdrawal-audit-log.dto';

@Injectable()
export class WdtWithdrawalAuditLogService {
  constructor(
    @InjectRepository(WdtWithdrawalAuditLogEntity)
    private readonly repo: Repository<WdtWithdrawalAuditLogEntity>,
  ) {}

  // ----------------- Helpers -----------------
  private normTopic(topic: string) {
    return topic?.trim();
  }

  // ----------------- Commands ----------------

  /** Crea una entrada de auditoría (append-only). */
  async create(
    dto: CreateWdtWithdrawalAuditLogDto,
  ): Promise<WdtWithdrawalAuditLogEntity> {
    const entity = this.repo.create({
      withdrawal_request_id: dto.withdrawal_request_id,
      topic: this.normTopic(dto.topic),
      message: dto.message,
    });
    return this.repo.save(entity);
  }

  /** Helper cómodo para otros servicios: log(topic, message, wrId?) */
  async log(topic: string, message: string, withdrawal_request_id?: string) {
    return this.create({ topic, message, withdrawal_request_id });
  }

  // ----------------- Queries -----------------

  /** Lista paginada + filtros */
  async findAll(filters: WdtWithdrawalAuditLogFilterDto) {
    const page = Math.max(1, Number(filters.page ?? 1));
    const limit = Math.max(1, Math.min(200, Number(filters.limit ?? 10)));
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<WdtWithdrawalAuditLogEntity>[] = [];
    const base: FindOptionsWhere<WdtWithdrawalAuditLogEntity> = {};

    if (filters.withdrawal_request_id) {
      base.withdrawal_request_id = filters.withdrawal_request_id;
    }
    if (filters.topic?.trim()) {
      base.topic = this.normTopic(filters.topic);
    }

    // Filtro por fechas (created_at)
    // Acepta created_from/created_to individuales o ambos (Between)
    let createdCondition: any = undefined;
    const from = filters.created_from
      ? new Date(filters.created_from)
      : undefined;
    const to = filters.created_to ? new Date(filters.created_to) : undefined;

    if (from && to) createdCondition = Between(from, to);
    else if (from) createdCondition = MoreThanOrEqual(from);
    else if (to) createdCondition = LessThanOrEqual(to);

    if (filters.q?.trim()) {
      const q = `%${filters.q.trim()}%`;
      // búsqueda libre en topic y message
      where.push({ ...base, topic: ILike(q), created_at: createdCondition });
      where.push({ ...base, message: ILike(q), created_at: createdCondition });
    } else {
      // sin búsqueda libre
      where.push(
        createdCondition ? { ...base, created_at: createdCondition } : base,
      );
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

  /** Obtener por id */
  async findOne(id: string): Promise<WdtWithdrawalAuditLogEntity> {
    const e = await this.repo.findOne({ where: { id } });
    if (!e) throw new NotFoundException('Audit log not found');
    return e;
  }

  /** Borrar registro (si necesitas limpieza puntual) */
  async remove(id: string) {
    const res = await this.repo.delete(id);
    if (!res.affected) throw new NotFoundException('Audit log not found');
    return { deleted: true };
  }
}
