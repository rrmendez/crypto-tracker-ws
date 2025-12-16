import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Patch,
  Query,
  Headers,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Roles } from '@/common/decorators/roles.decorator';
import { RoleEnum } from 'src/common/enums/role.enum';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '@/core/auth/guards/jwt-auth.guard';
import { CurrentUserDto } from '@/common/dto/current-user.dto';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { pahts } from '@/config/configuration';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOkResponse,
  ApiQuery,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { UsersResponseVm } from './dto/users-response.vm';
import { PaginatedResponseVm } from '@/common/vm/paginated-response.vm';
import { UsersProfileResponseVm } from './dto/users-profile.vm';
import { PhoneRequestDto } from './dto/phone-request.dto';
import { PhoneVerificationDto } from './dto/phone-verification.dto';
import { ClientsResponseVm } from './dto/clients-response.vm';
import { FileInterceptor } from '@nestjs/platform-express';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { CheckPasswordDto } from './dto/check-password.dto';
import { EnableSecondFactorDto } from './dto/enable-second-factor.dto';
import { DisableSecondFactorDto } from './dto/disable-second-factor.dto';
import { TwoFactorGuard } from '@/core/auth/guards/two-factor.guard';
import { SecurityActionDto } from './dto/security-action.dto';
import { UserSecurityLogVm } from './dto/user-security-log.vm';
import { UserSecurityLog } from './entities/user-security-log.entity';
import { AuthService } from '@/core/auth/auth.service';
import { UpdateLanguageDto } from './dto/update-language.dto';
import { ClientsFilterDto } from './dto/clients-filter.dto';
import { UsersFilterDto } from './dto/users-filter.dto';
import { SecurityLogsFilterDto } from './dto/security-logs-filter.dto';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';
import { ActivateDeactivateAdminUserDto } from './dto/admin-user-activation.dto';
import { CheckEmailAvailabilityDto } from './dto/check-email-availability.dto';
import { CheckEmailAvailabilityResponseVm } from './dto/check-email-availability-response.vm';
import { GetHdWalletMnemonicDto } from './dto/get-hd-wallet-mnemonic.dto';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

