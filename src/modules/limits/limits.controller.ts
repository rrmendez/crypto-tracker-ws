import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpStatus,
  HttpCode,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { LimitsService } from './limits.service';
import { CreateLimitDto } from './dto/create-limit.dto';
import { UpdateLimitDto } from './dto/update-limit.dto';
import { pahts } from '@/config/configuration';
import { ApiBearerAuth, ApiOkResponse, ApiQuery } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { RoleEnum } from '@/common/enums/role.enum';
import { JwtAuthGuard } from '@/core/auth/guards/jwt-auth.guard';
import { RequestLimitDto } from './dto/request-limit.dto';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { CurrentUserDto } from '@/common/dto/current-user.dto';
import { LimitsFilterDto } from './dto/limits-filter.dto';
import {
  LimitCurrencyCode,
  SystemOperation,
} from '@/common/enums/limit-type.enum';
import { PaginatedResponseVm } from '@/common/vm/paginated-response.vm';
import { LimitResponseVm } from './dto/limit-response.vm';
import { UserLimitResponseVm } from './dto/user-limit-response.vm';
import { CreateSpecificLimitDto } from './dto/create-specific-limit.dto';
import { UpdateSpecificLimitDto } from './dto/update-specific-limit.dto';

@Controller()
export class LimitsController {
  constructor(private readonly limitsService: LimitsService) {}

  @Get(pahts.admin + '/system-operations')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  getOperations() {
    return Object.values(SystemOperation).map((operation: string) => operation);
  }

  @Post(pahts.admin + '/limits')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  async create(
    @Body() createLimitDto: CreateLimitDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    const res = await this.limitsService.create(user.userId, createLimitDto);
    return new LimitResponseVm(res);
  }

  @Get(pahts.admin + '/limits')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({
    name: 'operation',
    required: false,
    example: SystemOperation.DEPOSIT,
  })
  @ApiQuery({
    name: 'currencyCode',
    required: false,
    example: LimitCurrencyCode.USD,
  })
  @ApiQuery({ name: 'order', required: false, example: 'ASC' })
  @ApiQuery({ name: 'orderBy', required: false, example: 'createdAt' })
  @ApiOkResponse({
    description: 'Lista de Limites paginados',
    type: PaginatedResponseVm<UserLimitResponseVm>,
  })
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query() filters: LimitsFilterDto,
  ) {
    const currentPage = page > 0 ? page : 1;
    const [limits, total] = await this.limitsService.getPaginatedLimits(
      currentPage,
      limit,
      filters,
    );

    const data = limits.map((item) => new LimitResponseVm(item));

    return new PaginatedResponseVm(data, total, currentPage, limit);
  }

  @Get(pahts.admin + '/limits/:id')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    const res = await this.limitsService.findOne(id);
    return new LimitResponseVm(res);
  }

  @Patch(pahts.admin + '/limits/:id')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: CurrentUserDto,
    @Body() updateLimitDto: UpdateLimitDto,
  ) {
    const res = await this.limitsService.update(
      id,
      user.userId,
      updateLimitDto,
    );
    return new LimitResponseVm(res!);
  }

  @HttpCode(HttpStatus.OK)
  @Delete(pahts.admin + '/limits/:id')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.limitsService.remove(id, user.username);
  }

  @Get(pahts.admin + '/limits-by-client/:userId')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({
    name: 'operation',
    required: false,
    example: SystemOperation.DEPOSIT,
  })
  @ApiQuery({
    name: 'currencyCode',
    required: false,
    example: LimitCurrencyCode.USD,
  })
  @ApiQuery({ name: 'order', required: false, example: 'ASC' })
  @ApiQuery({ name: 'orderBy', required: false, example: 'createdAt' })
  @ApiOkResponse({
    description: 'Lista de Limites paginados por cliente',
    type: PaginatedResponseVm<UserLimitResponseVm>,
  })
  async getListByUser(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query() filters: LimitsFilterDto,
  ) {
    const currentPage = page > 0 ? page : 1;
    const [data, total] = await this.limitsService.getPaginatedLimitsByUserId(
      userId,
      currentPage,
      limit,
      filters,
    );

    return new PaginatedResponseVm(data, total, currentPage, limit);
  }

  @Post(pahts.admin + '/limits/specific')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  createSpecificLimit(
    @Body() createLimitDto: CreateSpecificLimitDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.limitsService.createSpecificLimit(user.userId, createLimitDto);
  }

  @Patch(pahts.admin + '/limits/specific/:id')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  updateSpecificLimit(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateLimitDto: UpdateSpecificLimitDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.limitsService.updateSpecificLimit(
      id,
      user.userId,
      updateLimitDto,
    );
  }

  @Delete(pahts.admin + '/limits/specific/:id')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  removeSpecificLimit(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.limitsService.removeSpecificLimit(id, user.username);
  }

  @Get(pahts.client + '/limits')
  @ApiBearerAuth()
  @Roles(RoleEnum.USER, RoleEnum.MERCHANT)
  @UseGuards(JwtAuthGuard)
  getByUser(@CurrentUser() user: CurrentUserDto) {
    return this.limitsService.findByUser(user.userId);
  }

  @HttpCode(HttpStatus.OK)
  @Post(pahts.client + '/limits-by-wallet')
  @ApiBearerAuth()
  @Roles(RoleEnum.USER, RoleEnum.MERCHANT)
  @UseGuards(JwtAuthGuard)
  getByWallet(
    @CurrentUser() user: CurrentUserDto,
    @Body() dto: RequestLimitDto,
  ) {
    return this.limitsService.findOneByUserIdAndWalletId(user.userId, dto);
  }
}
