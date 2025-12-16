import { NotificationPayloadVm } from '@/common/vm/notification-payload.vm';
import {
  socketAuthMiddleware,
  SocketWithPayload,
} from '@/core/auth/middlewares/socket-auth.middleware';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway()
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(private readonly jwtService: JwtService) {}

  afterInit() {
    console.log('WS server ready');
    this.server.use(socketAuthMiddleware(this.jwtService));
  }

  async handleConnection(client: SocketWithPayload) {
    const userId = client.payload?.sub;
    if (!userId) return;
    console.log(`Client ${client.id} connected for user ${userId}`);
    await client.join(`user/${userId}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client ${client.id} disconnected`);
  }

  handleSendNotification(userId: string, payload: NotificationPayloadVm) {
    this.server.to(`user/${userId}`).emit('notification', payload);
  }
}
