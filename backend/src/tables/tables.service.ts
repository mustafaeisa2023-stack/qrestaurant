import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import * as QRCode from 'qrcode';
import { ConfigService } from '@nestjs/config';
import { TableStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';

@Injectable()
export class TablesService {
  private readonly logger = new Logger(TablesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  // async create(dto: CreateTableDto) {
  //   const existing = await this.prisma.table.findUnique({
  //     where: { number: dto.number },
  //   });
  //   if (existing) {
  //     throw new ConflictException(`Table number ${dto.number} already exists`);
  //   }
  async create(dto: CreateTableDto) {
  const existing = await this.prisma.table.findUnique({
    where: { number: dto.number },
  });

  if (existing) {
    // إذا كانت محذوفة (غير نشطة) — أعد تفعيلها بدل رمي خطأ
    if (!existing.isActive) {
      const qrCode = await this.generateQRCode(existing.qrToken);
      return this.prisma.table.update({
        where: { id: existing.id },
        data: {
          ...dto,
          isActive: true,
          status: 'AVAILABLE',
          qrCode,
        },
      });
    }
    throw new ConflictException(`Table number ${dto.number} already exists`);
  }
    const table = await this.prisma.table.create({ data: dto });
    const qrCode = await this.generateQRCode(table.qrToken);
    return this.prisma.table.update({
      where: { id: table.id },
      data: { qrCode },
    });
  }

  async findAll(includeInactive = false) {
    return this.prisma.table.findMany({
      where: includeInactive ? {} : { isActive: true },
      include: {
        _count: { select: { orders: true } },
        orders: {
          where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
          select: { id: true, status: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { number: 'asc' },
    });
  }

  async findOne(id: string) {
    const table = await this.prisma.table.findUnique({
      where: { id },
      include: {
        orders: {
          where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
          include: { items: true },
          orderBy: { createdAt: 'desc' },
        },
        sessions: {
          where: { isActive: true },
          take: 1,
        },
      },
    });
    if (!table) throw new NotFoundException(`Table ${id} not found`);
    return table;
  }

  async findByQrToken(qrToken: string) {
    const table = await this.prisma.table.findUnique({
      where: { qrToken },
      select: {
        id: true,
        number: true,
        label: true,
        capacity: true,
        status: true,
        floor: true,
        isActive: true,
      },
    });

    if (!table || !table.isActive) {
      throw new NotFoundException('Table not found or inactive');
    }

    return table;
  }

  async update(id: string, dto: UpdateTableDto) {
    await this.findOne(id);
    if (dto.number) {
      const conflict = await this.prisma.table.findFirst({
        where: { number: dto.number, NOT: { id } },
      });
      if (conflict) {
        throw new ConflictException(`Table number ${dto.number} already exists`);
      }
    }
    return this.prisma.table.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    const activeOrders = await this.prisma.order.count({
      where: {
        tableId: id,
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      },
    });
    if (activeOrders > 0) {
      return this.prisma.table.update({
        where: { id },
        data: { isActive: false },
      });
    }
    await this.prisma.tableSession.deleteMany({
      where: { tableId: id },
    });
    return this.prisma.table.delete({ where: { id } });
  }

  async regenerateQR(id: string) {
    const table = await this.findOne(id);
    const qrCode = await this.generateQRCode(table.qrToken);
    return this.prisma.table.update({
      where: { id },
      data: { qrCode },
    });
  }

  async updateStatus(id: string, status: TableStatus) {
    await this.findOne(id);
    return this.prisma.table.update({
      where: { id },
      data: { status },
    });
  }

  async getOrCreateSession(tableId: string, existingSessionId?: string) {
    const table = await this.prisma.table.findUnique({
      where: { id: tableId },
      select: { status: true },
    });

    if (table?.status === TableStatus.OCCUPIED) {
      // إذا أرسل الزبون sessionId — تحقق إنه نفس الـ session النشط
      if (existingSessionId) {
        const session = await this.prisma.tableSession.findFirst({
          where: { tableId, isActive: true, id: existingSessionId },
        });
        if (session) return session; // نفس الزبون عامل refresh
      }
      // زبون مختلف — ارفض
      throw new ForbiddenException('Table is currently occupied');
    }

    await this.prisma.tableSession.updateMany({
      where: { tableId, isActive: true },
      data: { isActive: false, endedAt: new Date() },
    });

    const session = await this.prisma.tableSession.create({
      data: { tableId },
    });

    await this.prisma.table.update({
      where: { id: tableId },
      data: { status: TableStatus.OCCUPIED },
    });

    return session;
  }



  async generateQRCode(qrToken: string): Promise<string> {
    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const url = `${frontendUrl}/menu/${qrToken}`;
    const qrDataUrl = await QRCode.toDataURL(url, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 400,
      margin: 2,
      color: { dark: '#1a1a1a', light: '#ffffff' },
    });
    this.logger.log(`QR code generated for token: ${qrToken}`);
    return qrDataUrl;
  }

  async getTableStats(tableId: string) {
    const [totalOrders, revenue, avgOrderValue] = await Promise.all([
      this.prisma.order.count({ where: { tableId, status: 'COMPLETED' } }),
      this.prisma.order.aggregate({
        where: { tableId, status: 'COMPLETED' },
        _sum: { total: true },
      }),
      this.prisma.order.aggregate({
        where: { tableId, status: 'COMPLETED' },
        _avg: { total: true },
      }),
    ]);
    return {
      totalOrders,
      totalRevenue: revenue._sum.total || 0,
      avgOrderValue: avgOrderValue._avg.total || 0,
    };
  }
}