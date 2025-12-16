/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { ethers } from 'ethers';

import { Erc20WithdrawalUtils } from '../utils/erc20-withdrawal.utils';
import { WdtWithdrawalRequestService } from './wdt-withdrawal-request.service';
import { WdtAssetService } from './wdt-asset.service';
import { WdtNetworkService } from './wdt-network.service';
import { WdtWithdrawalContractService } from './wdt-withdrawal-contract.service';
import { WdtNetworkThresholdService } from './wdt-network-threshold.service';
import { WdtNativeTopupService } from './wdt-native-topup.service';
import { WdtAllowanceApprovalService } from './wdt-allowance-approval.service';
import { WdtWithdrawalExecutionService } from './wdt-withdrawal-execution.service';
import { WdtWithdrawalAuditLogService } from './wdt-withdrawal-audit-log.service';

import { TxStatus } from '../enums/tx-status.enum';
import { WithdrawalStatus } from '../enums/withdrawal-status.enum';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPOSITORY } from '@/database/constants';
import { Repository } from 'typeorm';

import { CryptoAddress } from '../../wallets/entities/crypto-address.entity';
import { ProcessWithdrawalParams } from '../types/process-withdrawal-params';

@Injectable()
export class WdtWithdrawalFlowService {
  constructor(
    private readonly utils: Erc20WithdrawalUtils,

    private readonly reqSvc: WdtWithdrawalRequestService,
    private readonly assetSvc: WdtAssetService,
    private readonly networkSvc: WdtNetworkService,
    private readonly spenderSvc: WdtWithdrawalContractService,
    private readonly thSvc: WdtNetworkThresholdService,

    private readonly topupSvc: WdtNativeTopupService,
    private readonly allowanceSvc: WdtAllowanceApprovalService,
    private readonly execSvc: WdtWithdrawalExecutionService,
    private readonly auditSvc: WdtWithdrawalAuditLogService,
    @Inject(REPOSITORY.CRYPTO_ADDRESSES)
    private readonly cryptoAddressesRepository: Repository<CryptoAddress>,
  ) {}

