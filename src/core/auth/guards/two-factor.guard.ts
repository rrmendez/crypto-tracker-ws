/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class TwoFactorGuard implements CanActivate {
  constructor(private authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const user = request.user; // viene del JWT guard
    const token =
      request.headers['x-2fa-token'] || request.body.secondFactorCode;

    if (!user) {
      throw new BadRequestException('No user in request');
    }

    if (!token) {
      throw new BadRequestException('Missing 2FA token');
    }

    const isValid = await this.authService.verifyTwoFactorCode(
      user.userId,
      token,
    );
    if (!isValid) {
      throw new BadRequestException('Invalid 2FA token');
    }

    return true;
  }
}
