import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { WdtNetworkThresholdEntity } from '../entities/wdt-network-threshold.entity';
import {
  CreateWdtNetworkThresholdDto,
  UpdateWdtNetworkThresholdDto,
  WdtNetworkThresholdFilterDto,
} from '../dto/wdt-network-threshold.dto';

@Injectable()
export class WdtNetworkThresholdService {
  constructor(
    @InjectRepository(WdtNetworkThresholdEntity)
    private readonly repo: Repository<WdtNetworkThresholdEntity>,
  ) {}

  // -------- CREATE ----------
  async create(
    dto: CreateWdtNetworkThresholdDto,
  ): Promise<WdtNetworkThresholdEntity> {
    // Unicidad por network_id
    const exists = await this.repo.findOne({
      where: { network_id: dto.network_id },
    });
    if (exists) {
      throw new ConflictException(
        `Threshold already exists for network_id=${dto.network_id}`,
      );
    }

    const entity = this.repo.create({
      network_id: dto.network_id,
      min_native_balance_for_approve: dto.min_native_balance_for_approve,
    });

    return this.repo.save(entity);
  }

  // -------- LIST (paginado + filtros) ----------
  async findAll(filters: WdtNetworkThresholdFilterDto) {
    const page = Math.max(1, Number(filters.page ?? 1));
    const limit = Math.max(1, Math.min(100, Number(filters.limit ?? 10)));
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<WdtNetworkThresholdEntity> = {};
    if (filters.network_id) where.network_id = filters.network_id;

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
  async findOne(id: string): Promise<WdtNetworkThresholdEntity> {
    const e = await this.repo.findOne({ where: { id } });
    if (!e) throw new NotFoundException('Network threshold not found');
    return e;
  }

  // -------- GET by network_id ----------
  async getByNetworkId(
    network_id: string,
  ): Promise<WdtNetworkThresholdEntity | null> {
    return this.repo.findOne({ where: { network_id } });
  }

  // -------- UPSERT por network_id ----------
  async upsertByNetworkId(
    dto: CreateWdtNetworkThresholdDto,
  ): Promise<WdtNetworkThresholdEntity> {
    const found = await this.getByNetworkId(dto.network_id);
    if (!found) {
      return this.create(dto);
    }
    found.min_native_balance_for_approve = dto.min_native_balance_for_approve;
    return this.repo.save(found);
  }

  // -------- UPDATE ----------
  async update(
    id: string,
    dto: UpdateWdtNetworkThresholdDto,
  ): Promise<WdtNetworkThresholdEntity> {
    const entity = await this.findOne(id);

    // si permites cambiar network_id, valida unicidad
    if (dto.network_id && dto.network_id !== entity.network_id) {
      const dup = await this.repo.findOne({
        where: { network_id: dto.network_id },
      });
      if (dup) {
        throw new ConflictException(
          `Threshold already exists for network_id=${dto.network_id}`,
        );
      }
    }

    Object.assign(entity, dto);
    return this.repo.save(entity);
  }

  // -------- DELETE ----------
  async remove(id: string) {
    const res = await this.repo.delete(id);
    if (!res.affected)
      throw new NotFoundException('Network threshold not found');
    return { deleted: true };
  }
}
