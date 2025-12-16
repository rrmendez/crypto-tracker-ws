import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  StreamableFile,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignUpDto } from './dto/sign-up.dto';
import { SignInDto } from './dto/sign-in.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { SignUpResponseVm } from './dto/sign-up-response.vm';
import { ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { SignInResponseVm } from './dto/sign-in-response.vm';
import { EmailRequestDto } from './dto/email-request.dto';
import { EmailVerificationDto } from './dto/email-verification.dto';
import { CountryEnum, CountryNames } from '@/common/enums/country-enum';
import { DocumentVerificationDto } from './dto/document-verification.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUserDto } from '@/common/dto/current-user.dto';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { VerifyTwoFactorCodeDto } from './dto/verify-two-factor-code.dto';
import { Jwt2FAGuard } from './guards/jwt-second-factor-auth.guard';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ChangePasswordDto } from '@/core/auth/dto/change-password.dto';
import { ForgotTokenInfoDto } from '@/core/auth/dto/forgot-token-info.dto';
import { TokenInfoDto } from '@/core/auth/dto/token-info.dto';
import { DisableSecondFactorByTokenDto } from './dto/disable-second-factor-by-token.dto';
import { TemplateRendererService } from '../mail/services/template-renderer.service';
import { OriginAudienceGuard } from './guards/origin-audience.guard';
import { User } from '@/modules/users/entities/user.entity';
import { Request } from 'express';
import { FirebaseAppCheckGuard } from '@/core/firebase/guards/firebase-app-check.guard';

interface SignInRequest extends Request {
  signInUser: User;
  intendedAudience: 'ADMIN' | 'CLIENT';
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly templateRenderer: TemplateRendererService,
  ) {}

  @Post('signup')
  @UseGuards(FirebaseAppCheckGuard)
  @ApiResponse({ type: SignUpResponseVm })
  async signUp(
    @Headers('Accept-Language') lang: string,
    @Body() signUpDto: SignUpDto,
  ) {
    const { email, password } = signUpDto;

    const user = await this.authService.signUp({
      ...signUpDto,
      lang,
    });

    const { accessToken, refreshToken } = await this.authService.signIn(
      email,
      password,
    );

    return new SignUpResponseVm(user, accessToken, refreshToken);
  }

  @HttpCode(HttpStatus.OK)
  @Post('signin')
  @UseGuards(FirebaseAppCheckGuard, OriginAudienceGuard)
  @ApiResponse({ type: SignInResponseVm })
  async signIn(@Body() signInDto: SignInDto, @Req() request: SignInRequest) {
    const { password } = signInDto;
    const user = request.signInUser;

    const { accessToken, refreshToken } = await this.authService.signIn(
      user.email,
      password,
      user,
    );

    return new SignInResponseVm(accessToken, refreshToken);
  }

  @HttpCode(HttpStatus.OK)
  @Post('send-email-verification')
  async sendEmailVerification(@Body() emailRequestDto: EmailRequestDto) {
    const { email } = emailRequestDto;

    return await this.authService.sendEmailVerification(email);
  }

  @HttpCode(HttpStatus.OK)
  @Post('check-email-verification')
  async checkEmailVerification(
    @Body() emailVerificationDto: EmailVerificationDto,
  ) {
    const { email, code } = emailVerificationDto;

    return await this.authService.checkEmailVerification(email, code);
  }

  @HttpCode(HttpStatus.OK)
  @Post('check-document-identity')
  async checkDocumentIdentity(
    @Body() documentVerificationDto: DocumentVerificationDto,
  ) {
    const { document } = documentVerificationDto;

    const res = await this.authService.checkIdentity(document);

    return res;
  }

  @Get('countries')
  getRegisteredCountries() {
    return Object.values(CountryEnum).map((code) => ({
      code,
      name: CountryNames[code],
    }));
  }

  @Post('refresh')
  @ApiResponse({ type: SignInResponseVm })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    const { refreshToken: token } = refreshTokenDto;

    const { accessToken, refreshToken } = await this.authService.refresh(token);

    return new SignInResponseVm(accessToken, refreshToken);
  }

  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
    @Headers('x-app-environment') appEnvironment?: string,
  ) {
    return this.authService.requestPasswordReset(dto, appEnvironment || '');
  }

  @HttpCode(HttpStatus.OK)
  @Post('change-password')
  async changePassword(@Body() dto: ChangePasswordDto) {
    const { accessToken, refreshToken } =
      await this.authService.changePassword(dto);
    return new SignInResponseVm(accessToken, refreshToken);
  }

  @HttpCode(HttpStatus.OK)
  @Post('activate-account')
  async activateAccount(@Body() dto: ChangePasswordDto) {
    const { accessToken, refreshToken } =
      await this.authService.changePassword(dto);
    return new SignInResponseVm(accessToken, refreshToken);
  }

  @HttpCode(HttpStatus.OK)
  @Post('forgot-token-info')
  async forgotTokenInfo(@Body() dto: ForgotTokenInfoDto) {
    return this.authService.getForgotTokenInfo(dto.token);
  }

  @HttpCode(HttpStatus.OK)
  @Post('/get-two-factor-secret')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getTwoFactorSecret(@CurrentUser() user: CurrentUserDto) {
    return this.authService.generateTwoFactorSecret(user.userId);
  }

  @HttpCode(HttpStatus.OK)
  @Post('authenticate-with-two-factor')
  @UseGuards(Jwt2FAGuard)
  authenticateWithTwoFactor(
    @CurrentUser() user: CurrentUserDto,
    @Body() dto: VerifyTwoFactorCodeDto,
  ) {
    const { secondFactorCode } = dto;

    return this.authService.signInWithTwoFactor(user.userId, secondFactorCode);
  }

  @HttpCode(HttpStatus.OK)
  @Post('check-recover-second-factor-token')
  async checkRecoverSecondFactorToken(@Body() dto: TokenInfoDto) {
    return this.authService.getSecondFactorRecoveryTokenInfo(dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('confirm-disable-second-factor')
  async confirmDisableSecondFactor(@Body() dto: DisableSecondFactorByTokenDto) {
    return this.authService.confirmDisableSecondFactor(dto);
  }

  @Get('/preview/email')
  previewEmail() {
    const contentHtml = this.templateRenderer.render('second-factor-recovery', {
      appName: 'Moovpag',
      minutes: 20,
      recoverUrl: 'https://example.com',
      userName: 'Teste',
    });

    const html = this.templateRenderer.render('layout', {
      subject: 'Password Reset',
      year: new Date().getFullYear(),
      content: contentHtml,
      appName: 'Moovpag',
    });

    return new StreamableFile(Buffer.from(html), {
      disposition: 'inline',
      type: 'text/html',
    });
  }
}
