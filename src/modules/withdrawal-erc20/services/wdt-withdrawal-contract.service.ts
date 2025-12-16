import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Repository } from 'typeorm';
import { WdtWithdrawalContractEntity } from '../entities/wdt-withdrawal-contract.entity';
import {
  CreateWdtWithdrawalContractDto,
  UpdateWdtWithdrawalContractDto,
  WdtWithdrawalContractFilterDto,
} from '../dto/wdt-withdrawal-contract.dto';

@Injectable()
export class WdtWithdrawalContractService {
  constructor(
    @InjectRepository(WdtWithdrawalContractEntity)
    private readonly repo: Repository<WdtWithdrawalContractEntity>,
  ) {}

  // -------- helpers ----------
  private normAddr(addr?: string) {
    return addr ? addr.trim().toLowerCase() : addr;
  }

  // -------- CREATE ----------
  async create(
    dto: CreateWdtWithdrawalContractDto,
  ): Promise<WdtWithdrawalContractEntity> {
    const address = this.normAddr(dto.contract_address)!;

    // Unicidad por (network_id, contract_address)
    const dup = await this.repo.findOne({
      where: { network_id: dto.network_id, contract_address: address },
    });
    if (dup) {
      throw new ConflictException(
        `Contract ${address} already exists on this network`,
      );
    }

    // Crear
    const entity = this.repo.create({
      network_id: dto.network_id,
      contract_address: address,
      version: dto.version ?? 'v1.0.0',
      is_active: dto.is_active ?? true,
    });
    const saved = await this.repo.save(entity);

    // Si quedó activo ⇒ desactivar los otros de la misma red
    if (saved.is_active) {
      await this.deactivateOthersInNetwork(saved.network_id, saved.id);
    }

    return saved;
  }

  // -------- LIST (paginado + filtros) ----------
  async findAll(filters: WdtWithdrawalContractFilterDto) {
    const page = Math.max(1, Number(filters.page ?? 1));
    const limit = Math.max(1, Math.min(100, Number(filters.limit ?? 10)));
    const skip = (page - 1) * limit;

    const base: FindOptionsWhere<WdtWithdrawalContractEntity> = {};
    if (filters.network_id) base.network_id = filters.network_id;
    if (typeof filters.is_active === 'boolean')
      base.is_active = filters.is_active;
    if (filters.version) base.version = filters.version;
    if (filters.contract_address)
      base.contract_address = this.normAddr(filters.contract_address)!;

    const where: FindOptionsWhere<WdtWithdrawalContractEntity>[] = [];
    if (filters.q?.trim()) {
      const q = `%${filters.q.trim()}%`;
      where.push({ ...base, contract_address: ILike(q) });
      where.push({ ...base, version: ILike(q) });
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
  async findOne(id: string): Promise<WdtWithdrawalContractEntity> {
    const e = await this.repo.findOne({ where: { id } });
    if (!e) throw new NotFoundException('Withdrawal contract not found');
    return e;
  }

  // -------- UPDATE ----------
  async update(
    id: string,
    dto: UpdateWdtWithdrawalContractDto,
  ): Promise<WdtWithdrawalContractEntity> {
    const entity = await this.findOne(id);

    // si cambia (network_id, contract_address) validar unicidad
    const nextNetwork = dto.network_id ?? entity.network_id;
    const nextAddress =
      dto.contract_address !== undefined
        ? this.normAddr(dto.contract_address)!
        : entity.contract_address;

    if (
      nextNetwork !== entity.network_id ||
      nextAddress !== entity.contract_address
    ) {
      const dup = await this.repo.findOne({
        where: { network_id: nextNetwork, contract_address: nextAddress },
      });
      if (dup && dup.id !== entity.id) {
        throw new ConflictException(
          `Another contract ${nextAddress} already exists on this network`,
        );
      }
    }

    entity.network_id = nextNetwork;
    entity.contract_address = nextAddress;
    if (dto.version !== undefined) entity.version = dto.version;
    if (dto.is_active !== undefined) entity.is_active = dto.is_active;

    const saved = await this.repo.save(entity);

    // si se activó ⇒ desactivar otros de la red
    if (dto.is_active === true) {
      await this.deactivateOthersInNetwork(saved.network_id, saved.id);
    }

    return saved;
  }

  // -------- DELETE ----------
  async remove(id: string) {
    const res = await this.repo.delete(id);
    if (!res.affected)
      throw new NotFoundException('Withdrawal contract not found');
    return { deleted: true };
  }

  // -------- Helpers operativos --------

  /** Devuelve el contrato activo de una red (si existe). */
  async getActiveByNetworkId(network_id: string) {
    return this.repo.findOne({ where: { network_id, is_active: true } });
  }

  /** Asegura que solo quede activo el `id` en esa red (desactiva los demás). */
  private async deactivateOthersInNetwork(network_id: string, keepId: string) {
    await this.repo
      .createQueryBuilder()
      .update(WdtWithdrawalContractEntity)
      .set({ is_active: false })
      .where('network_id = :network_id', { network_id })
      .andWhere('id != :keepId', { keepId })
      .andWhere('is_active = true')
      .execute();
  }

  /** Cambia el estado activo y garantiza unicidad por red. */
  async setActive(id: string, isActive: boolean) {
    const entity = await this.findOne(id);
    entity.is_active = isActive;
    const saved = await this.repo.save(entity);
    if (isActive) {
      await this.deactivateOthersInNetwork(saved.network_id, saved.id);
    }
    return saved;
  }

  /** Busca por (network_id, contract_address) */
  async findByAddress(network_id: string, contract_address: string) {
    return this.repo.findOne({
      where: { network_id, contract_address: this.normAddr(contract_address)! },
    });
  }
}
