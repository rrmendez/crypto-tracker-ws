import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseUUIDPipe,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CurrenciesService } from './currencies.service';
import { CreateCurrencyDto } from './dto/create-currency.dto';
import { UpdateCurrencyDto } from './dto/update-currency.dto';
import { pahts } from '@/config/configuration';
import { ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { RoleEnum } from '@/common/enums/role.enum';
import { JwtAuthGuard } from '@/core/auth/guards/jwt-auth.guard';
import { PaginatedResponseVm } from '@/common/vm/paginated-response.vm';
import { cryptoCurrencies } from '@/config/currency.config';
import { EnableDisableCurrencyDto } from './dto/enable-disable-currency.dto';
import { CurrencyFilterDto } from './dto/currency-filter.dto';

@Controller()
export class CurrenciesController {
  constructor(private readonly currenciesService: CurrenciesService) {}

  @Post(pahts.admin + '/currencies')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  async create(@Body() createCurrencyDto: CreateCurrencyDto) {
    return await this.currenciesService.create(createCurrencyDto);
  }

  @Get(pahts.admin + '/currencies/check-network-price/:configId')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  checkNetworkPrice(@Param('configId') configId: string) {
    return this.currenciesService.checkNetworkPrice(configId);
  }

  @Get(pahts.admin + '/currencies' + '/all')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.currenciesService.findAll();
  }

  @Get(pahts.admin + '/currencies' + '/template')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  getTemplate() {
    return cryptoCurrencies.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      type: c.type,
      decimals: c.decimals,
      isActive: c.isActive,
      network: c.network,
      networkCode: c.networkCode,
    }));
  }

  @Get(pahts.admin + '/currencies')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  async findPaginated(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query() filters: CurrencyFilterDto,
  ) {
    const currentPage = page > 0 ? page : 1;
    const [currencies, total] = await this.currenciesService.findPaginated(
      currentPage,
      limit,
      filters,
    );

    return new PaginatedResponseVm(currencies, total, currentPage, limit);
  }

  @Get(pahts.admin + '/currencies' + '/:id')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.currenciesService.findOne(id);
  }

  @Patch(pahts.admin + '/currencies' + '/:id')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateCurrencyDto: UpdateCurrencyDto,
  ) {
    return this.currenciesService.update(id, updateCurrencyDto);
  }

  @Post(pahts.admin + '/currencies' + '/enable-disable/:id')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  enableOrDisable(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: EnableDisableCurrencyDto,
  ) {
    return this.currenciesService.enableOrDisable(id, dto);
  }

  @Delete(pahts.admin + '/currencies' + '/:id')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.currenciesService.remove(id);
  }

  @Post(pahts.admin + '/currencies' + '/:id/price')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  syncPrice(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.currenciesService.syncPrice(id);
  }

  @Get('currencies' + '/:id/price')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getPrice(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.currenciesService.getPrice(id);
  }

  @Post(pahts.admin + '/currencies' + '/prices')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  getPrices() {
    return this.currenciesService.getPrices();
  }

  @Get('currencies' + '/prices')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getLatestPrices() {
    return this.currenciesService.getLatestPrices();
  }
}
