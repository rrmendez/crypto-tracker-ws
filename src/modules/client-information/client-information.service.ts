import { Inject, Injectable } from '@nestjs/common';
import { CreateClientInformationDto } from './dto/create-client-information.dto';
import { REPOSITORY } from '@/database/constants';
import { EntityManager, Repository } from 'typeorm';
import { ClientInformation } from './entities/client-information.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class ClientInformationService {
  constructor(
    @Inject(REPOSITORY.CLIENT_INFORMATION)
    private readonly clientInformationRepository: Repository<ClientInformation>,
  ) {}

  async createTx(
    manager: EntityManager,
    user: User,
    data: CreateClientInformationDto,
  ): Promise<ClientInformation> {
    const userName = `${user.firstName}${user.lastName ? ` ${user.lastName}` : ''}`;

    const information = manager.create(ClientInformation, {
      ...data,
      userName,
      user,
      cpf: data.cpf ? this.normalizeDocument(data.cpf) : undefined,
      cnpj: data.cnpj ? this.normalizeDocument(data.cnpj) : undefined,
    });

    return manager.save(ClientInformation, information);
  }

  /**
   * Busca un cliente por documento (cpf o cnpj normalizado)
   */
  async findByDocument(document: string) {
    const normalized = this.normalizeDocument(document);

    return this.clientInformationRepository.findOne({
      where: [{ cpf: normalized }, { cnpj: normalized }],
    });
  }

  /**
   * Verifica si un documento ya está registrado
   */
  async isDocumentRegistered(document: string) {
    const existing = await this.findByDocument(document);
    return !!existing;
  }

  // -----------------------------------------------------------------------------

  /**
   * Normaliza un documento quitando . - / y espacios
   */
  private normalizeDocument(doc: string): string {
    // eslint-disable-next-line no-useless-escape
    return doc.replace(/[.\-\/\s]/g, '');
  }
}
