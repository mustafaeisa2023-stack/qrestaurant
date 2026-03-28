// ============================================================
// QRestaurant - Tables Service Unit Tests
// ============================================================

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { TablesService } from '../src/tables/tables.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

const mockPrisma = {
  table: {
    findUnique: jest.fn(),
    findFirst:  jest.fn(),
    findMany:   jest.fn(),
    create:     jest.fn(),
    update:     jest.fn(),
    delete:     jest.fn(),
  },
  tableSession: {
    updateMany: jest.fn(),
    create:     jest.fn(),
  },
  order: {
    count: jest.fn(),
    aggregate: jest.fn(),
  },
};

const mockConfig = {
  get: jest.fn((key: string, def?: any) => {
    const map: Record<string, any> = {
      FRONTEND_URL: 'http://localhost:3000',
      BACKEND_URL:  'http://localhost:4000',
    };
    return map[key] ?? def;
  }),
};

describe('TablesService', () => {
  let service: TablesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TablesService,
        { provide: PrismaService,  useValue: mockPrisma  },
        { provide: ConfigService,  useValue: mockConfig  },
      ],
    }).compile();

    service = module.get<TablesService>(TablesService);
    jest.clearAllMocks();
  });

  // ─── CREATE ─────────────────────────────────────────────

  describe('create', () => {
    it('should create table and return with QR code', async () => {
      mockPrisma.table.findUnique.mockResolvedValue(null); // no conflict
      mockPrisma.table.create.mockResolvedValue({
        id: 'tbl-1', number: 5, label: 'Table 5',
        qrToken: 'mock-token-abc', capacity: 4, floor: 'Main',
        isActive: true, status: 'AVAILABLE',
      });
      mockPrisma.table.update.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'tbl-1', qrCode: data.qrCode, number: 5 }),
      );

      const result = await service.create({ number: 5, label: 'Table 5', capacity: 4 });

      expect(result.qrCode).toBeDefined();
      expect(result.qrCode).toMatch(/^data:image\/png;base64,/);
      expect(mockPrisma.table.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.table.update).toHaveBeenCalledTimes(1);
    });

    it('should throw ConflictException for duplicate table number', async () => {
      mockPrisma.table.findUnique.mockResolvedValue({ id: 'existing', number: 5 });

      await expect(service.create({ number: 5, label: 'Table 5' }))
        .rejects.toThrow(ConflictException);
      expect(mockPrisma.table.create).not.toHaveBeenCalled();
    });
  });

  // ─── FIND ONE ────────────────────────────────────────────

  describe('findOne', () => {
    it('should return table with active orders', async () => {
      const mockTable = {
        id: 'tbl-1', number: 3, label: 'Table 3',
        orders: [], sessions: [], status: 'AVAILABLE',
      };
      mockPrisma.table.findUnique.mockResolvedValue(mockTable);
      const result = await service.findOne('tbl-1');
      expect(result).toMatchObject({ id: 'tbl-1', number: 3 });
    });

    it('should throw NotFoundException for unknown table', async () => {
      mockPrisma.table.findUnique.mockResolvedValue(null);
      await expect(service.findOne('bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── FIND BY QR TOKEN ────────────────────────────────────

  describe('findByQrToken', () => {
    it('should return public table info for valid token', async () => {
      mockPrisma.table.findUnique.mockResolvedValue({
        id: 'tbl-1', number: 3, label: 'Table 3',
        capacity: 4, status: 'AVAILABLE', floor: 'Main', isActive: true,
      });
      const result = await service.findByQrToken('valid-token');
      expect(result.id).toBe('tbl-1');
    });

    it('should throw NotFoundException for invalid or inactive table', async () => {
      mockPrisma.table.findUnique.mockResolvedValue(null);
      await expect(service.findByQrToken('bad-token')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for inactive table', async () => {
      mockPrisma.table.findUnique.mockResolvedValue({ id: 't1', isActive: false });
      await expect(service.findByQrToken('some-token')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── GET OR CREATE SESSION ───────────────────────────────

  describe('getOrCreateSession', () => {
    it('should end existing sessions and create a new one', async () => {
      mockPrisma.tableSession.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.tableSession.create.mockResolvedValue({
        id: 'sess-1', tableId: 'tbl-1', sessionToken: 'tok-abc', isActive: true,
      });
      mockPrisma.table.update.mockResolvedValue({});

      const session = await service.getOrCreateSession('tbl-1');

      expect(mockPrisma.tableSession.updateMany).toHaveBeenCalledWith({
        where: { tableId: 'tbl-1', isActive: true },
        data: { isActive: false, endedAt: expect.any(Date) },
      });
      expect(session.id).toBe('sess-1');
    });
  });

  // ─── DELETE ──────────────────────────────────────────────

  describe('remove', () => {
    it('should hard-delete table with no active orders', async () => {
      mockPrisma.table.findUnique.mockResolvedValue({ id: 'tbl-1', number: 1 });
      mockPrisma.order.count.mockResolvedValue(0);
      mockPrisma.table.delete.mockResolvedValue({ id: 'tbl-1' });

      await service.remove('tbl-1');
      expect(mockPrisma.table.delete).toHaveBeenCalledWith({ where: { id: 'tbl-1' } });
    });

    it('should soft-delete table with active orders', async () => {
      mockPrisma.table.findUnique.mockResolvedValue({ id: 'tbl-1', number: 1 });
      mockPrisma.order.count.mockResolvedValue(2); // has active orders
      mockPrisma.table.update.mockResolvedValue({ id: 'tbl-1', isActive: false });

      await service.remove('tbl-1');
      expect(mockPrisma.table.update).toHaveBeenCalledWith({
        where: { id: 'tbl-1' },
        data: { isActive: false },
      });
      expect(mockPrisma.table.delete).not.toHaveBeenCalled();
    });
  });
});
