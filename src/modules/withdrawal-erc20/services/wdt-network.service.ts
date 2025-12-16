import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, ILike } from 'typeorm';
import { WdtNetworkEntity } from '../entities/wdt-network.entity';
import {
  CreateWdtNetworkDto,
  UpdateWdtNetworkDto,
  WdtNetworkFilterDto,
} from '../dto/wdt-network.dto';

@Injectable()
export class WdtNetworkService {
  constructor(
    @InjectRepository(WdtNetworkEntity)
    private readonly repo: Repository<WdtNetworkEntity>,
  ) {}

  async create(dto: CreateWdtNetworkDto): Promise<WdtNetworkEntity> {
    // Enforce unique chain_id
    const exists = await this.repo.findOne({
      where: { chain_id: dto.chain_id },
    });
    if (exists) {
      throw new ConflictException(`chain_id ${dto.chain_id} already exists`);
    }
    const entity = this.repo.create({
      chain_id: dto.chain_id,
      name: dto.name,
      native_symbol: dto.native_symbol,
      rpc_url: dto.rpc_url,
      is_active: dto.is_active ?? true,
      min_confirmations: dto.min_confirmations ?? 3,
    });
    return this.repo.save(entity);
  }

  async findAll(filters: WdtNetworkFilterDto): Promise<{
    data: WdtNetworkEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.max(1, Math.min(100, filters.limit ?? 10));
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<WdtNetworkEntity>[] = [];

    const base: FindOptionsWhere<WdtNetworkEntity> = {};
    if (typeof filters.chain_id === 'number') base.chain_id = filters.chain_id;
    if (typeof filters.is_active === 'boolean')
      base.is_active = filters.is_active;

    if (filters.q?.trim()) {
      const q = `%${filters.q.trim()}%`;
      // búsqueda por nombre o símbolo nativo
      where.push({ ...base, name: ILike(q) });
      where.push({ ...base, native_symbol: ILike(q) });
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

  async findOne(id: string): Promise<WdtNetworkEntity> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Network not found');
    return entity;
  }

  async update(
    id: string,
    dto: UpdateWdtNetworkDto,
  ): Promise<WdtNetworkEntity> {
    const entity = await this.findOne(id);

    // Si cambia chain_id, validar unicidad
    if (typeof dto.chain_id === 'number' && dto.chain_id !== entity.chain_id) {
      const dup = await this.repo.findOne({
        where: { chain_id: dto.chain_id },
      });
      if (dup)
        throw new ConflictException(`chain_id ${dto.chain_id} already exists`);
    }

    Object.assign(entity, dto);
    return this.repo.save(entity);
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    const res = await this.repo.delete(id);
    if (!res.affected) throw new NotFoundException('Network not found');
    return { deleted: true };
  }
}
