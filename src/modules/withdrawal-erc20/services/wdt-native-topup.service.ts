import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Repository } from 'typeorm';
import { WdtNativeTopupEntity } from '../entities/wdt-native-topup.entity';
import { TxStatus } from '../enums/tx-status.enum';
import {
  CreateWdtNativeTopupDto,
  UpdateWdtNativeTopupDto,
  WdtNativeTopupFilterDto,
} from '../dto/wdt-native-topup.dto';

@Injectable()
export class WdtNativeTopupService {
  constructor(
    @InjectRepository(WdtNativeTopupEntity)
    private readonly repo: Repository<WdtNativeTopupEntity>,
  ) {}

  // -------- helpers ----------
  private normAddr(addr?: string) {
    return addr ? addr.trim().toLowerCase() : addr;
  }

  // -------- CRUD --------------

  /** CREATE */
  async create(dto: CreateWdtNativeTopupDto): Promise<WdtNativeTopupEntity> {
    // Unicidad por tx_hash
    const exists = await this.repo.findOne({ where: { tx_hash: dto.tx_hash } });
    if (exists) {
      throw new ConflictException(
        `Top-up already exists for tx ${dto.tx_hash}`,
      );
    }

    const entity = this.repo.create({
      to_address: this.normAddr(dto.to_address)!,
      network_id: dto.network_id,
      amount_native: dto.amount_native,
      funding_source_address: this.normAddr(dto.funding_source_address)!,
      tx_hash: dto.tx_hash,
      status: dto.status ?? TxStatus.PENDING,
      block_number: dto.block_number,
      confirmed_at: dto.confirmed_at,
    });

    return this.repo.save(entity);
  }

  /** LIST (paginado + filtros) */
  async findAll(filters: WdtNativeTopupFilterDto) {
    const page = Math.max(1, Number(filters.page ?? 1));
    const limit = Math.max(1, Math.min(100, Number(filters.limit ?? 10)));
    const skip = (page - 1) * limit;

    const base: FindOptionsWhere<WdtNativeTopupEntity> = {};
    if (filters.network_id) base.network_id = filters.network_id;
    if (filters.to_address)
      base.to_address = this.normAddr(filters.to_address)!;
    if (filters.funding_source_address)
      base.funding_source_address = this.normAddr(
        filters.funding_source_address,
      )!;
    if (filters.tx_hash) base.tx_hash = filters.tx_hash;
    if (filters.status) base.status = filters.status;

    const where: FindOptionsWhere<WdtNativeTopupEntity>[] = [];
    if (filters.q?.trim()) {
      const q = `%${filters.q.trim()}%`;
      where.push({ ...base, to_address: ILike(q) });
      where.push({ ...base, funding_source_address: ILike(q) });
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
  async findOne(id: string): Promise<WdtNativeTopupEntity> {
    const e = await this.repo.findOne({ where: { id } });
    if (!e) throw new NotFoundException('Native top-up not found');
    return e;
  }

  /** UPDATE */
  async update(
    id: string,
    dto: UpdateWdtNativeTopupDto,
  ): Promise<WdtNativeTopupEntity> {
    const entity = await this.findOne(id);

    // Si cambia tx_hash, validar unicidad
    if (dto.tx_hash && dto.tx_hash !== entity.tx_hash) {
      const dup = await this.repo.findOne({ where: { tx_hash: dto.tx_hash } });
      if (dup)
        throw new ConflictException(
          `Top-up already exists for tx ${dto.tx_hash}`,
        );
    }

    if (dto.to_address) dto.to_address = this.normAddr(dto.to_address);
    if (dto.funding_source_address)
      dto.funding_source_address = this.normAddr(dto.funding_source_address);

    Object.assign(entity, dto);
    return this.repo.save(entity);
  }

  /** DELETE */
  async remove(id: string) {
    const res = await this.repo.delete(id);
    if (!res.affected) throw new NotFoundException('Native top-up not found');
    return { deleted: true };
  }

  // -------- Helpers operativos (para el flujo on-chain) --------

  /** Busca por tx_hash */
  async getByTxHash(tx_hash: string) {
    const e = await this.repo.findOne({ where: { tx_hash } });
    if (!e)
      throw new NotFoundException(`Native top-up not found for tx ${tx_hash}`);
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
}
