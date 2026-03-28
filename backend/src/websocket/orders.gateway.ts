// ============================================================
// QRestaurant - Orders WebSocket Gateway
// Real-time bidirectional communication
// ============================================================

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/orders',
  transports: ['websocket', 'polling'],
})
export class OrdersGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private server: Server;

  private readonly logger = new Logger(OrdersGateway.name);
  private adminSockets = new Set<string>(); // admin socket IDs
  private tableSubscriptions = new Map<string, Set<string>>(); // tableId → socket IDs

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('✅ WebSocket gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (token) {
        const payload = this.jwtService.verify(token, {
          secret: this.config.get('JWT_SECRET'),
        });
        client.data.user = payload;
        client.data.isAdmin = true;
        this.adminSockets.add(client.id);
        client.join('admin-room');
        this.logger.log(`Admin connected: ${payload.email} (${client.id})`);
      } else {
        client.data.isAdmin = false;
        this.logger.log(`Customer connected: ${client.id}`);
      }

      client.emit('connected', {
        socketId: client.id,
        isAdmin: client.data.isAdmin,
        timestamp: new Date(),
      });
    } catch (error) {
      client.data.isAdmin = false;
      this.logger.warn(`Connection without valid token: ${client.id}`);
    }
  }

  handleDisconnect(client: Socket) {
    this.adminSockets.delete(client.id);

    // Clean up table subscriptions
    this.tableSubscriptions.forEach((sockets, tableId) => {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.tableSubscriptions.delete(tableId);
      }
    });

    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // ─── CUSTOMER: Subscribe to table updates ─────────────────
  @SubscribeMessage('subscribe:table')
  handleSubscribeTable(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tableId: string },
  ) {
    const { tableId } = data;
    client.join(`table:${tableId}`);

    if (!this.tableSubscriptions.has(tableId)) {
      this.tableSubscriptions.set(tableId, new Set());
    }
    this.tableSubscriptions.get(tableId)!.add(client.id);

    this.logger.log(`Client ${client.id} subscribed to table ${tableId}`);
    return { success: true, tableId };
  }

  // ─── CUSTOMER: Subscribe to order updates ─────────────────
  @SubscribeMessage('subscribe:order')
  handleSubscribeOrder(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string },
  ) {
    const { orderId } = data;
    client.join(`order:${orderId}`);
    this.logger.log(`Client ${client.id} subscribed to order ${orderId}`);
    return { success: true, orderId };
  }

  // ─── ADMIN: Request current active orders ─────────────────
  @SubscribeMessage('admin:get-active-orders')
  handleGetActiveOrders(@ConnectedSocket() client: Socket) {
    if (!client.data.isAdmin) {
      return { error: 'Unauthorized' };
    }
    // The frontend will re-fetch via HTTP, this just acknowledges
    return { success: true, message: 'Fetching active orders' };
  }

  // ─── EMIT: New order to admins ────────────────────────────
  emitNewOrder(order: any) {
    this.server.to('admin-room').emit('order:new', {
      type: 'ORDER_NEW',
      order,
      timestamp: new Date(),
    });

    // Also notify the table
    this.server.to(`table:${order.tableId}`).emit('order:confirmed', {
      type: 'ORDER_CONFIRMED',
      orderId: order.id,
      orderNumber: order.orderNumber,
      timestamp: new Date(),
    });
  }

  // ─── EMIT: Order status update ────────────────────────────
  emitOrderStatusUpdate(order: any) {
    // Notify admins
    this.server.to('admin-room').emit('order:status-updated', {
      type: 'ORDER_STATUS_UPDATED',
      order,
      timestamp: new Date(),
    });

    // Notify specific order subscribers (customers tracking their order)
    this.server.to(`order:${order.id}`).emit('order:status-changed', {
      type: 'ORDER_STATUS_CHANGED',
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      estimatedTime: order.estimatedTime,
      timestamp: new Date(),
    });

    // Notify table subscribers
    this.server.to(`table:${order.tableId}`).emit('table:order-updated', {
      type: 'TABLE_ORDER_UPDATED',
      orderId: order.id,
      status: order.status,
      timestamp: new Date(),
    });
  }

  // ─── EMIT: General notification ───────────────────────────
  emitNotification(notification: {
    type: string;
    title: string;
    message: string;
    data?: any;
  }) {
    this.server.to('admin-room').emit('notification', {
      ...notification,
      timestamp: new Date(),
    });
  }

  // ─── GETTERS ──────────────────────────────────────────────
  get connectedAdmins(): number {
    return this.adminSockets.size;
  }
}
