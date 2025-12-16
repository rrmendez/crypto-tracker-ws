import { Inject, Injectable } from '@nestjs/common';
import { BadRequestException } from '@/common/exceptions/bad-request.exception';
import { NotFoundException } from '@/common/exceptions/not-found.exception';
import { CreateKycDto } from './dto/create-kyc.dto';
import { UpdateKycDto } from './dto/update-kyc.dto';
import { PartialRejectKycDto } from './dto/partial-reject-kyc.dto';
import { DATA_SOURCE, REPOSITORY } from '@/database/constants';
import {
  Between,
  DataSource,
  FindOptionsOrder,
  FindOptionsWhere,
  ILike,
  IsNull,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { Kyc } from './entities/kyc.entity';
import {
  KycStatusEnum,
  KycTypeEnum,
  KycDocumentStatusEnum,
  KycDocumentGroupTypeEnum,
  KycDocumentIdPfTypeEnum,
  KycDocumentIdPjTypeEnum,
  KycPhotoTypeEnum,
} from '@/common/enums/kyc-type-enum';
import { User } from '../users/entities/user.entity';
import { RoleEnum } from '@/common/enums/role.enum';
import { S3Service } from '@/core/uploads/s3.service';
import { KycDocuments } from './entities/kyc-documents.entity';
import { EntityManager } from 'typeorm';
import { EmailType } from '@/core/mail/builders/email-builder-factory.interface';
import { MailOutboxService } from '@/core/mail/services/mail-outbox.service';
import { I18nService } from 'nestjs-i18n';
import { ErrorCodes } from '@/common/utils/code.utils';

@Injectable()
export class KycsService {
  constructor(
    @Inject(REPOSITORY.KYC)
    private readonly kycRepository: Repository<Kyc>,
    @Inject(REPOSITORY.KYC_DOCUMENTS)
    private readonly kycDocumentsRepository: Repository<KycDocuments>,
    @Inject(REPOSITORY.USERS)
    private readonly usersRepository: Repository<User>,
    @Inject(DATA_SOURCE)
    private readonly dataSource: DataSource,
    private readonly s3Service: S3Service,
    private readonly mailOutboxService: MailOutboxService,
    private readonly i18n: I18nService,
  ) {}

  async createOnRegisterTx(
    manager: EntityManager,
    user: User,
  ): Promise<Kyc | null> {
    let kycType: KycTypeEnum;

    if (!user.roles.some((r) => r.name === RoleEnum.MERCHANT.toString())) {
      kycType = KycTypeEnum.IDENTITY_PF;
    } else {
      kycType = KycTypeEnum.IDENTITY_PJ;
    }

    // Get translated request reason based on user's language
    const lang = user.lang || 'pt';
    const requestReason = this.i18n.t('common.accountValidation', { lang });

    const kyc = manager.create(Kyc, {
      type: kycType,
      status: KycStatusEnum.REQUESTED,
      user,
      isMandatory: true,
      isForCompliance: true,
      requestReason,
      createdBy: { id: user.id },
      updatedBy: { id: user.id },
      documents: [],
    });

    return manager.save(Kyc, kyc);
  }

  async validate(
    userId: string,
    createKycDto: CreateKycDto & { documents: { file: Express.Multer.File }[] },
  ): Promise<Kyc | null> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException({
        errorCode: ErrorCodes.USER_NOT_FOUND,
        i18nKey: 'errors.user.notFound',
      });
    }

    const kyc = await this.kycRepository.findOne({
      where: { id: createKycDto.kycId },
    });

    if (!kyc) {
      throw new NotFoundException({
        errorCode: ErrorCodes.KYC_NOT_FOUND,
        i18nKey: 'errors.kyc.notFound',
      });
    }

    if (
      kyc.status !== KycStatusEnum.REQUESTED &&
      kyc.status !== KycStatusEnum.PARTIALLY_REJECTED
    ) {
      throw new BadRequestException({
        errorCode: ErrorCodes.KYC_INVALID_STATUS,
        i18nKey: 'errors.kyc.invalidStatus',
      });
    }

    if (
      ([KycTypeEnum.IDENTITY_PJ].includes(kyc.type) &&
        !user.roles.some((r) => r.name === RoleEnum.MERCHANT.toString())) ||
      (user.roles.some((r) => r.name === RoleEnum.MERCHANT.toString()) &&
        [KycTypeEnum.IDENTITY_PF].includes(kyc.type))
    ) {
      throw new BadRequestException({
        errorCode: ErrorCodes.KYC_INVALID_TYPE,
        i18nKey: 'errors.kyc.invalidType',
      });
    }

    // Save kyc documents
    for (const doc of createKycDto.documents) {
      // Guardar en S3
      const file = await this.s3Service.uploadFile(
        doc.file as Express.Multer.File,
      );

      // Crear instancia de documento
      const kycDocument = this.kycDocumentsRepository.create({
        kyc,
        type: doc.type,
        description: doc.description,
        fileUrl: file.url,
        extension: file.url.split('.').pop(),
        status: KycDocumentStatusEnum.PENDING,
      });

      // Guardar en la base de datos
      await this.kycDocumentsRepository.save(kycDocument);
    }

    // Update kyc status
    kyc.status = KycStatusEnum.PENDING;
    await this.kycRepository.save(kyc);

    // Devolver el objeto de kyc
    return await this.kycRepository.findOne({
      where: { id: kyc.id },
      relations: ['documents', 'user'],
    });
  }

  async getPaginatedKycs(
    userId: string,
    page = 1,
    limit = 10,
    filters?: {
      status?: KycStatusEnum;
      type?: KycTypeEnum;
      order?: 'ASC' | 'DESC';
      orderBy?: keyof Kyc;
      from?: Date;
      to?: Date;
      composerSearch?: string;
    },
  ): Promise<[Kyc[], number]> {
    const where: FindOptionsWhere<Kyc>[] = [];

    // Base condition (por usuario)
    const baseWhere: FindOptionsWhere<Kyc> = {
      user: { id: userId },
    };

    // Filtros dinámicos específicos
    if (filters?.status) baseWhere.status = filters.status;
    if (filters?.type) baseWhere.type = filters.type;

    if (filters?.from && filters?.to) {
      baseWhere.createdAt = Between(filters.from, filters.to);
    } else if (filters?.from) {
      baseWhere.createdAt = MoreThanOrEqual(filters.from);
    } else if (filters?.to) {
      baseWhere.createdAt = LessThanOrEqual(filters.to);
    }

    // 🔍 composerSearch seguro y type-friendly
    if (filters?.composerSearch) {
      const search = `%${filters.composerSearch}%`;

      where.push(
        {
          ...baseWhere,
          user: { id: userId, fullName: ILike(search) },
        },
        {
          ...baseWhere,
          user: { id: userId, email: ILike(search) },
        },
      );
    } else {
      where.push(baseWhere);
    }

    // Orden dinámico
    const order: FindOptionsOrder<Kyc> = {
      [filters?.orderBy ?? 'createdAt']:
        filters?.order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC',
    };

    return this.kycRepository.findAndCount({
      take: limit,
      skip: (page - 1) * limit,
      relations: ['user', 'documents', 'createdBy', 'updatedBy'],
      where,
      order,
    });
  }

  // async getPaginatedKycs(
  //   userId: string,
  //   page = 1,
  //   limit = 10,
  //   filters?: {
  //     status?: KycStatusEnum;
  //     type?: KycTypeEnum;
  //     order?: 'ASC' | 'DESC';
  //     orderBy?: keyof Kyc;
  //     from?: Date;
  //     to?: Date;
  //     composerSearch?: string;
  //   },
  // ): Promise<[Kyc[], number]> {
  //   // Define el filtro base (por defecto: filtrar por usuario)
  //   const where: FindOptionsWhere<Kyc> | FindOptionsWhere<Kyc>[] = {
  //     user: { id: userId },
  //   };

  //   // Aplica filtros dinámicos
  //   if (filters?.status) {
  //     where.status = filters.status;
  //   }
  //   if (filters?.type) {
  //     where.type = filters.type;
  //   }

  //   if (filters?.from && filters?.to) {
  //     where.createdAt = Between(filters.from, filters.to);
  //   } else if (filters?.from) {
  //     where.createdAt = MoreThanOrEqual(filters.from);
  //   } else if (filters?.to) {
  //     where.createdAt = LessThanOrEqual(filters.to);
  //   }

  //   // Orden dinámico (por defecto: createdAt ASC)
  //   const order: FindOptionsOrder<Kyc> = {
  //     [filters?.orderBy ?? 'createdAt']:
  //       filters?.order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC',
  //   };

  //   return this.kycRepository.findAndCount({
  //     take: limit,
  //     skip: (page - 1) * limit,
  //     relations: ['user', 'documents', 'createdBy', 'updatedBy'],
  //     where,
  //     order,
  //   });
  // }

  async getPaginatedListKycs(
    page = 1,
    limit = 10,
    filters?: {
      status?: KycStatusEnum;
      type?: KycTypeEnum;
      order?: 'ASC' | 'DESC';
      orderBy?: keyof Kyc;
      email?: string;
      from?: Date;
      to?: Date;
    },
  ): Promise<[Kyc[], number]> {
    const where: FindOptionsWhere<Kyc>[] = [];

    // Base condition
    const baseWhere: FindOptionsWhere<Kyc> = {};

    // Aplica filtros dinámicos
    if (filters?.status) baseWhere.status = filters.status;
    if (filters?.type) baseWhere.type = filters.type;

    // Email filter
    if (filters?.email) {
      const emailSearch = `%${filters.email}%`;
      baseWhere.user = { email: ILike(emailSearch) };
    }

    if (filters?.from && filters?.to) {
      baseWhere.createdAt = Between(filters.from, filters.to);
    } else if (filters?.from) {
      baseWhere.createdAt = MoreThanOrEqual(filters.from);
    } else if (filters?.to) {
      baseWhere.createdAt = LessThanOrEqual(filters.to);
    }

    where.push(baseWhere);

    // Orden dinámico (por defecto: createdAt ASC)
    const order: FindOptionsOrder<Kyc> = {
      [filters?.orderBy ?? 'createdAt']:
        filters?.order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC',
    };

    return this.kycRepository.findAndCount({
      take: limit,
      skip: (page - 1) * limit,
      relations: ['user', 'documents', 'createdBy', 'updatedBy'],
      where,
      order,
    });
  }

  async findOne(id: string) {
    const kyc = await this.kycRepository.findOne({
      where: { id },
      relations: ['user', 'documents', 'createdBy', 'updatedBy'],
    });

    if (!kyc) {
      throw new NotFoundException({
        errorCode: ErrorCodes.KYC_NOT_FOUND,
        i18nKey: 'errors.kyc.notFound',
      });
    }

    return kyc;
  }

  async approve(id: string, userId: string) {
    return await this.kycRepository.manager.transaction(
      async (manager: EntityManager) => {
        const kyc = await manager.findOne(Kyc, {
          where: { id },
          relations: ['user', 'documents'],
        });

        if (!kyc) {
          throw new NotFoundException({
            errorCode: ErrorCodes.KYC_NOT_FOUND,
            i18nKey: 'errors.kyc.notFound',
          });
        }

        if (KycStatusEnum.PENDING !== kyc.status) {
          throw new BadRequestException({
            errorCode: ErrorCodes.KYC_INVALID_STATUS,
            i18nKey: 'errors.kyc.invalidStatus',
          });
        }

        kyc.status = KycStatusEnum.APPROVED;
        kyc.updatedBy = { id: userId } as User;

        // Update user account
        if (kyc.isForCompliance) {
          const user = kyc.user;
          user.verified = true;
          await manager.save(User, user);
        }

        // Update documents status to APPROVED
        for (const document of kyc.documents.filter(
          (doc) => doc.status === KycDocumentStatusEnum.PENDING,
        )) {
          document.status = KycDocumentStatusEnum.APPROVED;
        }

        await manager.save(KycDocuments, kyc.documents);
        await manager.save(Kyc, kyc);

        await this.mailOutboxService.enqueueTx(
          manager,
          EmailType.ACCOUNT_VALIDATED,
          {
            to: kyc.user.email,
            userName: kyc.user.fullName,
          },
        );

        return kyc;
      },
    );
  }

  async reject(id: string, updateKycDto: UpdateKycDto, userId: string) {
    return await this.kycRepository.manager.transaction(
      async (manager: EntityManager) => {
        const kyc = await manager.findOne(Kyc, {
          where: { id },
          relations: ['user', 'documents'],
        });

        if (!kyc) {
          throw new NotFoundException({
            errorCode: ErrorCodes.KYC_NOT_FOUND,
            i18nKey: 'errors.kyc.notFound',
          });
        }

        if (KycStatusEnum.PENDING !== kyc.status) {
          throw new BadRequestException({
            errorCode: ErrorCodes.KYC_INVALID_STATUS,
            i18nKey: 'errors.kyc.invalidStatus',
          });
        }

        kyc.status = KycStatusEnum.REJECTED;
        kyc.rejectReason = updateKycDto.rejectReason;
        kyc.updatedBy = { id: userId } as User;

        // Update user account
        if (kyc.isForCompliance) {
          const user = kyc.user;
          user.verified = false;
          user.isBlocked = true;
          await manager.save(User, user);
        }

        // Update documents status to REJECTED
        for (const document of kyc.documents.filter(
          (doc) => doc.status === KycDocumentStatusEnum.PENDING,
        )) {
          document.status = KycDocumentStatusEnum.REJECTED;
          document.rejectReason = updateKycDto.rejectReason;
        }

        await manager.save(KycDocuments, kyc.documents);
        await manager.save(Kyc, kyc);

        await this.mailOutboxService.enqueueTx(
          manager,
          EmailType.KYC_REJECTED,
          {
            to: kyc.user.email,
            userName: kyc.user.fullName,
            reason: updateKycDto.rejectReason ?? '',
          },
        );

        return kyc;
      },
    );
  }

  async partialReject(
    id: string,
    partialRejectKycDto: PartialRejectKycDto,
    userId: string,
  ): Promise<Kyc> {
    return await this.kycRepository.manager.transaction(
      async (manager: EntityManager) => {
        // Find KYC with documents
        const kyc = await manager.findOne(Kyc, {
          where: { id },
          relations: ['user'],
        });

        if (!kyc) {
          throw new NotFoundException({
            errorCode: ErrorCodes.KYC_NOT_FOUND,
            i18nKey: 'errors.kyc.notFound',
          });
        }

        // Validate KYC status
        if (KycStatusEnum.PENDING !== kyc.status) {
          throw new BadRequestException({
            errorCode: ErrorCodes.KYC_INVALID_STATUS,
            i18nKey: 'errors.kyc.invalidStatus',
          });
        }

        // Validate that documentIds array is not empty
        if (
          !partialRejectKycDto.documentIds ||
          partialRejectKycDto.documentIds.length === 0
        ) {
          throw new BadRequestException({
            errorCode: ErrorCodes.KYC_NO_DOCUMENTS_TO_REJECT,
            i18nKey: 'errors.kyc.noDocumentsToReject',
          });
        }

        // Find and validate documents
        const documentsToReject = await manager.find(KycDocuments, {
          where: partialRejectKycDto.documentIds.map((docId) => ({
            id: docId,
            kyc: { id },
          })),
        });

        // Validate that all documents exist
        if (
          documentsToReject.length !== partialRejectKycDto.documentIds.length
        ) {
          throw new NotFoundException({
            errorCode: ErrorCodes.KYC_DOCUMENT_NOT_FOUND,
            i18nKey: 'errors.kyc.documentNotFound',
          });
        }

        // Validate that all documents are in PENDING status
        const invalidStatusDocs = documentsToReject.filter(
          (doc) => doc.status !== KycDocumentStatusEnum.PENDING,
        );

        if (invalidStatusDocs.length > 0) {
          throw new BadRequestException({
            errorCode: ErrorCodes.KYC_DOCUMENT_INVALID_STATUS,
            i18nKey: 'errors.kyc.documentInvalidStatus',
          });
        }

        // Update documents status to REJECTED
        for (const document of documentsToReject) {
          document.status = KycDocumentStatusEnum.REJECTED;
          document.rejectReason = partialRejectKycDto.rejectReason;
          await manager.save(KycDocuments, document);
        }

        // Update KYC status to PARTIALLY_REJECTED
        kyc.status = KycStatusEnum.PARTIALLY_REJECTED;
        kyc.updatedBy = { id: userId } as User;

        await manager.save(Kyc, kyc);

        //TODO: Send notification email

        // Attach only the rejected documents to the response
        kyc.documents = documentsToReject;

        return kyc;
      },
    );
  }

  async syncDocumentsStatus(kycId?: string, batchSize = 50) {
    return await this.kycRepository.manager.transaction(
      async (manager: EntityManager) => {
        let totalSynced = 0;
        const syncResults: {
          kycId: string;
          kycStatus: KycStatusEnum;
          documentsSynced: number;
        }[] = [];

        // If kycId is provided, sync only that specific KYC
        if (kycId) {
          const kyc = await manager.findOne(Kyc, {
            where: { id: kycId },
          });

          if (!kyc) {
            throw new NotFoundException({
              errorCode: ErrorCodes.KYC_NOT_FOUND,
              i18nKey: 'errors.kyc.notFound',
            });
          }

          // Get document status based on KYC status
          const documentStatus = this.getDocumentStatusFromKycStatus(
            kyc.status,
          );

          // Update documents with null status for this KYC using a direct query
          const result = await manager
            .createQueryBuilder()
            .update(KycDocuments)
            .set({ status: documentStatus })
            .where('kyc_id = :kycId', { kycId })
            .andWhere('status IS NULL')
            .execute();

          if (result.affected && result.affected > 0) {
            syncResults.push({
              kycId: kyc.id,
              kycStatus: kyc.status,
              documentsSynced: result.affected,
            });
            totalSynced = result.affected;
          }

          return {
            totalKycsProcessed: 1,
            totalDocumentsSynced: totalSynced,
            details: syncResults,
          };
        }

        // Process all KYCs in batches
        // Note: We always query with offset 0 because after updating documents,
        // those KYCs no longer have NULL status and disappear from results
        let hasMore = true;
        let totalKycsProcessed = 0;

        while (hasMore) {
          // Get KYCs that have documents with null status
          // Always use offset 0 since processed KYCs are removed from results after update
          const kycsWithNullDocs = await manager
            .createQueryBuilder(Kyc, 'kyc')
            .innerJoin('kyc.documents', 'doc', 'doc.status IS NULL')
            .select(['kyc.id', 'kyc.status'])
            .distinct(true)
            .take(batchSize)
            .getMany();

          if (kycsWithNullDocs.length === 0) {
            hasMore = false;
            break;
          }

          // Process each KYC in the batch
          for (const kyc of kycsWithNullDocs) {
            const documentStatus = this.getDocumentStatusFromKycStatus(
              kyc.status,
            );

            // Update all null documents for this KYC
            const result = await manager
              .createQueryBuilder()
              .update(KycDocuments)
              .set({ status: documentStatus })
              .where('kyc_id = :kycId', { kycId: kyc.id })
              .andWhere('status IS NULL')
              .execute();

            if (result.affected && result.affected > 0) {
              syncResults.push({
                kycId: kyc.id,
                kycStatus: kyc.status,
                documentsSynced: result.affected,
              });
              totalSynced += result.affected;
              totalKycsProcessed++;
            }
          }

          // If we got fewer results than batchSize, there are no more KYCs to process
          if (kycsWithNullDocs.length < batchSize) {
            hasMore = false;
          }
          // Otherwise, continue with next batch (automatically fetches new KYCs at offset 0)
        }

        return {
          totalKycsProcessed,
          totalDocumentsSynced: totalSynced,
          batchSize,
          details: syncResults,
        };
      },
    );
  }

  /**
   * Updates groupType for all existing documents that have null groupType
   * This method processes documents in batches to avoid memory issues and uses transactions
   * for atomicity. If any error occurs, all changes are rolled back.
   *
   * @param includeDetails - If true, returns detailed information about each updated document (default: false)
   * @returns Object with totalUpdated count, batchSize, and optionally details array
   *
   * Default batch size: 50 documents per batch
   */
  async updateGroupTypeForExistingDocuments(includeDetails = false): Promise<{
    totalUpdated: number;
    batchSize: number;
    details?: {
      documentId: string;
      type: string;
      groupType: KycDocumentGroupTypeEnum;
    }[];
  }> {
    const batchSize = 50;

    // Use transaction to ensure atomicity - if any batch fails, everything rolls back
    return await this.kycRepository.manager.transaction(async (manager) => {
      const details: {
        documentId: string;
        type: string;
        groupType: KycDocumentGroupTypeEnum;
      }[] = [];
      let totalUpdated = 0;
      let hasMore = true;

      // Process in batches until no more documents with null groupType
      while (hasMore) {
        // Always query from offset 0 because after updating,
        // those documents no longer have null groupType
        const batch = await manager.find(KycDocuments, {
          where: { groupType: IsNull() },
          take: batchSize,
        });

        // No more documents to process
        if (batch.length === 0) {
          hasMore = false;
          break;
        }

        // Group documents by their calculated groupType for batch update
        const groupsByType = new Map<
          KycDocumentGroupTypeEnum,
          { ids: string[]; types: string[] }
        >();

        batch.forEach((doc) => {
          const groupType = this.calculateGroupTypeFromDocType(doc.type);

          if (!groupsByType.has(groupType)) {
            groupsByType.set(groupType, { ids: [], types: [] });
          }

          const group = groupsByType.get(groupType)!;
          group.ids.push(doc.id);
          group.types.push(doc.type);

          // Only accumulate details if requested
          if (includeDetails) {
            details.push({
              documentId: doc.id,
              type: doc.type,
              groupType,
            });
          }
        });

        // Update each group in a single query for efficiency
        for (const [groupType, group] of groupsByType.entries()) {
          await manager
            .createQueryBuilder()
            .update(KycDocuments)
            .set({ groupType: groupType })
            .where('id IN (:...ids)', { ids: group.ids })
            .execute();
        }

        totalUpdated += batch.length;

        // If we got fewer results than batchSize, there are no more documents
        if (batch.length < batchSize) {
          hasMore = false;
        }
      }

      // Return details only if includeDetails is true
      return {
        totalUpdated,
        batchSize,
        ...(includeDetails && { details }),
      };
    });
  }

  /**
   * Helper method to calculate groupType from document type
   */
  private calculateGroupTypeFromDocType(
    type: KycDocumentIdPfTypeEnum | KycDocumentIdPjTypeEnum | KycPhotoTypeEnum,
  ): KycDocumentGroupTypeEnum {
    const typeString = type as string;

    // Check if type is from KycDocumentIdPfTypeEnum
    if (
      Object.values(KycDocumentIdPfTypeEnum).includes(
        typeString as KycDocumentIdPfTypeEnum,
      )
    ) {
      return KycDocumentGroupTypeEnum.PERSONAL_IDENTITY;
    }

    // Check if type is from KycDocumentIdPjTypeEnum
    if (
      Object.values(KycDocumentIdPjTypeEnum).includes(
        typeString as KycDocumentIdPjTypeEnum,
      )
    ) {
      return KycDocumentGroupTypeEnum.COMPANY_IDENTITY;
    }

    // Check if type is from KycPhotoTypeEnum
    if (
      Object.values(KycPhotoTypeEnum).includes(typeString as KycPhotoTypeEnum)
    ) {
      return KycDocumentGroupTypeEnum.PERSONAL_SELFIE;
    }

    // Default fallback
    return KycDocumentGroupTypeEnum.PERSONAL_IDENTITY;
  }

  private getDocumentStatusFromKycStatus(
    kycStatus: KycStatusEnum,
  ): KycDocumentStatusEnum {
    switch (kycStatus) {
      case KycStatusEnum.REQUESTED:
        return KycDocumentStatusEnum.REQUESTED;
      case KycStatusEnum.PENDING:
      case KycStatusEnum.PARTIALLY_REJECTED:
        return KycDocumentStatusEnum.PENDING;
      case KycStatusEnum.APPROVED:
        return KycDocumentStatusEnum.APPROVED;
      case KycStatusEnum.REJECTED:
        return KycDocumentStatusEnum.REJECTED;
      default:
        return KycDocumentStatusEnum.PENDING;
    }
  }
}
