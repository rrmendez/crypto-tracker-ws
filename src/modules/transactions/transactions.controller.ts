import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Get,
  Query,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { pahts } from '@/config/configuration';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { RoleEnum } from '@/common/enums/role.enum';
import { JwtAuthGuard } from '@/core/auth/guards/jwt-auth.guard';
import { RequestWithdrawDto } from './dto/request-withdraw.dto';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { CurrentUserDto } from '@/common/dto/current-user.dto';
import { MoralisWebhookDto } from './dto/moralis-webhook.dto';
import { PaginatedResponseVm } from '@/common/vm/paginated-response.vm';
import { TransactionsQueryDto } from './dto/transactions-query.dto';
import { TransactionType } from '@/common/enums/transaction-type.enum';
import { TransactionResponseVm } from './dto/transaction-response.vm';
import { TwoFactorGuard } from '@/core/auth/guards/two-factor.guard';
import { GetWithdrawNativeFeeDto } from './dto/get-withdraw-native-fee.dto';
import { FinancialWithdrawDto } from './dto/financial-withdraw.dto';
import { QueryAdminFeeDto } from '../fees/dto/query-admin-fee.dto';
import { FirebaseAppCheckGuard } from '@/core/firebase/guards/firebase-app-check.guard';
@Controller()
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post(pahts.client + '/transactions/withdraw')
  @ApiBearerAuth()
  @Roles(RoleEnum.USER, RoleEnum.MERCHANT)
  @UseGuards(JwtAuthGuard, TwoFactorGuard, FirebaseAppCheckGuard)
  async requestWithdrawByUser(
    @Body() requestWithdrawDto: RequestWithdrawDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    await this.transactionsService.requestWithdrawByUserId(
      user.userId,
      requestWithdrawDto.to,
      requestWithdrawDto.amount,
      requestWithdrawDto.walletId,
    );

    return {
      status: 'ok',
    };
  }

  @Post(pahts.client + '/transactions/native-withdraw-fees')
  @ApiBearerAuth()
  @Roles(RoleEnum.USER, RoleEnum.MERCHANT)
  @UseGuards(JwtAuthGuard)
  getNativeWithdrawFees(
    @Body() getWithdrawNativeFeeDto: GetWithdrawNativeFeeDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.transactionsService.getNativeWithdrawFees(
      getWithdrawNativeFeeDto.walletId,
      getWithdrawNativeFeeDto.amount,
      user.userId,
    );
  }

  @Post(pahts.admin + '/transactions/native-withdraw-fees')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  getNativeWithdrawAdminFees(
    @Body() getWithdrawNativeFeeDto: QueryAdminFeeDto,
  ) {
    return this.transactionsService.getNativeAdminWithdrawFees(
      getWithdrawNativeFeeDto.currencyId,
    );
  }

  @Post(pahts.ws + '/transactions/notify')
  @HttpCode(HttpStatus.OK)
  async webHookMoralis(@Body() data: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (!data || !data?.txs?.[0]) {
      return {
        status: 'empty data',
      };
    }

    await this.transactionsService.checkTransactionStatus(
      data as MoralisWebhookDto,
    );

    return {
      status: 'ok',
    };
  }

  @Get(pahts.client + '/transactions-by-current-user/:walletId')
  @ApiBearerAuth()
  @Roles(RoleEnum.USER, RoleEnum.MERCHANT)
  @UseGuards(JwtAuthGuard)
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({
    name: 'types',
    required: false,
    isArray: true,
    enum: TransactionType,
    example: [TransactionType.DEPOSIT, TransactionType.WITHDRAW],
  })
  async findByCurrentUserPaginated(
    @CurrentUser() user: CurrentUserDto,
    @Param('walletId', new ParseUUIDPipe()) walletId: string,
    @Query() query: TransactionsQueryDto,
  ) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 10);
    const types = query.types;

    const currentPage = page > 0 ? page : 1;
    const [elements, total] =
      await this.transactionsService.findByWalletPaginated(
        user.userId,
        walletId,
        currentPage,
        limit,
        types,
      );

    return new PaginatedResponseVm(elements, total, currentPage, limit);
  }

  @Get(pahts.admin + '/transactions')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({
    name: 'types',
    required: false,
    isArray: true,
    enum: TransactionType,
    example: [TransactionType.DEPOSIT, TransactionType.WITHDRAW],
  })
  async findAllPaginated(@Query() query: TransactionsQueryDto) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 10);

    const currentPage = page > 0 ? page : 1;
    const [elements, total] = await this.transactionsService.findPaginated(
      currentPage,
      limit,
      query,
    );

    const data = elements.map(
      (item) => new TransactionResponseVm(item, query.showExtras),
    );

    return new PaginatedResponseVm(data, total, currentPage, limit);
  }

  @Get(pahts.admin + '/transactions/:id')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    const res = await this.transactionsService.findOne(id);
    return new TransactionResponseVm(res, true);
  }

  @Post(pahts.admin + '/transactions/test-notification/:userId')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  async testNotification(@Param('userId', new ParseUUIDPipe()) userId: string) {
    await this.transactionsService.testNotification(userId);

    return {
      status: 'ok',
    };
  }

  @Post(pahts.admin + '/transactions/financial-withdraw')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard, TwoFactorGuard, FirebaseAppCheckGuard)
  @ApiOperation({
    summary: 'Retirar saldo de wallets administrativos (Admin con 2FA)',
    description:
      'Permite a los administradores retirar fondos de las wallets de gas, tasas o intercambio. Requiere validación 2FA.',
  })
  @ApiResponse({
    status: 200,
    description: 'Retiro procesado exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o usuario bloqueado',
  })
  @ApiResponse({
    status: 404,
    description: 'Moneda no encontrada',
  })
  async financialWithdraw(
    @Body() dto: FinancialWithdrawDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    await this.transactionsService.requestWithdrawByAdmin(
      user.userId,
      dto.address,
      dto.amount,
      dto.type,
      dto.currencyId,
    );
    return { status: 'ok' };
  }
}
