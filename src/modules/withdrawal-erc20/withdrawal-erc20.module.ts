import { forwardRef, Module } from '@nestjs/common';
import { DatabaseModule } from '@/database/database.module';
import { AuthModule } from '@/core/auth/auth.module';
import { WdtNetworkService } from './services/wdt-network.service';
import { WdtAllowanceApprovalService } from './services/wdt-allowance-approval.service';
import { WdtAssetService } from './services/wdt-asset.service';
import { WdtNativeTopupService } from './services/wdt-native-topup.service';
import { WdtNetworkThresholdService } from './services/wdt-network-threshold.service';
import { WdtWithdrawalAuditLogService } from './services/wdt-withdrawal-audit-log.service';
import { WdtWithdrawalContractService } from './services/wdt-withdrawal-contract.service';
import { WdtWithdrawalExecutionService } from './services/wdt-withdrawal-execution.service';
import { WdtWithdrawalRequestService } from './services/wdt-withdrawal-request.service';
import { WdtWithdrawalFlowService } from './services/wdt-withdrawal-flow.service';
import { Erc20WithdrawalUtils } from './utils/erc20-withdrawal.utils';
import { wdtNetworkEntityProviders } from './providers/wdt-network.providers';
import { wdtAllowanceApprovalEntityProviders } from './providers/wdt-allowance-approval.providers';
import { wdtAssetEntityProviders } from './providers/wdt-asset.providers';
import { wdtNativeTopupEntityProviders } from './providers/wdt-native-topup.providers';
import { wdtNetworkThresholdEntityProviders } from './providers/wdt-network-threshold.providers';
import { wdtWithdrawalAuditLogEntityProviders } from './providers/wdt-withdrawal-audit-log.providers';
import { wdtWithdrawalContractEntityProviders } from './providers/wdt-withdrawal-contract.providers';
import { wdtWithdrawalExecutionEntityProviders } from './providers/wdt-withdrawal-execution.providers';
import { wdtWithdrawalRequestEntityProviders } from './providers/wdt-withdrawal-request.providers';
import { WdtAssetController } from './controllers/wdt-asset.controller';
import { WdtNetworkThresholdController } from './controllers/wdt-network-threshold.controller';
import { WdtWithdrawalContractController } from './controllers/wdt-withdrawal-contract.controller';
import { WdtNetworkController } from './controllers/wdt-network.controller';

import { cryptoAddressProviders } from '../wallets/providers/crypto-address.providers';

@Module({
  imports: [forwardRef(() => AuthModule), DatabaseModule],
  controllers: [
    WdtNetworkController,
    WdtAssetController,
    WdtNetworkThresholdController,
    WdtWithdrawalContractController,
  ],
  providers: [
    ...wdtNetworkEntityProviders,
    ...wdtAllowanceApprovalEntityProviders,
    ...wdtAssetEntityProviders,
    ...wdtNativeTopupEntityProviders,
    ...wdtNetworkThresholdEntityProviders,
    ...wdtWithdrawalAuditLogEntityProviders,
    ...wdtWithdrawalContractEntityProviders,
    ...wdtWithdrawalExecutionEntityProviders,
    ...wdtWithdrawalRequestEntityProviders,
    ...cryptoAddressProviders,
    WdtNetworkService,
    WdtAllowanceApprovalService,
    WdtAssetService,
    WdtNativeTopupService,
    WdtNetworkThresholdService,
    WdtWithdrawalAuditLogService,
    WdtWithdrawalContractService,
    WdtWithdrawalExecutionService,
    WdtWithdrawalRequestService,
    WdtWithdrawalFlowService,
    Erc20WithdrawalUtils,
  ],
  exports: [WdtWithdrawalFlowService],
})
export class WithdrawalErc20Module {}