  async processWithdrawal(p: ProcessWithdrawalParams) {
    // -------- Validaciones iniciales --------
    if (!Array.isArray(p.recipients) || !Array.isArray(p.amounts)) {
      throw new BadRequestException('recipients y amounts deben ser arreglos');
    }
    if (p.recipients.length === 0) {
      throw new BadRequestException('Debe proveer al menos un destinatario');
    }
    if (p.recipients.length !== p.amounts.length) {
      throw new BadRequestException(
        'recipients y amounts deben tener el mismo largo',
      );
    }

    // Normalización de recipients y amounts
    const toList = p.recipients.map((r, i) => {
      const v = (r ?? '').trim().toLowerCase();
      if (!v)
        throw new BadRequestException(
          `Dirección destino vacía en recipients[${i}]`,
        );
      return v;
    });
    const amountList = p.amounts.map((a, i) => {
      const v = (a ?? '').trim();
      if (!v) throw new BadRequestException(`Monto vacío en amounts[${i}]`);
      return v; // mantener como string decimal
    });

    const rpcUrl = p.rpcUrl;

    // -------- Derivar direcciones desde índices HD --------
    const fromAddrUserWallet = await this.utils.getAddressFromIndex(
      p.mnemonic,
      p.indexFromAddress,
    );
    const opAddrNorm = await this.utils.getAddressFromIndex(
      p.mnemonic,
      p.indexOperatorAddress,
    );
    const fundingAddrNorm = await this.utils.getAddressFromIndex(
      p.mnemonic,
      p.indexFundingAddress,
    );

    // -------- Asset / Network --------
    const asset = await this.assetSvc.findOneByContractAddress(
      p.tokenContractAddress,
    );
    if (!asset?.contract_address) {
      throw new BadRequestException(
        'Asset missing contract_address (ERC-20 required)',
      );
    }

    const network = await this.networkSvc.findOne(asset.network_id);
    if (!network) throw new NotFoundException('Network not found for asset');

    // chainId: usa el provisto o el de la red
    const chainId = Number.isFinite(p.chainId as number)
      ? Number(p.chainId)
      : Number(network.chain_id ?? 0);

    const spender = await this.spenderSvc.getActiveByNetworkId(network.id);
    if (!spender)
      throw new NotFoundException(
        'No active withdrawal contract for this network',
      );

    const thresholds = await this.thSvc.getByNetworkId(network.id);
    const minForApprove = thresholds?.min_native_balance_for_approve ?? '0.003';

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const confirmations = Math.max(1, network.min_confirmations ?? 1);

    // -------- Crear solicitudes (una por destinatario) --------
    const requestIds: string[] = [];
    for (let i = 0; i < toList.length; i++) {
      const req = await this.reqSvc.upsertByClientRequestId({
        from: fromAddrUserWallet,
        to: toList[i],
        amount: amountList[i],
        chain_id: chainId,
        asset_id: asset.id,
        client_request_id: p.clientRequestId
          ? `${p.clientRequestId}#${i}`
          : undefined,
        status: WithdrawalStatus.CREATED,
        network_id: network.id,
      });
      requestIds.push(req.id);

      await this.auditSvc.log(
        'CREATE_REQUEST',
        JSON.stringify({
          reqId: req.id,
          idx: i,
          userId: p.userId,
          from: fromAddrUserWallet,
          to: toList[i],
          amount: amountList[i],
          token: asset.contract_address,
          operator: opAddrNorm,
          funding: fundingAddrNorm,
          mnemonic: '***',
        }),
        req.id,
      );
    }

    // -------- Allowance + Topup si hiciera falta (una sola vez para todo el batch) --------
    const alreadyConfirmedAllowance = await this.allowanceSvc.hasConfirmedFor(
      fromAddrUserWallet,
      asset.id,
      spender.id,
    );

    if (!alreadyConfirmedAllowance) {
      // 1) Topup nativo si saldo < mínimo para aprobar
      const nativeBalStr = await this.utils.getNativeBalance(
        fromAddrUserWallet,
        rpcUrl,
      );
      const needsTopup = this.lt(nativeBalStr, minForApprove);

      if (needsTopup) {
        const topupAmount = this.subBig(minForApprove, nativeBalStr);
        const receipt = await this.utils.topupNativeTo(
          p.indexFundingAddress, // firma con la cuenta funding (por índice)
          p.mnemonic,
          rpcUrl,
          fromAddrUserWallet, // destino: owner
          topupAmount,
        );

        await this.topupSvc.create({
          to_address: fromAddrUserWallet,
          network_id: network.id,
          amount_native: topupAmount,
          funding_source_address: fundingAddrNorm,
          tx_hash: receipt.hash,
          status: TxStatus.MINED,
          block_number: `${receipt.blockNumber ?? ''}`,
        });
        await this.auditSvc.log(
          'TOPUP_MINED',
          JSON.stringify({ tx: receipt.hash }),
          requestIds[0],
        );

        await provider.waitForTransaction(receipt.hash, confirmations);
        await this.topupSvc.markConfirmedByTx(
          receipt.hash,
          `${receipt.blockNumber ?? ''}`,
        );
        await this.auditSvc.log(
          'TOPUP_CONFIRMED',
          JSON.stringify({ tx: receipt.hash }),
          requestIds[0],
        );

        await Promise.all(
          requestIds.map((id) =>
            this.reqSvc.setStatus(id, WithdrawalStatus.AWAITING_TOPUP),
          ),
        );
      }

      // 2) Approve MaxUint256 firmado por la cuenta "from"
      const approveReceipt = await this.utils.approveTokenForWithdrawal(
        p.indexFromAddress,
        p.mnemonic,
        rpcUrl,
        asset.contract_address,
        spender.contract_address,
        'max', // MaxUint256
      );

      await this.allowanceSvc.create({
        owner_address: fromAddrUserWallet,
        token_asset_id: asset.id,
        spender_contract_id: spender.id,
        intended_amount: ethers.MaxUint256.toString(),
        tx_hash: approveReceipt.hash,
      });
      await this.auditSvc.log(
        'ALLOWANCE_MINED',
        JSON.stringify({ tx: approveReceipt.hash }),
        requestIds[0],
      );
      await Promise.all(
        requestIds.map((id) =>
          this.reqSvc.setStatus(id, WithdrawalStatus.AWAITING_ALLOWANCE),
        ),
      );

      await provider.waitForTransaction(approveReceipt.hash, confirmations);
      await this.allowanceSvc.markConfirmedByTx(
        approveReceipt.hash,
        `${approveReceipt.blockNumber ?? ''}`,
      );
      await this.auditSvc.log(
        'ALLOWANCE_CONFIRMED',
        JSON.stringify({ tx: approveReceipt.hash }),
        requestIds[0],
      );
    }

    // -------- Ejecutar retiro en batch (firmado por el operador) --------
    const execReceipt = await this.utils.executeBatchWithdrawal(
      p.indexOperatorAddress,
      p.mnemonic,
      rpcUrl,
      spender.contract_address,
      asset.contract_address,
      fromAddrUserWallet,
      toList,
      amountList,
    );

    // Crear registros de ejecución por cada request (mismo tx hash)
    for (let i = 0; i < requestIds.length; i++) {
      await this.execSvc.create({
        withdrawal_request_id: requestIds[i],
        withdrawal_contract_id: spender.id,
        spender_address_snapshot: opAddrNorm,
        amount_sent: amountList[i],
        tx_hash: execReceipt.hash,
        status: TxStatus.MINED,
        block_number: `${execReceipt.blockNumber ?? ''}`,
      });
      await this.auditSvc.log(
        'WITHDRAW_MINED',
        JSON.stringify({ tx: execReceipt.hash, idx: i }),
        requestIds[i],
      );
    }

    await Promise.all(
      requestIds.map((id) =>
        this.reqSvc.setStatus(id, WithdrawalStatus.ONCHAIN_SUBMITTED),
      ),
    );

    // -------- Confirmar y cerrar --------
    const finalRcpt = await provider.waitForTransaction(
      execReceipt.hash,
      confirmations,
    );
    const success = !!finalRcpt?.status;

    if (success) {
      await Promise.all([
        ...requestIds.map((id) =>
          this.reqSvc.setStatus(id, WithdrawalStatus.ONCHAIN_CONFIRMED),
        ),
        ...requestIds.map((id) =>
          this.auditSvc.log(
            'WITHDRAW_CONFIRMED',
            JSON.stringify({ tx: execReceipt.hash }),
            id,
          ),
        ),
        this.execSvc.markConfirmedByTx(
          execReceipt.hash,
          `${finalRcpt.blockNumber ?? ''}`,
        ),
      ]);
    } else {
      await Promise.all([
        ...requestIds.map((id) =>
          this.reqSvc.setStatus(id, WithdrawalStatus.FAILED),
        ),
        ...requestIds.map((id) =>
          this.auditSvc.log(
            'WITHDRAW_FAILED',
            JSON.stringify({ tx: execReceipt.hash }),
            id,
          ),
        ),
        this.execSvc.markFailedByTx(execReceipt.hash),
      ]);
    }

    return finalRcpt;
  }

