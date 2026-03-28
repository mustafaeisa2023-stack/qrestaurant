// ============================================================
// QRestaurant - Analytics Service
// ============================================================

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── DASHBOARD SUMMARY ────────────────────────────────────
  async getDashboardSummary() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [
      totalOrdersToday,
      revenueToday,
      activeOrders,
      totalTablesOccupied,
      pendingOrders,
      avgOrderValueToday,
      totalItemsSoldToday,
    ] = await Promise.all([
      this.prisma.order.count({
        where: { createdAt: { gte: today, lte: todayEnd } },
      }),
      this.prisma.order.aggregate({
        where: {
          status: 'COMPLETED',
          completedAt: { gte: today, lte: todayEnd },
        },
        _sum: { total: true },
      }),
      this.prisma.order.count({
        where: {
          status: { in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'] },
        },
      }),
      this.prisma.table.count({ where: { status: 'OCCUPIED' } }),
      this.prisma.order.count({ where: { status: 'PENDING' } }),
      this.prisma.order.aggregate({
        where: {
          status: 'COMPLETED',
          completedAt: { gte: today, lte: todayEnd },
        },
        _avg: { total: true },
      }),
      this.prisma.orderItem.aggregate({
        where: {
          order: {
            status: 'COMPLETED',
            completedAt: { gte: today, lte: todayEnd },
          },
        },
        _sum: { quantity: true },
      }),
    ]);

    return {
      today: {
        totalOrders: totalOrdersToday,
        revenue: revenueToday._sum.total || 0,
        avgOrderValue: avgOrderValueToday._avg.total || 0,
        itemsSold: totalItemsSoldToday._sum.quantity || 0,
      },
      live: {
        activeOrders,
        tablesOccupied: totalTablesOccupied,
        pendingOrders,
      },
    };
  }

  // ─── REVENUE OVER TIME ────────────────────────────────────
  async getRevenueOverTime(days = 7) {
    const from = new Date();
    from.setDate(from.getDate() - days);
    from.setHours(0, 0, 0, 0);

    const orders = await this.prisma.order.findMany({
      where: {
        status: 'COMPLETED',
        completedAt: { gte: from },
      },
      select: { total: true, completedAt: true },
    });

    // Group by date
    const revenueByDate = new Map<string, number>();
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      revenueByDate.set(d.toISOString().split('T')[0], 0);
    }

    orders.forEach((order) => {
      if (order.completedAt) {
        const date = order.completedAt.toISOString().split('T')[0];
        revenueByDate.set(
          date,
          (revenueByDate.get(date) || 0) + Number(order.total),
        );
      }
    });

    return Array.from(revenueByDate.entries())
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  // ─── TOP MENU ITEMS ───────────────────────────────────────
  async getTopMenuItems(limit = 10) {
    const result = await this.prisma.orderItem.groupBy({
      by: ['menuItemId', 'name'],
      _sum: { quantity: true, subtotal: true },
      _count: { id: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: limit,
    });

    return result.map((item) => ({
      menuItemId: item.menuItemId,
      name: item.name,
      totalQuantity: item._sum.quantity || 0,
      totalRevenue: item._sum.subtotal || 0,
      orderCount: item._count.id,
    }));
  }

  // ─── TABLE ANALYTICS ──────────────────────────────────────
  async getTableAnalytics() {
    const tables = await this.prisma.table.findMany({
      where: { isActive: true },
      select: {
        id: true,
        number: true,
        label: true,
        floor: true,
        status: true,
        capacity: true,
      },
      orderBy: { number: 'asc' },
    });

    const analytics = await Promise.all(
      tables.map(async (table) => {
        const [totalOrders, revenue, avgValue] = await Promise.all([
          this.prisma.order.count({
            where: { tableId: table.id, status: 'COMPLETED' },
          }),
          this.prisma.order.aggregate({
            where: { tableId: table.id, status: 'COMPLETED' },
            _sum: { total: true },
          }),
          this.prisma.order.aggregate({
            where: { tableId: table.id, status: 'COMPLETED' },
            _avg: { total: true },
          }),
        ]);

        return {
          ...table,
          totalOrders,
          totalRevenue: Number(revenue._sum.total || 0),
          avgOrderValue: Number(avgValue._avg.total || 0),
        };
      }),
    );

    return analytics;
  }

  // ─── ORDER STATUS BREAKDOWN ───────────────────────────────
  async getOrderStatusBreakdown() {
    const result = await this.prisma.order.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    return result.map((r) => ({
      status: r.status,
      count: r._count.id,
    }));
  }

  // ─── HOURLY ORDER DISTRIBUTION ────────────────────────────
  async getHourlyDistribution() {
    const from = new Date();
    from.setDate(from.getDate() - 30);

    const orders = await this.prisma.order.findMany({
      where: { createdAt: { gte: from } },
      select: { createdAt: true },
    });

    const byHour = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 }));
    orders.forEach((o) => {
      const hour = o.createdAt.getHours();
      byHour[hour].count++;
    });

    return byHour;
  }
}
