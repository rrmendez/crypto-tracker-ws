import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Repository } from 'typeorm';
import { WdtWithdrawalExecutionEntity } from '../entities/wdt-withdrawal-execution.entity';
import { TxStatus } from '../enums/tx-status.enum';
import {
  CreateWdtWithdrawalExecutionDto,
  UpdateWdtWithdrawalExecutionDto,
  WdtWithdrawalExecutionFilterDto,
} from '../dto/wdt-withdrawal-execution.dto';

@Injectable()
export class WdtWithdrawalExecutionService {
  constructor(
    @InjectRepository(WdtWithdrawalExecutionEntity)
    private readonly repo: Repository<WdtWithdrawalExecutionEntity>,
  ) {}

  // -------- helpers ----------
  private normAddr(addr?: string) {
    return addr ? addr.trim().toLowerCase() : addr;
  }

  // -------- CREATE ----------
  async create(
    dto: CreateWdtWithdrawalExecutionDto,
  ): Promise<WdtWithdrawalExecutionEntity> {
    // Unicidad por tx_hash
    //const dup = await this.repo.findOne({ where: { tx_hash: dto.tx_hash } });
    //if (dup) {
    //  throw new ConflictException(`Execution already exists for tx ${dto.tx_hash}`);
    //}

    const entity = this.repo.create({
      withdrawal_request_id: dto.withdrawal_request_id,
      withdrawal_contract_id: dto.withdrawal_contract_id,
      spender_address_snapshot: this.normAddr(dto.spender_address_snapshot)!,
      amount_sent: dto.amount_sent,
      fee_applied: dto.fee_applied,
      tx_hash: dto.tx_hash,
      status: dto.status ?? TxStatus.PENDING,
      block_number: dto.block_number,
      confirmed_at: dto.confirmed_at,
    });

    return this.repo.save(entity);
  }

  // -------- LIST (paginado + filtros) ----------
  async findAll(filters: WdtWithdrawalExecutionFilterDto) {
    const page = Math.max(1, Number(filters.page ?? 1));
    const limit = Math.max(1, Math.min(100, Number(filters.limit ?? 10)));
    const skip = (page - 1) * limit;

    const base: FindOptionsWhere<WdtWithdrawalExecutionEntity> = {};
    if (filters.withdrawal_request_id)
      base.withdrawal_request_id = filters.withdrawal_request_id;
    if (filters.withdrawal_contract_id)
      base.withdrawal_contract_id = filters.withdrawal_contract_id;
    if (filters.tx_hash) base.tx_hash = filters.tx_hash;
    if (filters.status) base.status = filters.status;

    const where: FindOptionsWhere<WdtWithdrawalExecutionEntity>[] = [];
    if (filters.q?.trim()) {
      const q = `%${filters.q.trim()}%`;
      where.push({ ...base, tx_hash: ILike(q) });
      where.push({ ...base, spender_address_snapshot: ILike(q) });
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
  async findOne(id: string): Promise<WdtWithdrawalExecutionEntity> {
    const e = await this.repo.findOne({ where: { id } });
    if (!e) throw new NotFoundException('Withdrawal execution not found');
    return e;
  }

  // -------- UPDATE ----------
  async update(
    id: string,
    dto: UpdateWdtWithdrawalExecutionDto,
  ): Promise<WdtWithdrawalExecutionEntity> {
    const entity = await this.findOne(id);

    // si cambia tx_hash, validar unicidad
    if (dto.tx_hash && dto.tx_hash !== entity.tx_hash) {
      const dup = await this.repo.findOne({ where: { tx_hash: dto.tx_hash } });
      if (dup) {
        throw new ConflictException(
          `Execution already exists for tx ${dto.tx_hash}`,
        );
      }
    }

    if (dto.spender_address_snapshot) {
      dto.spender_address_snapshot = this.normAddr(
        dto.spender_address_snapshot,
      );
    }

    Object.assign(entity, dto);
    return this.repo.save(entity);
  }

  // -------- DELETE ----------
  async remove(id: string) {
    const res = await this.repo.delete(id);
    if (!res.affected)
      throw new NotFoundException('Withdrawal execution not found');
    return { deleted: true };
  }

  // -------- Helpers operativos --------

  /** Busca por tx_hash */
  async getByTxHash(tx_hash: string) {
    const e = await this.repo.findOne({ where: { tx_hash } });
    if (!e)
      throw new NotFoundException(
        `Withdrawal execution not found for tx ${tx_hash}`,
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
}
