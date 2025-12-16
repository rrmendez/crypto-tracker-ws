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

import { WdtNetworkService } from '../services/wdt-network.service';
import {
  CreateWdtNetworkDto,
  UpdateWdtNetworkDto,
  WdtNetworkFilterDto,
} from '../dto/wdt-network.dto';

@ApiTags('wdt-networks')
@Controller()
export class WdtNetworkController {
  constructor(private readonly service: WdtNetworkService) {}

  @Post(pahts.admin + '/wdt-networks')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateWdtNetworkDto) {
    return this.service.create(dto);
  }

  @Get(pahts.admin + '/wdt-networks')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'order', required: false, example: 'DESC' })
  @ApiQuery({ name: 'orderBy', required: false, example: 'created_at' })
  @ApiQuery({ name: 'chain_id', required: false, example: 56 })
  @ApiQuery({ name: 'is_active', required: false, example: true })
  @ApiQuery({ name: 'q', required: false, example: 'BNB' })
  @ApiOkResponse({ description: 'Lista paginada de redes' })
  async findAll(@Query() filters: WdtNetworkFilterDto) {
    const res = await this.service.findAll(filters);
    return {
      data: res.data,
      total: res.total,
      page: res.page,
      limit: res.limit,
    };
  }

  @Get(pahts.admin + '/wdt-networks/:id')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.findOne(id);
  }

  @Patch(pahts.admin + '/wdt-networks/:id')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateWdtNetworkDto,
  ) {
    return this.service.update(id, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Delete(pahts.admin + '/wdt-networks/:id')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.remove(id);
  }
}
