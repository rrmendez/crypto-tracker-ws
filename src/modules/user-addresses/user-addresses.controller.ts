import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserAddressesService } from './user-addresses.service';
import { pahts } from '@/config/configuration';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { RoleEnum } from '@/common/enums/role.enum';
import { JwtAuthGuard } from '@/core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { CurrentUserDto } from '@/common/dto/current-user.dto';
import { CreateUserAddressDto } from './dto/create-user-address.dto';
import { UpdateUserAddressDto } from './dto/update-user-address.dto';
import { UserAddressResponseVm } from './dto/user-address-response.vm';

@Controller()
export class UserAddressesController {
  constructor(private readonly userAddressesService: UserAddressesService) {}

  @Post(pahts.client + '/user-addresses')
  @ApiBearerAuth()
  @Roles(RoleEnum.USER, RoleEnum.MERCHANT)
  @UseGuards(JwtAuthGuard)
  async create(
    @CurrentUser() user: CurrentUserDto,
    @Body() createUserAddressDto: CreateUserAddressDto,
  ) {
    const res = await this.userAddressesService.createByUserId(
      user.userId,
      createUserAddressDto,
    );

    return new UserAddressResponseVm(res);
  }

  @Patch(pahts.client + '/user-addresses/:id')
  @ApiBearerAuth()
  @Roles(RoleEnum.USER, RoleEnum.MERCHANT)
  @UseGuards(JwtAuthGuard)
  async update(
    @CurrentUser() user: CurrentUserDto,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateUserAddressDto: UpdateUserAddressDto,
  ) {
    const res = await this.userAddressesService.updateByUserId(
      user.userId,
      id,
      updateUserAddressDto,
    );

    return new UserAddressResponseVm(res!);
  }
}
