// ============================================================
// QRestaurant - Orders Service Unit Tests
// ============================================================

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrdersService } from '../src/orders/orders.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { OrdersGateway } from '../src/websocket/orders.gateway';

const mockPrisma = {
  table: { findUnique: jest.fn() },
  menuItem: { findMany: jest.fn() },
  order: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
  },
  orderStatusHistory: { create: jest.fn() },
  $transaction: jest.fn((cb) => cb(mockPrisma)),
};

const mockGateway = {
  emitNewOrder: jest.fn(),
  emitOrderStatusUpdate: jest.fn(),
};

describe('OrdersService', () => {
  let service: OrdersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: OrdersGateway, useValue: mockGateway },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    const mockTable = { id: 'table-1', number: 1, isActive: true };
    const mockMenuItem = {
      id: 'item-1', name: 'Bruschetta', price: 9.95, discountPrice: null, isAvailable: true,
    };
    const createOrderDto = {
      tableId: 'table-1',
      items: [{ menuItemId: 'item-1', quantity: 2 }],
    };

    it('should create order and emit WebSocket event', async () => {
      mockPrisma.table.findUnique.mockResolvedValue(mockTable);
      mockPrisma.menuItem.findMany.mockResolvedValue([mockMenuItem]);
      mockPrisma.order.findFirst.mockResolvedValue(null);
      mockPrisma.order.create.mockResolvedValue({
        id: 'order-1',
        orderNumber: 'ORD-20240101-0001',
        tableId: 'table-1',
        status: 'PENDING',
        subtotal: 19.90,
        tax: 1.99,
        total: 21.89,
        items: [],
        table: { number: 1, label: 'Table 1', floor: 'Main' },
      });
      mockPrisma.orderStatusHistory.create.mockResolvedValue({});

      const result = await service.create(createOrderDto);

      expect(result.orderNumber).toMatch(/^ORD-/);
      expect(mockGateway.emitNewOrder).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException for invalid table', async () => {
      mockPrisma.table.findUnique.mockResolvedValue(null);
      await expect(service.create(createOrderDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for unavailable menu item', async () => {
      mockPrisma.table.findUnique.mockResolvedValue(mockTable);
      mockPrisma.menuItem.findMany.mockResolvedValue([]); // item not found/available
      await expect(service.create(createOrderDto)).rejects.toThrow(BadRequestException);
    });

    it('should calculate server-side totals (not trust client)', async () => {
      mockPrisma.table.findUnique.mockResolvedValue(mockTable);
      mockPrisma.menuItem.findMany.mockResolvedValue([mockMenuItem]);
      mockPrisma.order.findFirst.mockResolvedValue(null);
      mockPrisma.orderStatusHistory.create.mockResolvedValue({});

      let capturedData: any;
      mockPrisma.order.create.mockImplementation(({ data }) => {
        capturedData = data;
        return Promise.resolve({ ...data, id: 'o1', items: [], table: {} });
      });

      await service.create(createOrderDto);

      // price = 9.95 * 2 = 19.90; tax = 1.99; total = 21.89
      expect(Number(capturedData.subtotal)).toBeCloseTo(19.90);
      expect(Number(capturedData.tax)).toBeCloseTo(1.99);
      expect(Number(capturedData.total)).toBeCloseTo(21.89);
    });
  });

  describe('updateStatus', () => {
    const mockOrder = {
      id: 'order-1',
      orderNumber: 'ORD-20240101-0001',
      tableId: 'table-1',
      status: 'PENDING',
      items: [],
      table: {},
      session: null,
      statusHistory: [],
    };

    it('should transition PENDING → CONFIRMED', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.order.update.mockResolvedValue({ ...mockOrder, status: 'CONFIRMED' });
      mockPrisma.orderStatusHistory.create.mockResolvedValue({});

      const result = await service.updateStatus('order-1', { status: 'CONFIRMED' as any });
      expect(result.status).toBe('CONFIRMED');
      expect(mockGateway.emitOrderStatusUpdate).toHaveBeenCalled();
    });

    it('should reject invalid status transition PENDING → READY', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      await expect(service.updateStatus('order-1', { status: 'READY' as any })).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for unknown order', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);
      await expect(service.updateStatus('bad-id', { status: 'CONFIRMED' as any })).rejects.toThrow(NotFoundException);
    });
  });
});
