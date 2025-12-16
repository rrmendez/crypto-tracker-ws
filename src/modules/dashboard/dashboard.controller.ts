import {
  Controller,
  Get,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CacheInterceptor, CacheKey, CacheTTL } from '@nestjs/cache-manager';
import { DashboardService } from './dashboard.service';
import { pahts } from '@/config/configuration';
import { ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { RoleEnum } from '@/common/enums/role.enum';
import { JwtAuthGuard } from '@/core/auth/guards/jwt-auth.guard';
import { TransactionStatus } from '@/common/enums/transaction-status.enum';

@Controller(pahts.admin + '/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('wallets')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(CacheInterceptor)
  @CacheKey('dashboard:wallets')
  @CacheTTL(5 * 60 * 1000) // 5min
  findFinancials() {
    return this.dashboardService.findAdminWallets();
  }

  @Get('clients')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  findClientsCount() {
    return this.dashboardService.findClientsCount();
  }

  @Get('balances')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  findTotalBalanceForCurrency() {
    return this.dashboardService.getTotalBalanceForCurrency();
  }

  @Get('transactions')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  @ApiQuery({
    name: 'status',
    required: false,
    example: TransactionStatus.CONFIRMED,
  })
  findTotalTransactionsAmount(@Query('status') status?: TransactionStatus) {
    return this.dashboardService.getTotalTransactionsAmount(status);
  }
}
