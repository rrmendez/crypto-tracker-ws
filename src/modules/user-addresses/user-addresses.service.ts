import { Inject, Injectable } from '@nestjs/common';
import { CreateUserAddressDto } from './dto/create-user-address.dto';
import { REPOSITORY } from '@/database/constants';
import { EntityManager, Not, Repository } from 'typeorm';
import { UserAddress } from './entities/user-address.entity';
import { User } from '../users/entities/user.entity';
import { UserAddressStatusEnum } from '@/common/enums/user-address-status.enum';
import { UpdateUserAddressDto } from './dto/update-user-address.dto';

@Injectable()
export class UserAddressesService {
  constructor(
    @Inject(REPOSITORY.USER_ADDRESSES)
    private readonly userAddressesRepository: Repository<UserAddress>,
  ) {}

  async createTx(
    manager: EntityManager,
    user: User,
    dto: CreateUserAddressDto,
  ): Promise<UserAddress> {
    const address = manager.create(UserAddress, {
      ...dto,
      status: UserAddressStatusEnum.ACTIVE,
      user,
    });

    return manager.save(UserAddress, address);
  }

  async createByUserId(userId: string, dto: CreateUserAddressDto) {
    const address = this.userAddressesRepository.create({
      ...dto,
      status: UserAddressStatusEnum.ACTIVE,
      user: { id: userId } as User,
    });

    const savedAddress = await this.userAddressesRepository.save(address);

    // 3. Actualizar todas las demás direcciones del usuario
    await this.userAddressesRepository.update(
      {
        user: { id: userId } as User,
        id: Not(savedAddress.id),
      },
      { status: UserAddressStatusEnum.INACTIVE },
    );

    return savedAddress;
  }

  async updateByUserId(userId: string, id: string, dto: UpdateUserAddressDto) {
    const address = await this.userAddressesRepository.findOne({
      where: { id: id, user: { id: userId } },
    });

    if (!address) {
      throw new Error('Address not found');
    }

    await this.userAddressesRepository.save({
      ...address,
      ...dto,
    });

    const updatedAddress = await this.userAddressesRepository.findOne({
      where: { id },
    });

    // 3. Actualizar todas las demás direcciones del usuario
    await this.userAddressesRepository.update(
      {
        user: { id: userId } as User,
        id: Not(id),
      },
      { status: UserAddressStatusEnum.INACTIVE },
    );

    return updatedAddress;
  }
}
