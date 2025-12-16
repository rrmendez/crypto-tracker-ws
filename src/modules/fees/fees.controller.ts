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
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiOkResponse,
} from '@nestjs/swagger';
import { FeesService } from './fees.service';
import { CreateFeeDto } from './dto/create-fee.dto';
import { UpdateFeeDto } from './dto/update-fee.dto';
import { QueryFeeDto } from './dto/query-fee.dto';
import { QueryAdminFeeDto } from './dto/query-admin-fee.dto';
import { FeesFilterDto } from './dto/fees-filter.dto';
import { pahts } from '@/config/configuration';
import { JwtAuthGuard } from '@/core/auth/guards/jwt-auth.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { RoleEnum } from '@/common/enums/role.enum';
import { PaginatedResponseVm } from '@/common/vm/paginated-response.vm';
import { FeeDetailsVm } from './dto/fee-details.vm';
import { SystemOperation } from '@/common/enums/limit-type.enum';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { CurrentUserDto } from '@/common/dto/current-user.dto';

@ApiTags('Fees')
@Controller()
export class FeesController {
  constructor(private readonly feesService: FeesService) {}

  // ============================================================================
  // ADMIN ENDPOINTS
  // ============================================================================

  @Post(pahts.admin + '/fees')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Crear una nueva tasa (Admin only)' })
  @ApiResponse({ status: 201, description: 'Tasa creada exitosamente' })
  @ApiResponse({ status: 404, description: 'Moneda no encontrada' })
  @ApiResponse({
    status: 409,
    description: 'Ya existe una tasa para esta moneda y operación',
  })
  async create(
    @Body() createFeeDto: CreateFeeDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.feesService.create(createFeeDto, user.userId);
  }

  @Get(pahts.admin + '/fees')
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
  @ApiQuery({ name: 'currencyId', required: false })
  @ApiQuery({ name: 'order', required: false, example: 'DESC' })
  @ApiQuery({ name: 'orderBy', required: false, example: 'createdAt' })
  @ApiOperation({ summary: 'Listar todas las tasas paginadas (Admin only)' })
  @ApiOkResponse({
    description: 'Lista de tasas paginadas',
    type: PaginatedResponseVm<FeeDetailsVm>,
  })
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query() filters: FeesFilterDto,
  ) {
    const currentPage = page > 0 ? page : 1;
    const [fees, total] = await this.feesService.getPaginatedFees(
      currentPage,
      limit,
      filters,
    );

    const data = fees.map((fee) => new FeeDetailsVm(fee));

    return new PaginatedResponseVm(data, total, currentPage, limit);
  }

  @Get(pahts.admin + '/fees/:id')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Obtener una tasa por ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'Tasa obtenida exitosamente' })
  @ApiResponse({ status: 404, description: 'Tasa no encontrada' })
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.feesService.findOne(id);
  }

  @Patch(pahts.admin + '/fees/:id')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Actualizar una tasa (Admin only)' })
  @ApiResponse({ status: 200, description: 'Tasa actualizada exitosamente' })
  @ApiResponse({ status: 404, description: 'Tasa no encontrada' })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateFeeDto: UpdateFeeDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.feesService.update(id, updateFeeDto, user.userId);
  }

  @Delete(pahts.admin + '/fees/:id')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar una tasa (Admin only)' })
  @ApiResponse({ status: 204, description: 'Tasa eliminada exitosamente' })
  @ApiResponse({ status: 404, description: 'Tasa no encontrada' })
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.feesService.remove(id);
  }

  @Post(pahts.admin + '/fees/query')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Consultar tasas de retiro por moneda (Admin)',
    description: 'Retorna las tasas configuradas para retiros administrativos',
  })
  @ApiResponse({
    status: 200,
    description: 'Tasas encontradas y retornadas',
  })
  @ApiResponse({
    status: 404,
    description: 'Moneda no encontrada',
  })
  async queryForAdmin(@Body() queryAdminFeeDto: QueryAdminFeeDto) {
    return await this.feesService.queryForAdmin(queryAdminFeeDto);
  }

  // ============================================================================
  // CLIENT ENDPOINTS
  // ============================================================================

  @Post(pahts.client + '/fees/query')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @Roles(RoleEnum.USER, RoleEnum.MERCHANT)
  @ApiOperation({
    summary: 'Consultar tasa por moneda y operación (Cliente)',
    description:
      'Retorna solo el ID y los fees si la tasa existe y está activa',
  })
  @ApiResponse({
    status: 200,
    description: 'Tasa encontrada y retornada',
  })
  @ApiResponse({
    status: 404,
    description:
      'No se encontró una tasa activa para la moneda y operación especificadas',
  })
  async queryForClient(@Body() queryFeeDto: QueryFeeDto) {
    return this.feesService.queryForClient(queryFeeDto);
  }
}
