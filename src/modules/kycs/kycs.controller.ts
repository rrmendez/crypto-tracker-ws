/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Query,
  UseInterceptors,
  UploadedFiles,
  ParseBoolPipe,
} from '@nestjs/common';
import { KycsService } from './kycs.service';
import { CreateKycDto, KycDocumentDto } from './dto/create-kyc.dto';
import { UpdateKycDto } from './dto/update-kyc.dto';
import { PartialRejectKycDto } from './dto/partial-reject-kyc.dto';
import { SyncDocumentsStatusDto } from './dto/sync-documents-status.dto';
import { pahts } from '@/config/configuration';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { RoleEnum } from '@/common/enums/role.enum';
import { JwtAuthGuard } from '@/core/auth/guards/jwt-auth.guard';
import { TwoFactorGuard } from '@/core/auth/guards/two-factor.guard';
import { PaginatedResponseVm } from '@/common/vm/paginated-response.vm';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { CurrentUserDto } from '@/common/dto/current-user.dto';
import { KycFilterDto } from './dto/kyc-filter.dto';
import { KycStatusEnum, KycTypeEnum } from '@/common/enums/kyc-type-enum';
import { KycResponseVm } from './dto/kyc-response.vm';
import { BadRequestException } from '@nestjs/common';

@Controller()
export class KycsController {
  constructor(private readonly kycsService: KycsService) {}

