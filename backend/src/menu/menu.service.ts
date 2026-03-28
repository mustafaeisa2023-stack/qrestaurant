// ============================================================
// QRestaurant - Menu Service
// ============================================================

import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';

@Injectable()
export class MenuService {
  constructor(private readonly prisma: PrismaService) {}

  // ══════════════════════════════════════════════════════════
  // CATEGORIES
  // ══════════════════════════════════════════════════════════

  async createCategory(dto: CreateCategoryDto) {
    return this.prisma.category.create({ data: dto });
  }

  async findAllCategories(activeOnly = true) {
    return this.prisma.category.findMany({
      where: activeOnly ? { isActive: true } : {},
      include: {
        items: {
          where: activeOnly ? { isAvailable: true } : {},
          orderBy: { sortOrder: 'asc' },
        },
        _count: { select: { items: true } },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findOneCategory(id: string) {
    const cat = await this.prisma.category.findUnique({
      where: { id },
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
        _count: { select: { items: true } },
      },
    });
    if (!cat) throw new NotFoundException(`Category ${id} not found`);
    return cat;
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    await this.findOneCategory(id);
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async removeCategory(id: string) {
    await this.findOneCategory(id);
    const itemCount = await this.prisma.menuItem.count({
      where: { categoryId: id },
    });
    if (itemCount > 0) {
      // Soft delete
      return this.prisma.category.update({
        where: { id },
        data: { isActive: false },
      });
    }
    return this.prisma.category.delete({ where: { id } });
  }

  async reorderCategories(ids: string[]) {
    const updates = ids.map((id, index) =>
      this.prisma.category.update({
        where: { id },
        data: { sortOrder: index },
      }),
    );
    return this.prisma.$transaction(updates);
  }

  // ══════════════════════════════════════════════════════════
  // MENU ITEMS
  // ══════════════════════════════════════════════════════════

  async createItem(dto: CreateMenuItemDto) {
    await this.findOneCategory(dto.categoryId);
    return this.prisma.menuItem.create({ data: dto });
  }

  async findAllItems(filters?: {
    categoryId?: string;
    isAvailable?: boolean;
    isFeatured?: boolean;
    search?: string;
    tags?: string[];
  }) {
    const where: any = {};

    if (filters?.categoryId) where.categoryId = filters.categoryId;
    if (filters?.isAvailable !== undefined)
      where.isAvailable = filters.isAvailable;
    if (filters?.isFeatured !== undefined)
      where.isFeatured = filters.isFeatured;
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    if (filters?.tags?.length) {
      where.tags = { hasSome: filters.tags };
    }

    return this.prisma.menuItem.findMany({
      where,
      include: { category: { select: { id: true, name: true } } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findOneItem(id: string) {
    const item = await this.prisma.menuItem.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!item) throw new NotFoundException(`Menu item ${id} not found`);
    return item;
  }

  async updateItem(id: string, dto: UpdateMenuItemDto) {
    await this.findOneItem(id);
    if (dto.categoryId) await this.findOneCategory(dto.categoryId);
    return this.prisma.menuItem.update({ where: { id }, data: dto });
  }

  async removeItem(id: string) {
    await this.findOneItem(id);
    return this.prisma.menuItem.delete({ where: { id } });
  }

  async toggleAvailability(id: string) {
    const item = await this.findOneItem(id);
    return this.prisma.menuItem.update({
      where: { id },
      data: { isAvailable: !item.isAvailable },
    });
  }

  async updateItemImage(id: string, imageUrl: string) {
    await this.findOneItem(id);
    return this.prisma.menuItem.update({
      where: { id },
      data: { imageUrl },
    });
  }

  async getFeaturedItems() {
    return this.prisma.menuItem.findMany({
      where: { isFeatured: true, isAvailable: true },
      include: { category: { select: { id: true, name: true } } },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getFullMenu() {
    return this.prisma.category.findMany({
      where: { isActive: true },
      include: {
        items: {
          where: { isAvailable: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }
}
