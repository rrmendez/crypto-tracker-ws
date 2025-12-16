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

import { WdtWithdrawalContractService } from '../services/wdt-withdrawal-contract.service';
import { WdtWithdrawalFlowService } from '../services/wdt-withdrawal-flow.service';
import { Erc20WithdrawalUtils } from '../utils/erc20-withdrawal.utils';
import { ProcessWithdrawalParams } from '../types/process-withdrawal-params';
import {
  CreateWdtWithdrawalContractDto,
  UpdateWdtWithdrawalContractDto,
  WdtWithdrawalContractFilterDto,
  DeployContractDto,
} from '../dto/wdt-withdrawal-contract.dto';

@ApiTags('wdt-withdrawal-contracts')
@Controller()
export class WdtWithdrawalContractController {
  constructor(
    private readonly service: WdtWithdrawalContractService,
    private readonly serviceFlow: WdtWithdrawalFlowService,
    private readonly utils: Erc20WithdrawalUtils,
  ) {}

  @Post(pahts.admin + '/wdt-withdrawal-contracts')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateWdtWithdrawalContractDto) {
    return this.service.create(dto);
  }

  @Get(pahts.admin + '/wdt-withdrawal-contracts')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'order', required: false, example: 'DESC' })
  @ApiQuery({ name: 'orderBy', required: false, example: 'created_at' })
  @ApiQuery({ name: 'network_id', required: false, example: 'uuid-network' })
  @ApiQuery({ name: 'is_active', required: false, example: true })
  @ApiQuery({ name: 'version', required: false, example: 'v1.0.0' })
  @ApiQuery({ name: 'contract_address', required: false, example: '0x...' })
  @ApiQuery({ name: 'q', required: false, example: 'v1' })
  @ApiOkResponse({ description: 'Lista paginada de withdrawal contracts' })
  async findAll(@Query() filters: WdtWithdrawalContractFilterDto) {
    const res = await this.service.findAll(filters);
    return {
      data: res.data,
      total: res.total,
      page: res.page,
      limit: res.limit,
    };
  }

  @Get(pahts.admin + '/wdt-withdrawal-contracts/:id')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.findOne(id);
  }

  @Patch(pahts.admin + '/wdt-withdrawal-contracts/:id')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateWdtWithdrawalContractDto,
  ) {
    return this.service.update(id, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Delete(pahts.admin + '/wdt-withdrawal-contracts/:id')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.remove(id);
  }

  @Post(pahts.admin + '/wdt-deploy-contract')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  deployContract(@Body() dto: DeployContractDto) {
    this.serviceFlow.deployBatchSpender(
      dto.indexDeployer,
      dto.mnemonic,
      dto.rpcUrl,
      dto.admin,
      dto.operator,
    );
  }

  @Post(pahts.admin + '/get-address-by-index')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  getAddressFromIndex(@Body() dto: DeployContractDto) {
    const fromAddrUserWallet = this.utils.getAddressFromIndex(
      dto.mnemonic,
      dto.indexDeployer,
    );
    return fromAddrUserWallet;
  }

  @Post(pahts.admin + '/getIdexByAddress')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  async getIdexByAddress(@Body() dto: DeployContractDto) {
    const fromAddrUserWallet = await this.serviceFlow.getIdexByAddress(
      dto.admin,
    );
    return { fromAddrUserWallet };
  }

  @Post(pahts.admin + '/test-widraw')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  async testwidraw(@Body() dto: ProcessWithdrawalParams) {
    const fromAddrUserWallet = await this.serviceFlow.processWithdrawal(dto);
    return { fromAddrUserWallet };
  }
}