  // ---------------- helpers decimales ----------------
  private lt(a: string, b: string) {
    return this.cmp(a, b) < 0;
  }
  private subBig(a: string, b: string): string {
    const DEC = 18n;
    const A = this.toWei(a, DEC);
    const B = this.toWei(b, DEC);
    if (B >= A) return '0';
    return this.fromWei(A - B, DEC);
  }
  private toWei(x: string, decimals: bigint): bigint {
    const [i, f = ''] = x.split('.');
    const frac = (f + '0'.repeat(Number(decimals))).slice(0, Number(decimals));
    return BigInt(i) * 10n ** decimals + BigInt(frac || '0');
  }
  private fromWei(n: bigint, decimals: bigint): string {
    const s = n.toString().padStart(Number(decimals) + 1, '0');
    const i = s.slice(0, -Number(decimals));
    const f = s.slice(-Number(decimals)).replace(/0+$/, '');
    return f ? `${i}.${f}` : i;
  }
  private cmp(a: string, b: string) {
    const DEC = 18n;
    const A = this.toWei(a, DEC);
    const B = this.toWei(b, DEC);
    return A < B ? -1 : A > B ? 1 : 0;
  }

  async deployBatchSpender(
    indexDeployer: number,
    mnemonic: string,
    rpcUrl: string,
    admin: string,
    operator: string,
  ) {
    const artifactPath = join(
      process.cwd(),
      'src/artifacts/contracts/BatchSpender.sol/BatchSpender.json',
    );
    const artifact = JSON.parse(readFileSync(artifactPath, 'utf8'));

    await this.utils.deployBatchSpender(
      indexDeployer,
      mnemonic,
      rpcUrl,
      admin,
      operator,
      {
        abi: artifact.abi,
        bytecode: artifact.bytecode,
      },
    );
  }

  async getIdexByAddress(address: string) {
    const normalized = address.trim().toLowerCase();
    const last = await this.cryptoAddressesRepository.findOne({
      where: { address: normalized },
      order: { createdAt: 'DESC' },
    });
    return last;
  }
}
