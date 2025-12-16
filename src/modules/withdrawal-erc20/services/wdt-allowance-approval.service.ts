// src/modules/withdrawal-erc20/services/wdt-allowance-approval.service.ts
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Repository } from 'typeorm';
import { WdtAllowanceApprovalEntity } from '../entities/wdt-allowance-approval.entity';
import { TxStatus } from '../enums/tx-status.enum';
import {
  CreateWdtAllowanceApprovalDto,
  UpdateWdtAllowanceApprovalDto,
  WdtAllowanceApprovalFilterDto,
} from '../dto/wdt-allowance-approval.dto';

/** DTOs mínimos sugeridos (puedes mover a /dto si ya los tienes) */

@Injectable()
export class WdtAllowanceApprovalService {
  constructor(
    @InjectRepository(WdtAllowanceApprovalEntity)
    private readonly repo: Repository<WdtAllowanceApprovalEntity>,
  ) {}

  /** Normaliza direcciones a minúsculas para consistencia */
  private normalizeAddr(addr?: string) {
    return addr?.trim().toLowerCase();
  }

  /** CREATE (admin/operacional) */
  async create(dto: CreateWdtAllowanceApprovalDto) {
    const owner = this.normalizeAddr(dto.owner_address);

    // Unicidad por (owner, token, spender, tx_hash)
    const dup = await this.repo.findOne({
      where: {
        owner_address: owner!,
        token_asset_id: dto.token_asset_id,
        spender_contract_id: dto.spender_contract_id,
        tx_hash: dto.tx_hash,
      },
    });
    if (dup) {
      throw new ConflictException(
        `Allowance approval already exists for tx ${dto.tx_hash}`,
      );
    }

    const entity = this.repo.create({
      owner_address: owner!,
      token_asset_id: dto.token_asset_id,
      spender_contract_id: dto.spender_contract_id,
      intended_amount: dto.intended_amount,
      tx_hash: dto.tx_hash,
      status: TxStatus.PENDING,
    });

    return this.repo.save(entity);
  }

