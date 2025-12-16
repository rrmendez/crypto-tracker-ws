/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';

export type SocketWithPayload = Socket & {
  payload?: {
    sub: string;
    username: string;
    roles: string[];
  };
};

export const socketAuthMiddleware = (
  jwtService: JwtService,
  // secret: string,
) => {
  return (client: SocketWithPayload, next: (err?: Error) => void) => {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        throw new UnauthorizedException('No token provided');
      }

      const payload = jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      });

      console.log('Payload: ', payload);

      client.payload = payload;

      next();
    } catch (err) {
      next(new UnauthorizedException(err.message)); // cierra la conexión si hay un error
    }
  };
};