@Controller()
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  @Get(pahts.auth + '/profile')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser() user: CurrentUserDto) {
    const response = await this.usersService.findById(user.userId);

    if (!response) {
      throw new NotFoundException('User not found');
    }

    return new UsersProfileResponseVm(response);
  }

  @Get(pahts.admin + '/users')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiOkResponse({
    description: 'Usuarios paginados',
    type: PaginatedResponseVm<UsersResponseVm>,
  })
  async getPaginatedUsers(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query() filters: UsersFilterDto,
  ): Promise<PaginatedResponseVm<UsersResponseVm>> {
    const currentPage = page > 0 ? page : 1;
    const [users, total] = await this.usersService.getPaginatedUsers(
      currentPage,
      limit,
      filters,
    );

    const data = users.map((user) => new UsersResponseVm(user));

    return new PaginatedResponseVm(data, total, currentPage, limit);
  }

  @Get(pahts.admin + '/clients')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiOkResponse({
    description: 'Clientes paginados',
    type: PaginatedResponseVm<ClientsResponseVm>,
  })
  async getPaginatedClients(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query() filters: ClientsFilterDto,
  ): Promise<PaginatedResponseVm<ClientsResponseVm>> {
    const currentPage = page > 0 ? page : 1;
    const [clients, total] = await this.usersService.getPaginatedClients(
      currentPage,
      limit,
      filters,
    );

    const data = clients.map((client) => new ClientsResponseVm(client));

    return new PaginatedResponseVm(data, total, currentPage, limit);
  }

  // ---------------------------------------------------------------------------
  // Admin security controls
  // ---------------------------------------------------------------------------

  @Post(pahts.admin + '/users/:id/lock-account')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Lock user account' })
  @ApiResponse({ status: 200, description: 'Account locked' })
  @ApiResponse({ status: 400, description: 'Account already locked' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @HttpCode(HttpStatus.OK)
  async lockAccount(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() currentUser: CurrentUserDto,
    @Body() dto: SecurityActionDto,
  ) {
    return this.usersService.lockAccount(id, currentUser.userId, dto?.reason);
  }

  @Post(pahts.admin + '/users/:id/unlock-account')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Unlock user account' })
  @ApiResponse({ status: 200, description: 'Account unlocked' })
  @ApiResponse({ status: 400, description: 'Account already unlocked' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @HttpCode(HttpStatus.OK)
  async unlockAccount(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() currentUser: CurrentUserDto,
    @Body() dto: SecurityActionDto,
  ) {
    return this.usersService.unlockAccount(id, currentUser.userId, dto?.reason);
  }

  @Post(pahts.admin + '/users/:id/lock-transfers')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Lock user transfers' })
  @ApiResponse({ status: 200, description: 'Transfers locked' })
  @ApiResponse({ status: 400, description: 'Transfers already locked' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @HttpCode(HttpStatus.OK)
  async lockTransfers(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() currentUser: CurrentUserDto,
    @Body() dto: SecurityActionDto,
  ) {
    return this.usersService.lockTransfers(id, currentUser.userId, dto?.reason);
  }

  @Post(pahts.admin + '/users/:id/unlock-transfers')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Unlock user transfers' })
  @ApiResponse({ status: 200, description: 'Transfers unlocked' })
  @ApiResponse({ status: 400, description: 'Transfers already unlocked' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @HttpCode(HttpStatus.OK)
  async unlockTransfers(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() currentUser: CurrentUserDto,
    @Body() dto: SecurityActionDto,
  ) {
    return this.usersService.unlockTransfers(
      id,
      currentUser.userId,
      dto?.reason,
    );
  }

  // ---------------------------------------------------------------------------
  // Admin: Initiate 2FA disable (send email with recovery link)
  // ---------------------------------------------------------------------------
  @Post(pahts.admin + '/disable-second-factor')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async adminDisableSecondFactor(
    @Body('userId', new ParseUUIDPipe()) userId: string,
    @Headers('x-app-environment') appEnvironment?: string,
  ) {
    return this.authService.requestSecondFactorRecovery(
      userId,
      appEnvironment || '',
    );
  }

  @Get(pahts.admin + '/users/:id/security-logs')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiOperation({ summary: 'List user security logs' })
  @ApiResponse({ status: 200, description: 'Security logs list' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiOkResponse({
    description: 'Security logs list',
    type: PaginatedResponseVm<UserSecurityLogVm>,
  })
  @HttpCode(HttpStatus.OK)
  async listSecurityLogs(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query() filters: SecurityLogsFilterDto,
  ): Promise<PaginatedResponseVm<UserSecurityLogVm>> {
    const { logs, total } = await this.usersService.listUserSecurityLogs(
      id,
      page,
      limit,
      filters,
    );
    return new PaginatedResponseVm(
      logs.map((l: UserSecurityLog) => new UserSecurityLogVm(l)),
      total,
      page,
      limit,
    );
  }

  @Get(pahts.admin + '/clients/:id')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({
    description: 'Cliente encontrado',
    type: UsersProfileResponseVm,
  })
  async getClientById(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<UsersProfileResponseVm> {
    const client = await this.usersService.findById(id);

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    return new UsersProfileResponseVm(client);
  }

  @Get(pahts.admin + '/users/:id')
  @UseGuards(JwtAuthGuard)
  @Roles(RoleEnum.ADMIN)
  @ApiOkResponse({
    description: 'Usuario encontrado',
    type: UsersResponseVm,
  })
  async getUserById(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<UsersResponseVm> {
    const user = await this.usersService.findById(id, [
      'roles',
      'securityLogs',
      'securityLogs.createdBy',
    ]);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return new UsersResponseVm(user);
  }

  @Post(pahts.client + '/send-phone-code')
  @ApiBearerAuth()
  @Roles(RoleEnum.USER, RoleEnum.MERCHANT)
  @UseGuards(JwtAuthGuard)
  async sendPhoneCode(
    @CurrentUser() user: CurrentUserDto,
    @Body() phoneRequestDto: PhoneRequestDto,
  ) {
    await this.usersService.createPhoneVerification(
      user.userId,
      phoneRequestDto,
    );

    return { message: 'Phone code sended' };
  }

  @Post(pahts.admin + '/send-phone-code')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  async sendPhoneCodeAdmin(
    @CurrentUser() user: CurrentUserDto,
    @Body() phoneRequestDto: PhoneRequestDto,
  ) {
    await this.usersService.createPhoneVerification(
      user.userId,
      phoneRequestDto,
    );

    return { message: 'Phone code sended' };
  }

  @Post(pahts.client + '/verify-phone-code')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @Roles(RoleEnum.USER, RoleEnum.MERCHANT)
  @UseGuards(JwtAuthGuard)
  async update(
    @CurrentUser() user: CurrentUserDto,
    @Body() phoneVerificationDto: PhoneVerificationDto,
  ) {
    await this.usersService.verifyPhoneCode(user.userId, phoneVerificationDto);

    return { message: 'Phone verified' };
  }

  @Post(pahts.admin + '/verify-phone-code')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  async verifyPhoneCodeAdmin(
    @CurrentUser() user: CurrentUserDto,
    @Body() phoneVerificationDto: PhoneVerificationDto,
  ) {
    await this.usersService.verifyPhoneCode(user.userId, phoneVerificationDto);

    return { message: 'Phone verified' };
  }

  @Post(pahts.client + '/avatar')
  @ApiBearerAuth()
  @Roles(RoleEnum.USER, RoleEnum.MERCHANT)
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  updateAvatar(
    @CurrentUser() user: CurrentUserDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.usersService.updateAvatar(user.userId, file);
  }

  @Post(pahts.admin + '/avatar')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  updateAdminAvatar(
    @CurrentUser() user: CurrentUserDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.usersService.updateAvatar(user.userId, file);
  }

  @HttpCode(HttpStatus.OK)
  @Post(pahts.auth + '/password')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  updatePassword(
    @CurrentUser() user: CurrentUserDto,
    @Body() dto: UpdatePasswordDto,
  ) {
    return this.usersService.updatePassword(user.userId, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post(pahts.auth + '/check-password')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  checkPassword(
    @CurrentUser() user: CurrentUserDto,
    @Body() dto: CheckPasswordDto,
  ) {
    return this.usersService.verifyPassword(user.userId, dto.password);
  }

  @HttpCode(HttpStatus.OK)
  @Post(pahts.auth + '/enable-second-factor')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TwoFactorGuard)
  enableSecondFactor(
    @CurrentUser() user: CurrentUserDto,
    @Body() dto: EnableSecondFactorDto,
  ) {
    return this.usersService.enableSecondFactor(user.userId, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post(pahts.auth + '/disable-second-factor')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TwoFactorGuard)
  disableSecondFactor(
    @CurrentUser() user: CurrentUserDto,
    @Body() dto: DisableSecondFactorDto,
  ) {
    return this.usersService.disableSecondFactor(user.userId, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post(pahts.client + '/update-language')
  @ApiBearerAuth()
  @Roles(RoleEnum.USER, RoleEnum.MERCHANT)
  @UseGuards(JwtAuthGuard)
  updateLanguage(
    @CurrentUser() user: CurrentUserDto,
    @Body() dto: UpdateLanguageDto,
  ) {
    return this.usersService.updateLanguage(user.userId, dto.lang);
  }

  @HttpCode(HttpStatus.OK)
  @Post(pahts.admin + '/update-language')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  updateLanguageAdmin(
    @CurrentUser() user: CurrentUserDto,
    @Body() dto: UpdateLanguageDto,
  ) {
    return this.usersService.updateLanguage(user.userId, dto.lang);
  }

  /**************************************************************************
   * Users admin management
   * ***********************************************************************/

  @Post(pahts.admin + '/users')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create user' })
  @ApiBody({ type: CreateAdminUserDto })
  createAdminUser(
    @CurrentUser() currentUser: CurrentUserDto,
    @Body() dto: CreateAdminUserDto,
  ) {
    return this.usersService.createAdminUser(currentUser.userId, dto);
  }

  @Post(pahts.admin + '/check-email-availability')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Check if email is available for administrative account creation',
  })
  @ApiBody({ type: CheckEmailAvailabilityDto })
  @ApiResponse({
    status: 200,
    description: 'Email availability check completed',
    type: CheckEmailAvailabilityResponseVm,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid email format',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @HttpCode(HttpStatus.OK)
  async checkEmailAvailability(@Body() dto: CheckEmailAvailabilityDto) {
    return this.usersService.checkEmailAvailability(dto.email);
  }

  @Patch(pahts.admin + '/users/:id')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update admin user' })
  @ApiBody({ type: UpdateAdminUserDto })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
    type: UsersResponseVm,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid data or business rule violation',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @HttpCode(HttpStatus.OK)
  updateAdminUser(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() currentUser: CurrentUserDto,
    @Body() dto: UpdateAdminUserDto,
  ) {
    return this.usersService.updateAdminUser(id, currentUser.userId, dto);
  }

  @Patch(pahts.admin + '/users/:id/activate')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Activate admin user' })
  @ApiBody({ type: ActivateDeactivateAdminUserDto })
  @ApiResponse({
    status: 200,
    description: 'User activated successfully',
    type: UsersResponseVm,
  })
  @ApiResponse({
    status: 400,
    description: 'User already active or not verified',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @HttpCode(HttpStatus.OK)
  activateAdminUser(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() currentUser: CurrentUserDto,
    @Body() dto: ActivateDeactivateAdminUserDto,
  ) {
    return this.usersService.activateAdminUser(id, currentUser.userId, dto);
  }

  @Patch(pahts.admin + '/users/:id/deactivate')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Deactivate admin user' })
  @ApiBody({ type: ActivateDeactivateAdminUserDto })
  @ApiResponse({
    status: 200,
    description: 'User deactivated successfully',
    type: UsersResponseVm,
  })
  @ApiResponse({
    status: 400,
    description: 'User already inactive or has second factor enabled',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @HttpCode(HttpStatus.OK)
  deactivateAdminUser(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() currentUser: CurrentUserDto,
    @Body() dto: ActivateDeactivateAdminUserDto,
  ) {
    return this.usersService.deactivateAdminUser(id, currentUser.userId, dto);
  }

  @Post(pahts.admin + '/users/:id/resend-verification-email')
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Resend verification email to an admin user',
  })
  @ApiResponse({
    status: 200,
    description: 'Verification email sent successfully to an admin user',
  })
  @ApiResponse({
    status: 400,
    description: 'User already verified or invalid status of admin user',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @HttpCode(HttpStatus.OK)
  resendVerificationEmail(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() currentUser: CurrentUserDto,
  ) {
    return this.usersService.resendVerificationEmail(id, currentUser.userId);
  }

  @Post(pahts.admin + '/users/hd-wallet-mnemonic')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @Roles(RoleEnum.ADMIN)
  @UseGuards(JwtAuthGuard, TwoFactorGuard, ThrottlerGuard)
  @Throttle({ default: { limit: 1, ttl: 10000 } })
  @ApiOperation({
    summary: 'Obtener mnemonic de HD Wallet (Solo Admin con 2FA)',
    description:
      'Endpoint sensible que retorna la frase semilla (mnemonic) del HD wallet. Requiere autenticación de administrador, validación de contraseña y segundo factor. Limitado a 1 solicitud cada 10 segundos.',
  })
  @ApiResponse({
    status: 200,
    description: 'Mnemonic retornado exitosamente',
    schema: {
      type: 'object',
      properties: {
        mnemonic: {
          type: 'string',
          example: 'word1 word2 word3 ... word12',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Contraseña inválida o código 2FA incorrecto',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado - token inválido o rol insuficiente',
  })
  @ApiResponse({
    status: 429,
    description: 'Demasiadas solicitudes - rate limit excedido',
  })
  async getHdWalletMnemonic(
    @CurrentUser() currentUser: CurrentUserDto,
    @Body() dto: GetHdWalletMnemonicDto,
  ): Promise<{ mnemonic: string }> {
    return await this.usersService.getHdWalletMnemonic(
      currentUser.userId,
      dto.password,
    );
  }
}
