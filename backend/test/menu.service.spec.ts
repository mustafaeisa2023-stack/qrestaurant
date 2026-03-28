// ============================================================
// QRestaurant - Menu Service Unit Tests
// ============================================================

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { MenuService } from '../src/menu/menu.service';
import { PrismaService } from '../src/prisma/prisma.service';

const mockPrisma = {
  category: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  menuItem: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
};

describe('MenuService', () => {
  let service: MenuService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MenuService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<MenuService>(MenuService);
    jest.clearAllMocks();
  });

  // ─── CATEGORIES ─────────────────────────────────────────

  describe('createCategory', () => {
    it('should create and return a category', async () => {
      const dto = { name: 'Starters', sortOrder: 1 };
      mockPrisma.category.create.mockResolvedValue({ id: 'cat-1', ...dto, isActive: true });

      const result = await service.createCategory(dto as any);
      expect(result.name).toBe('Starters');
      expect(mockPrisma.category.create).toHaveBeenCalledWith({ data: dto });
    });
  });

  describe('findOneCategory', () => {
    it('should return category with items', async () => {
      mockPrisma.category.findUnique.mockResolvedValue({
        id: 'cat-1', name: 'Starters', items: [], _count: { items: 0 },
      });
      const result = await service.findOneCategory('cat-1');
      expect(result.id).toBe('cat-1');
    });

    it('should throw NotFoundException for unknown category', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null);
      await expect(service.findOneCategory('bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeCategory', () => {
    it('should hard-delete category with no items', async () => {
      mockPrisma.category.findUnique.mockResolvedValue({ id: 'cat-1', name: 'Empty' });
      mockPrisma.menuItem.count.mockResolvedValue(0);
      mockPrisma.category.delete.mockResolvedValue({ id: 'cat-1' });

      await service.removeCategory('cat-1');
      expect(mockPrisma.category.delete).toHaveBeenCalledWith({ where: { id: 'cat-1' } });
    });

    it('should soft-delete category that has items', async () => {
      mockPrisma.category.findUnique.mockResolvedValue({ id: 'cat-1', name: 'Mains' });
      mockPrisma.menuItem.count.mockResolvedValue(5);
      mockPrisma.category.update.mockResolvedValue({ id: 'cat-1', isActive: false });

      await service.removeCategory('cat-1');
      expect(mockPrisma.category.update).toHaveBeenCalledWith({
        where: { id: 'cat-1' },
        data: { isActive: false },
      });
      expect(mockPrisma.category.delete).not.toHaveBeenCalled();
    });
  });

  // ─── MENU ITEMS ─────────────────────────────────────────

  describe('toggleAvailability', () => {
    it('should flip isAvailable from true to false', async () => {
      mockPrisma.menuItem.findUnique.mockResolvedValue({
        id: 'item-1', name: 'Bruschetta', isAvailable: true, category: {},
      });
      mockPrisma.menuItem.update.mockResolvedValue({ id: 'item-1', isAvailable: false });

      const result = await service.toggleAvailability('item-1');
      expect(result.isAvailable).toBe(false);
      expect(mockPrisma.menuItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: { isAvailable: false },
      });
    });

    it('should flip isAvailable from false to true', async () => {
      mockPrisma.menuItem.findUnique.mockResolvedValue({
        id: 'item-2', name: 'Tiramisu', isAvailable: false, category: {},
      });
      mockPrisma.menuItem.update.mockResolvedValue({ id: 'item-2', isAvailable: true });

      const result = await service.toggleAvailability('item-2');
      expect(result.isAvailable).toBe(true);
    });
  });

  describe('createItem', () => {
    it('should validate category exists before creating item', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null); // category not found

      await expect(
        service.createItem({ categoryId: 'bad-cat', name: 'Test', price: 9.95 } as any),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrisma.menuItem.create).not.toHaveBeenCalled();
    });

    it('should create item when category exists', async () => {
      mockPrisma.category.findUnique.mockResolvedValue({ id: 'cat-1', name: 'Starters' });
      mockPrisma.menuItem.create.mockResolvedValue({
        id: 'item-1', name: 'Calamari', price: 14.95, categoryId: 'cat-1',
      });

      const result = await service.createItem({
        categoryId: 'cat-1', name: 'Calamari', price: 14.95,
      } as any);

      expect(result.name).toBe('Calamari');
    });
  });
});
