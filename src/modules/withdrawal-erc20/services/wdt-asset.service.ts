import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Repository } from 'typeorm';
import { WdtAssetEntity } from '../entities/wdt-asset.entity';
import {
  CreateWdtAssetDto,
  UpdateWdtAssetDto,
  WdtAssetFilterDto,
} from '../dto/wdt-asset.dto';

@Injectable()
export class WdtAssetService {
  constructor(
    @InjectRepository(WdtAssetEntity)
    private readonly repo: Repository<WdtAssetEntity>,
  ) {}

  // --- helpers ---
  private normAddress(addr?: string) {
    return addr ? addr.trim().toLowerCase() : addr;
  }
  private normSymbol(sym?: string) {
    return sym ? sym.trim().toUpperCase() : sym;
  }

  // --- CREATE ---
  async create(dto: CreateWdtAssetDto): Promise<WdtAssetEntity> {
    if (!dto.contract_address?.trim()) {
      throw new BadRequestException('contract_address is required for ERC-20');
    }

    const payload: Partial<WdtAssetEntity> = {
      network_id: dto.network_id,
      symbol: this.normSymbol(dto.symbol)!,
      name: dto.name.trim(),
      contract_address: this.normAddress(dto.contract_address)!,
      decimals: dto.decimals,
      is_active: dto.is_active ?? true,
    };

    // Unicidad (network_id, symbol)
    const dupSymbol = await this.repo.findOne({
      where: { network_id: payload.network_id!, symbol: payload.symbol! },
    });
    if (dupSymbol) {
      throw new ConflictException(
        `Asset with symbol=${payload.symbol} already exists on this network`,
      );
    }

    // Unicidad (network_id, contract_address)
    const dupContract = await this.repo.findOne({
      where: {
        network_id: payload.network_id!,
        contract_address: payload.contract_address!,
      },
    });
    if (dupContract) {
      throw new ConflictException(
        `Asset with contract_address=${payload.contract_address} already exists on this network`,
      );
    }

    const entity = this.repo.create(payload);
    return this.repo.save(entity);
  }

  // --- LIST ---
  async findAll(filters: WdtAssetFilterDto) {
    const page = Math.max(1, Number(filters.page ?? 1));
    const limit = Math.max(1, Math.min(100, Number(filters.limit ?? 10)));
    const skip = (page - 1) * limit;

    const base: FindOptionsWhere<WdtAssetEntity> = {};
    if (filters.network_id) base.network_id = filters.network_id;
    if (typeof filters.is_active === 'boolean')
      base.is_active = filters.is_active;
    if (filters.symbol) base.symbol = this.normSymbol(filters.symbol)!;
    if (filters.contract_address)
      base.contract_address = this.normAddress(filters.contract_address)!;

    const where: FindOptionsWhere<WdtAssetEntity>[] = [];
    if (filters.q?.trim()) {
      const q = `%${filters.q.trim()}%`;
      where.push({ ...base, symbol: ILike(q) });
      where.push({ ...base, name: ILike(q) });
      where.push({ ...base, contract_address: ILike(q) });
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

  // --- GET by id ---
  async findOne(id: string): Promise<WdtAssetEntity> {
    const e = await this.repo.findOne({ where: { id } });
    if (!e) throw new NotFoundException('Asset not found');
    return e;
  }

  async findOneByContractAddress(
    contract_address: string,
  ): Promise<WdtAssetEntity> {
    if (!contract_address) {
      throw new BadRequestException('contract_address is required');
    }

    const normalized = contract_address.trim().toLowerCase();

    console.log('Contract address ::: ', normalized);

    const asset = await this.repo.findOne({
      where: { contract_address: normalized },
    });

    if (!asset) {
      throw new NotFoundException(`Asset not found for contract ${normalized}`);
    }

    return asset;
  }

  // --- UPDATE ---
  async update(id: string, dto: UpdateWdtAssetDto): Promise<WdtAssetEntity> {
    const entity = await this.findOne(id);

    const next: Partial<WdtAssetEntity> = {
      network_id: dto.network_id ?? entity.network_id,
      symbol: this.normSymbol(dto.symbol) ?? entity.symbol,
      name: dto.name?.trim() ?? entity.name,
      contract_address:
        dto.contract_address === undefined
          ? entity.contract_address
          : this.normAddress(dto.contract_address),
      decimals: dto.decimals ?? entity.decimals,
      is_active: dto.is_active ?? entity.is_active,
    };

    // Validación: siempre ERC-20 ⇒ contract_address requerido
    if (!next.contract_address?.trim()) {
      throw new BadRequestException('contract_address is required for ERC-20');
    }

    // Unicidad (network_id, symbol)
    if (
      next.network_id !== entity.network_id ||
      next.symbol !== entity.symbol
    ) {
      const dupSymbol = await this.repo.findOne({
        where: { network_id: next.network_id!, symbol: next.symbol! },
      });
      if (dupSymbol && dupSymbol.id !== entity.id) {
        throw new ConflictException(
          `Another asset with symbol=${next.symbol} already exists on this network`,
        );
      }
    }

    // Unicidad (network_id, contract_address)
    if (
      next.network_id !== entity.network_id ||
      next.contract_address !== entity.contract_address
    ) {
      const dupContract = await this.repo.findOne({
        where: {
          network_id: next.network_id!,
          contract_address: next.contract_address,
        },
      });
      if (dupContract && dupContract.id !== entity.id) {
        throw new ConflictException(
          `Another asset with contract_address=${next.contract_address} already exists on this network`,
        );
      }
    }

    Object.assign(entity, next);
    return this.repo.save(entity);
  }

  // --- DELETE ---
  async remove(id: string) {
    const res = await this.repo.delete(id);
    if (!res.affected) throw new NotFoundException('Asset not found');
    return { deleted: true };
  }

  // --- Helpers ---
  /** Busca por (network_id, symbol) */
  async getBySymbol(network_id: string, symbol: string) {
    return this.repo.findOne({
      where: { network_id, symbol: this.normSymbol(symbol)! },
    });
  }

  /** Busca por (network_id, contract_address) */
  async getByContract(network_id: string, contract_address: string) {
    return this.repo.findOne({
      where: {
        network_id,
        contract_address: this.normAddress(contract_address)!,
      },
    });
  }
}