  @Post(pahts.client + '/validate')
  @ApiBearerAuth()
  @Roles(RoleEnum.USER, RoleEnum.MERCHANT)
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('documents'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateKycDto })
  async validateByUser(
    @CurrentUser() user: CurrentUserDto,
    @Body() body: Omit<CreateKycDto, 'documents'>,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const documentsMeta = JSON.parse(
      (body as any)['documents'] ?? '[]',
    ) as KycDocumentDto[];

    const documents = files.map((file, idx) => ({
      file,
      type: documentsMeta[idx]?.type,
      description: documentsMeta[idx]?.description,
    }));

    const kyc = await this.kycsService.validate(user.userId, {
      ...body,
      documents,
    });

    if (!kyc) {
      throw new BadRequestException('KYC validation failed');
    }

    return new KycResponseVm(kyc);
  }

  @Get(pahts.client + '/kycs')
  @ApiBearerAuth()
  @Roles(RoleEnum.USER, RoleEnum.MERCHANT)
  @UseGuards(JwtAuthGuard)
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'status', required: false, example: KycStatusEnum.PENDING })
  @ApiQuery({ name: 'type', required: false, example: KycTypeEnum.IDENTITY_PF })
  @ApiQuery({ name: 'order', required: false, example: 'ASC' })
  @ApiQuery({ name: 'orderBy', required: false, example: 'createdAt' })
  @ApiOkResponse({
    description: 'Kycs paginados del cliente actual',
    type: PaginatedResponseVm<KycResponseVm>,
  })
  async findPaginated(
    @CurrentUser() user: CurrentUserDto,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query() filters: KycFilterDto,
  ) {
    const currentPage = page > 0 ? page : 1;
    const [kycs, total] = await this.kycsService.getPaginatedKycs(
      user.userId,
      currentPage,
      limit,
      filters,
    );

    const data = kycs.map((kyc) => new KycResponseVm(kyc));

    return new PaginatedResponseVm(data, total, currentPage, limit);
  }

  @Get(pahts.admin + '/kycs-by-user/:userId')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'status', required: false, example: KycStatusEnum.PENDING })
  @ApiQuery({ name: 'type', required: false, example: KycTypeEnum.IDENTITY_PF })
  @ApiQuery({ name: 'order', required: false, example: 'ASC' })
  @ApiQuery({ name: 'orderBy', required: false, example: 'createdAt' })
  @ApiOkResponse({
    description: 'Kycs paginados',
    type: PaginatedResponseVm<KycResponseVm>,
  })
  async findByUserPaginated(
    @Param('userId') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query() filters: KycFilterDto,
  ) {
    const currentPage = page > 0 ? page : 1;
    const [kycs, total] = await this.kycsService.getPaginatedKycs(
      userId,
      currentPage,
      limit,
      filters,
    );

    const data = kycs.map((kyc) => new KycResponseVm(kyc));

    return new PaginatedResponseVm(data, total, currentPage, limit);
  }

  @Get(pahts.admin + '/kycs-list')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'status', required: false, example: KycStatusEnum.PENDING })
  @ApiQuery({ name: 'type', required: false, example: KycTypeEnum.IDENTITY_PF })
  @ApiQuery({ name: 'order', required: false, example: 'ASC' })
  @ApiQuery({ name: 'orderBy', required: false, example: 'createdAt' })
  @ApiQuery({ name: 'email', required: false, example: 'user@example.com' })
  @ApiOkResponse({
    description: 'Lista de Kycs paginados',
    type: PaginatedResponseVm<KycResponseVm>,
  })
  async findListPaginated(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query() filters: KycFilterDto,
  ) {
    const currentPage = page > 0 ? page : 1;
    const [kycs, total] = await this.kycsService.getPaginatedListKycs(
      currentPage,
      limit,
      filters,
    );

    const data = kycs.map((kyc) => new KycResponseVm(kyc));

    return new PaginatedResponseVm(data, total, currentPage, limit);
  }

  @Get(pahts.admin + '/kycs/:id')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string) {
    const kyc = await this.kycsService.findOne(id);

    return new KycResponseVm(kyc);
  }

  @Patch(pahts.admin + '/kycs/:id/approve')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  async approveByAdmin(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') id: string,
  ) {
    const kyc = await this.kycsService.approve(id, user.userId);
    return new KycResponseVm(kyc);
  }

  @Patch(pahts.admin + '/kycs/:id/reject')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  async rejectByAdmin(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') id: string,
    @Body() updateKycDto: UpdateKycDto,
  ) {
    const kyc = await this.kycsService.reject(id, updateKycDto, user.userId);
    return new KycResponseVm(kyc);
  }

  @Patch(pahts.admin + '/kycs/:id/partial-reject')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  async partialRejectByAdmin(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') id: string,
    @Body() partialRejectKycDto: PartialRejectKycDto,
  ) {
    const kyc = await this.kycsService.partialReject(
      id,
      partialRejectKycDto,
      user.userId,
    );
    return new KycResponseVm(kyc);
  }

  @Post(pahts.admin + '/kycs/sync-documents-status')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard, TwoFactorGuard)
  @ApiBody({
    type: SyncDocumentsStatusDto,
    description:
      'Sync documents with null status to match their parent KYC status. Processes in batches to optimize memory usage.',
    required: false,
  })
  @ApiOkResponse({
    description: 'Documents status synchronized successfully',
    schema: {
      type: 'object',
      properties: {
        totalKycsProcessed: {
          type: 'number',
          example: 5,
          description: 'Total number of KYCs that had documents synchronized',
        },
        totalDocumentsSynced: {
          type: 'number',
          example: 15,
          description: 'Total number of documents updated',
        },
        batchSize: {
          type: 'number',
          example: 50,
          description: 'Batch size used for processing',
        },
        details: {
          type: 'array',
          description: 'Details of each KYC processed',
          items: {
            type: 'object',
            properties: {
              kycId: { type: 'string', example: 'uuid-123' },
              kycStatus: { type: 'string', example: 'PENDING' },
              documentsSynced: { type: 'number', example: 3 },
            },
          },
        },
      },
    },
  })
  async syncDocumentsStatus(@Body() dto?: SyncDocumentsStatusDto) {
    return this.kycsService.syncDocumentsStatus(
      dto?.kycId,
      dto?.batchSize || 50,
    );
  }

  @Post(pahts.admin + '/kycs/documents/update-group-type')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard, TwoFactorGuard)
  @ApiQuery({
    name: 'includeDetails',
    required: false,
    type: Boolean,
    description:
      'Include detailed information about each updated document (default: false). Set to true only if needed, as it increases memory usage.',
    example: false,
  })
  @ApiOkResponse({
    description:
      'Group type updated for all existing documents. Processes in batches of 50 to optimize memory usage. Uses transactions to ensure atomicity - if any error occurs, all changes are rolled back.',
    schema: {
      type: 'object',
      properties: {
        totalUpdated: {
          type: 'number',
          example: 125,
          description: 'Total number of documents updated with groupType',
        },
        batchSize: {
          type: 'number',
          example: 50,
          description: 'Batch size used for processing',
        },
        details: {
          type: 'array',
          description:
            'Details of each document updated (only included if includeDetails=true)',
          items: {
            type: 'object',
            properties: {
              documentId: { type: 'string', example: 'uuid-123' },
              type: { type: 'string', example: 'RG_FRONT' },
              groupType: { type: 'string', example: 'PERSONAL_IDENTITY' },
            },
          },
        },
      },
    },
  })
  async updateGroupTypeForExistingDocuments(
    @Query('includeDetails', new ParseBoolPipe({ optional: true }))
    includeDetails?: boolean,
  ) {
    return this.kycsService.updateGroupTypeForExistingDocuments(
      includeDetails ?? false,
    );
  }
}
