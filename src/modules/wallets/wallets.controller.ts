import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { WalletsService } from './wallets.service';
import { pahts } from '@/config/configuration';
import { ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { RoleEnum } from '@/common/enums/role.enum';
import { JwtAuthGuard } from '@/core/auth/guards/jwt-auth.guard';
import { PaginatedResponseVm } from '@/common/vm/paginated-response.vm';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { CurrentUserDto } from '@/common/dto/current-user.dto';
import { WalletDetailsVm } from './dto/wallet-details.vm';

@Controller()
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Get(pahts.admin + '/wallets-by-user/:userId')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  async findByUserPaginated(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    const currentPage = page > 0 ? page : 1;
    const [wallets, total] = await this.walletsService.findByUserPaginated(
      userId,
      currentPage,
      limit,
    );

    return new PaginatedResponseVm(wallets, total, currentPage, limit);
  }

  @Get(pahts.client + '/wallets-by-current-user')
  @ApiBearerAuth()
  @Roles(RoleEnum.USER, RoleEnum.MERCHANT)
  @UseGuards(JwtAuthGuard)
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  async findByCurrentUserPaginated(
    @CurrentUser() user: CurrentUserDto,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    const currentPage = page > 0 ? page : 1;
    const [wallets, total] = await this.walletsService.findByUserPaginated(
      user.userId,
      currentPage,
      limit,
      {
        currencyActive: true,
      },
    );

    return new PaginatedResponseVm(wallets, total, currentPage, limit);
  }

  @Get(pahts.client + '/wallet-by-current-user/:walletId')
  @ApiBearerAuth()
  @Roles(RoleEnum.USER, RoleEnum.MERCHANT)
  @UseGuards(JwtAuthGuard)
  @ApiParam({
    name: 'walletId',
    required: true,
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  async findByCurrentUser(
    @CurrentUser() user: CurrentUserDto,
    @Param('walletId', new ParseUUIDPipe()) walletId: string,
  ) {
    const wallet = await this.walletsService.findByUser(user.userId, walletId);

    return wallet;
  }

  @Get(pahts.admin + '/wallets/:walletId')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  @ApiParam({
    name: 'walletId',
    required: true,
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  async find(@Param('walletId', new ParseUUIDPipe()) walletId: string) {
    const wallet = await this.walletsService.find(walletId);
    const { incomes, expenses } =
      await this.walletsService.getWalletResume(walletId);

    return new WalletDetailsVm(wallet, incomes, expenses);
  }

  @Post(pahts.admin + '/wallets/create-for-user/:userId')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  async createWallets(@Param('userId', new ParseUUIDPipe()) userId: string) {
    const wallets = await this.walletsService.createWalletsForUser(userId);

    return wallets;
  }

  @Post(pahts.admin + '/wallets/sync-balance/:walletId')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  async syncWalletBalance(
    @Param('walletId', new ParseUUIDPipe()) walletId: string,
  ) {
    const wallet = await this.walletsService.syncWalletBalance(walletId);

    return wallet;
  }
}
