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

import { WdtNetworkThresholdService } from '../services/wdt-network-threshold.service';
import {
  CreateWdtNetworkThresholdDto,
  UpdateWdtNetworkThresholdDto,
  WdtNetworkThresholdFilterDto,
} from '../dto/wdt-network-threshold.dto';

@ApiTags('wdt-network-thresholds')
@Controller()
export class WdtNetworkThresholdController {
  constructor(private readonly service: WdtNetworkThresholdService) {}

  @Post(pahts.admin + '/wdt-network-thresholds')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateWdtNetworkThresholdDto) {
    return this.service.create(dto);
  }

  @Get(pahts.admin + '/wdt-network-thresholds')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'order', required: false, example: 'DESC' })
  @ApiQuery({ name: 'orderBy', required: false, example: 'created_at' })
  @ApiQuery({ name: 'network_id', required: false, example: 'uuid-network' })
  @ApiOkResponse({ description: 'Lista paginada de network thresholds' })
  async findAll(@Query() filters: WdtNetworkThresholdFilterDto) {
    const res = await this.service.findAll(filters);
    return {
      data: res.data,
      total: res.total,
      page: res.page,
      limit: res.limit,
    };
  }

  @Get(pahts.admin + '/wdt-network-thresholds/:id')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.findOne(id);
  }

  @Patch(pahts.admin + '/wdt-network-thresholds/:id')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateWdtNetworkThresholdDto,
  ) {
    return this.service.update(id, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Delete(pahts.admin + '/wdt-network-thresholds/:id')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.remove(id);
  }
}
