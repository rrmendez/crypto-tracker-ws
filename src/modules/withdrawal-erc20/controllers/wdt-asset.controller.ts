import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/core/auth/guards/jwt-auth.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { RoleEnum } from '@/common/enums/role.enum';
import { pahts } from '@/config/configuration';

import { WdtAssetService } from '../services/wdt-asset.service';
import {
  CreateWdtAssetDto,
  UpdateWdtAssetDto,
  WdtAssetFilterDto,
} from '../dto/wdt-asset.dto';

@ApiTags('wdt-assets')
@Controller()
export class WdtAssetController {
  constructor(private readonly service: WdtAssetService) {}

  @Post(pahts.admin + '/wdt-assets')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateWdtAssetDto) {
    return this.service.create(dto);
  }

  @Get(pahts.admin + '/wdt-assets')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'order', required: false, example: 'DESC' })
  @ApiQuery({ name: 'orderBy', required: false, example: 'created_at' })
  @ApiQuery({ name: 'network_id', required: false, example: 'uuid-network' })
  @ApiQuery({ name: 'is_active', required: false, example: true })
  @ApiQuery({ name: 'symbol', required: false, example: 'USDT' })
  @ApiQuery({ name: 'contract_address', required: false, example: '0x...' })
  @ApiQuery({ name: 'q', required: false, example: 'USDT' })
  @ApiOkResponse({ description: 'Lista paginada de assets' })
  async findAll(@Query() filters: WdtAssetFilterDto) {
    const res = await this.service.findAll(filters);
    return {
      data: res.data,
      total: res.total,
      page: res.page,
      limit: res.limit,
    };
  }

  @Get(pahts.admin + '/wdt-assets/:id')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.findOne(id);
  }

  @Patch(pahts.admin + '/wdt-assets/:id')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateWdtAssetDto,
  ) {
    return this.service.update(id, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Delete(pahts.admin + '/wdt-assets/:id')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.remove(id);
  }
}