  /** LIST (admin) con filtros y paginación */
  async findAll(filters: WdtAllowanceApprovalFilterDto) {
    const page = Math.max(1, Number(filters.page ?? 1));
    const limit = Math.max(1, Math.min(100, Number(filters.limit ?? 10)));
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<WdtAllowanceApprovalEntity>[] = [];
    const base: FindOptionsWhere<WdtAllowanceApprovalEntity> = {};

    if (filters.owner_address)
      base.owner_address = this.normalizeAddr(filters.owner_address)!;
    if (filters.token_asset_id) base.token_asset_id = filters.token_asset_id;
    if (filters.spender_contract_id)
      base.spender_contract_id = filters.spender_contract_id;
    if (filters.tx_hash) base.tx_hash = filters.tx_hash;
    if (filters.status) base.status = filters.status;

    if (filters.q?.trim()) {
      const q = `%${filters.q.trim()}%`;
      where.push({ ...base, owner_address: ILike(q) });
      where.push({ ...base, tx_hash: ILike(q) });
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

  /** GET by id */
  async findOne(id: string) {
    const e = await this.repo.findOne({ where: { id } });
    if (!e) throw new NotFoundException('Allowance approval not found');
    return e;
  }

  /** UPDATE (admin) */
  async update(id: string, dto: UpdateWdtAllowanceApprovalDto) {
    const entity = await this.findOne(id);

    // Si cambian llaves únicas, validar colisión
    if (
      (dto.owner_address &&
        this.normalizeAddr(dto.owner_address) !== entity.owner_address) ||
      (dto.token_asset_id && dto.token_asset_id !== entity.token_asset_id) ||
      (dto.spender_contract_id &&
        dto.spender_contract_id !== entity.spender_contract_id) ||
      (dto.tx_hash && dto.tx_hash !== entity.tx_hash)
    ) {
      const dup = await this.repo.findOne({
        where: {
          owner_address: this.normalizeAddr(
            dto.owner_address ?? entity.owner_address,
          )!,
          token_asset_id: dto.token_asset_id ?? entity.token_asset_id,
          spender_contract_id:
            dto.spender_contract_id ?? entity.spender_contract_id,
          tx_hash: dto.tx_hash ?? entity.tx_hash,
        },
      });
      if (dup && dup.id !== id) {
        throw new ConflictException(
          'Another record already exists with the same unique keys',
        );
      }
    }

    if (dto.owner_address)
      dto.owner_address = this.normalizeAddr(dto.owner_address);
    Object.assign(entity, dto);
    return this.repo.save(entity);
  }

  /** DELETE (admin) */
  async remove(id: string) {
    const res = await this.repo.delete(id);
    if (!res.affected)
      throw new NotFoundException('Allowance approval not found');
    return { deleted: true };
  }

  // ---------- Helpers operativos (útiles para el flujo on-chain) ----------

  /** Devuelve el último registro para (owner, token, spender) ordenado por created_at DESC */
  async getLatestFor(
    owner_address: string,
    token_asset_id: string,
    spender_contract_id: string,
  ) {
    return this.repo.findOne({
      where: {
        owner_address: this.normalizeAddr(owner_address)!,
        token_asset_id,
        spender_contract_id,
      },
      order: { created_at: 'DESC' },
    });
  }

  /** Busca por tx_hash */
  async getByTxHash(tx_hash: string) {
    const e = await this.repo.findOne({ where: { tx_hash } });
    if (!e)
      throw new NotFoundException(
        `Allowance approval not found for tx ${tx_hash}`,
      );
    return e;
  }

  /** Marca MINED con block_number */
  async markMinedByTx(tx_hash: string, block_number: string) {
    const e = await this.getByTxHash(tx_hash);
    e.status = TxStatus.MINED;
    e.block_number = block_number;
    return this.repo.save(e);
  }

  /** Marca CONFIRMED con block_number y confirmed_at */
  async markConfirmedByTx(
    tx_hash: string,
    block_number: string,
    confirmed_at = new Date(),
  ) {
    const e = await this.getByTxHash(tx_hash);
    e.status = TxStatus.CONFIRMED;
    e.block_number = block_number;
    e.confirmed_at = confirmed_at;
    return this.repo.save(e);
  }

  /** Marca FAILED */
  async markFailedByTx(tx_hash: string) {
    const e = await this.getByTxHash(tx_hash);
    e.status = TxStatus.FAILED;
    return this.repo.save(e);
  }

  /**
   * Upsert “conservador”: si NO existe el (owner, token, spender, tx_hash) lo crea como PENDING.
   * Si existe y está FAILED/REPLACED, lo re-graba con nuevos datos opcionales.
   */
  async upsertPending(dto: CreateWdtAllowanceApprovalDto) {
    const owner = this.normalizeAddr(dto.owner_address)!;
    const found = await this.repo.findOne({
      where: {
        owner_address: owner,
        token_asset_id: dto.token_asset_id,
        spender_contract_id: dto.spender_contract_id,
        tx_hash: dto.tx_hash,
      },
    });

    if (!found) {
      return this.create(dto);
    }

    // Si ya existe y no está FAILED/REPLACED, evita duplicar
    if (
      found.status !== TxStatus.FAILED &&
      found.status !== TxStatus.REPLACED
    ) {
      throw new ConflictException(
        `Allowance approval already tracked for tx ${dto.tx_hash}`,
      );
    }

    // Reusar registro previo
    found.owner_address = owner;
    found.intended_amount = dto.intended_amount ?? found.intended_amount;
    found.status = TxStatus.PENDING;
    found.block_number = null as unknown as undefined; // limpiar si reintentas
    found.confirmed_at = null as unknown as undefined;

    return this.repo.save(found);
  }

  /** Verifica si ya hay un CONFIRMED vigente para (owner, token, spender) */
  async hasConfirmedFor(
    owner_address: string,
    token_asset_id: string,
    spender_contract_id: string,
  ) {
    const found = await this.repo.findOne({
      where: {
        owner_address: this.normalizeAddr(owner_address)!,
        token_asset_id,
        spender_contract_id,
        status: TxStatus.CONFIRMED,
      },
      order: { confirmed_at: 'DESC' },
    });
    return !!found;
  }
}
