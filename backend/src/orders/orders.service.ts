// ============================================================
// QRestaurant - Orders Service
// Full order lifecycle with real-time notifications
// ============================================================

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersGateway } from '../websocket/orders.gateway';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

// Valid status transitions
const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  CONFIRMED: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  PREPARING: [OrderStatus.READY, OrderStatus.CANCELLED],
  READY: [OrderStatus.SERVED],
  SERVED: [OrderStatus.COMPLETED],
  COMPLETED: [],
  CANCELLED: [],
};

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersGateway: OrdersGateway,
  ) {}

  // ─── CREATE ORDER (customer-facing) ───────────────────────
  async create(dto: CreateOrderDto) {
    // Validate table exists
    const table = await this.prisma.table.findUnique({
      where: { id: dto.tableId, isActive: true },
    });
    if (!table) throw new NotFoundException('Table not found');
    if (table.status === 'MAINTENANCE') {
    throw new BadRequestException('This table is currently unavailable');
    }

    // Validate all menu items exist and are available
    const menuItemIds = dto.items.map((i) => i.menuItemId);
    const menuItems = await this.prisma.menuItem.findMany({
      where: { id: { in: menuItemIds }, isAvailable: true },
    });

    if (menuItems.length !== menuItemIds.length) {
      const foundIds = menuItems.map((m) => m.id);
      const missing = menuItemIds.filter((id) => !foundIds.includes(id));
      throw new BadRequestException(
        `Some items are unavailable or not found: ${missing.join(', ')}`,
      );
    }

    // Build price map for accuracy (never trust client prices)
    const priceMap = new Map(menuItems.map((m) => [m.id, m]));

    // Calculate order totals server-side
    let subtotal = 0;
    const orderItems = dto.items.map((item) => {
      const menuItem = priceMap.get(item.menuItemId)!;
      const effectivePrice = Number(
        menuItem.discountPrice ?? menuItem.price,
      );
      const itemSubtotal = effectivePrice * item.quantity;
      subtotal += itemSubtotal;

      return {
        menuItemId: item.menuItemId,
        name: menuItem.name,
        price: effectivePrice,
        quantity: item.quantity,
        subtotal: itemSubtotal,
        note: item.note,
      };
    });

    const taxRate = 0.1; // 10% tax
    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    // Generate unique order number
    const orderNumber = await this.generateOrderNumber();

    // Create order in transaction
    const order = await this.prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          tableId: dto.tableId,
          sessionId: dto.sessionId,
          status: OrderStatus.PENDING,
          subtotal,
          tax,
          total,
          customerNote: dto.customerNote,
          items: { create: orderItems },
        },
        include: {
          items: { include: { menuItem: { select: { name: true, imageUrl: true } } } },
          table: { select: { number: true, label: true, floor: true } },
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: newOrder.id,
          status: OrderStatus.PENDING,
          note: 'Order placed by customer',
          changedBy: 'customer',
        },
      });

      return newOrder;
    });

    // Emit real-time event to admin
    this.ordersGateway.emitNewOrder(order);
    this.logger.log(`New order created: ${order.orderNumber} for table ${table.number}`);

    return order;
  }

  // ─── FIND ALL ORDERS ──────────────────────────────────────
  async findAll(filters?: {
    tableId?: string;
    status?: OrderStatus;
    from?: Date;
    to?: Date;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters?.tableId) where.tableId = filters.tableId;
    if (filters?.status) where.status = filters.status;
    if (filters?.from || filters?.to) {
      where.createdAt = {};
      if (filters.from) where.createdAt.gte = filters.from;
      if (filters.to) where.createdAt.lte = filters.to;
    }
    if (filters?.search) {
      where.OR = [
        { orderNumber: { contains: filters.search, mode: 'insensitive' } },
        { table: { label: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          table: { select: { number: true, label: true, floor: true } },
          items: {
            include: {
              menuItem: { select: { name: true, imageUrl: true } },
            },
          },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: orders,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ─── FIND ONE ORDER ───────────────────────────────────────
  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        table: { select: { number: true, label: true, floor: true } },
        items: {
          include: {
            menuItem: { select: { name: true, imageUrl: true, price: true } },
          },
        },
        statusHistory: { orderBy: { createdAt: 'asc' } },
        session: true,
      },
    });

    if (!order) throw new NotFoundException(`Order ${id} not found`);
    return order;
  }

  // ─── FIND ORDER BY NUMBER ─────────────────────────────────
  async findByNumber(orderNumber: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
      include: {
        table: { select: { number: true, label: true } },
        items: { include: { menuItem: { select: { name: true, imageUrl: true } } } },
        statusHistory: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!order) throw new NotFoundException(`Order ${orderNumber} not found`);
    return order;
  }

  // ─── UPDATE ORDER STATUS ──────────────────────────────────
  async updateStatus(id: string, dto: UpdateOrderStatusDto, userId?: string) {
    const order = await this.findOne(id);

    const allowedTransitions = STATUS_TRANSITIONS[order.status];
    if (!allowedTransitions.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition from ${order.status} to ${dto.status}. ` +
          `Allowed: ${allowedTransitions.join(', ')}`,
      );
    }

    // Build timestamp updates
    const timestampUpdates: Record<string, Date> = {};
    const now = new Date();
    if (dto.status === OrderStatus.CONFIRMED) timestampUpdates.confirmedAt = now;
    if (dto.status === OrderStatus.PREPARING) timestampUpdates.preparingAt = now;
    if (dto.status === OrderStatus.READY) timestampUpdates.readyAt = now;
    if (dto.status === OrderStatus.SERVED) timestampUpdates.servedAt = now;
    if (dto.status === OrderStatus.COMPLETED) timestampUpdates.completedAt = now;
    if (dto.status === OrderStatus.CANCELLED) {
      timestampUpdates.cancelledAt = now;
    }

    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id },
        data: {
          status: dto.status,
          staffNote: dto.staffNote,
          estimatedTime: dto.estimatedTime,
          cancelReason: dto.cancelReason,
          ...timestampUpdates,
        },
        include: {
          table: { select: { number: true, label: true, floor: true } },
          items: { include: { menuItem: { select: { name: true } } } },
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: id,
          status: dto.status,
          note: dto.staffNote || dto.cancelReason,
          changedBy: userId || 'system',
        },
      });

      return updated;
    });

    // Emit real-time event
    this.ordersGateway.emitOrderStatusUpdate(updatedOrder);
    this.logger.log(
      `Order ${updatedOrder.orderNumber} status: ${order.status} → ${dto.status}`,
    );

    return updatedOrder;
  }

  // ─── GET ACTIVE ORDERS (kitchen view) ─────────────────────
  async getActiveOrders() {
    return this.prisma.order.findMany({
      where: {
        status: {
          in: [
            OrderStatus.PENDING,
            OrderStatus.CONFIRMED,
            OrderStatus.PREPARING,
            OrderStatus.READY,
          ],
        },
      },
      include: {
        table: { select: { number: true, label: true, floor: true } },
        items: {
          include: { menuItem: { select: { name: true, imageUrl: true } } },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ─── ORDER NUMBER GENERATOR ───────────────────────────────
  private async generateOrderNumber(): Promise<string> {
    const today = new Date();
    const prefix = `ORD-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

    const lastOrder = await this.prisma.order.findFirst({
      where: { orderNumber: { startsWith: prefix } },
      orderBy: { createdAt: 'desc' },
    });

    let seq = 1;
    if (lastOrder) {
      const lastSeq = parseInt(lastOrder.orderNumber.split('-').pop() || '0', 10);
      seq = lastSeq + 1;
    }

    return `${prefix}-${String(seq).padStart(4, '0')}`;
  }
}
