// ============================================================
// QRestaurant - Users Service
// ============================================================

import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateUserDto {
  name: string;
  email: string;
  password: string;
  role?: Role;
}

export interface UpdateUserDto {
  name?: string;
  email?: string;
  password?: string;
  role?: Role;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true, email: true, name: true, role: true,
        isActive: true, lastLoginAt: true, createdAt: true,
      },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true, email: true, name: true, role: true,
        isActive: true, lastLoginAt: true, createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });
    if (existing) throw new ConflictException('Email already in use');

    const hashed = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: {
        name: dto.name.trim(),
        email: dto.email.toLowerCase().trim(),
        password: hashed,
        role: dto.role || Role.STAFF,
      },
      select: {
        id: true, email: true, name: true, role: true,
        isActive: true, createdAt: true,
      },
    });
  }

  async update(id: string, dto: UpdateUserDto, requestingUserId: string) {
    const user = await this.findOne(id);

    // Prevent modifying super admin unless you are super admin
    if (user.role === 'SUPER_ADMIN' && requestingUserId !== id) {
      throw new ForbiddenException('Cannot modify super admin');
    }

    const data: any = {};
    if (dto.name)  data.name  = dto.name.trim();
    if (dto.email) {
      const conflict = await this.prisma.user.findFirst({
        where: { email: dto.email.toLowerCase(), NOT: { id } },
      });
      if (conflict) throw new ConflictException('Email already in use');
      data.email = dto.email.toLowerCase().trim();
    }
    if (dto.password) data.password = await bcrypt.hash(dto.password, 10);
    if (dto.role && user.role !== 'SUPER_ADMIN') data.role = dto.role;

    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true, email: true, name: true, role: true,
        isActive: true, createdAt: true,
      },
    });
  }

  async toggleActive(id: string) {
    const user = await this.findOne(id);
    if (user.role === 'SUPER_ADMIN') {
      throw new ForbiddenException('Cannot deactivate super admin');
    }
    return this.prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
      select: {
        id: true, email: true, name: true, role: true,
        isActive: true, createdAt: true,
      },
    });
  }

  async remove(id: string) {
    const user = await this.findOne(id);
    if (user.role === 'SUPER_ADMIN') {
      throw new ForbiddenException('Cannot delete super admin');
    }
    return this.prisma.user.delete({ where: { id } });
  }
}
