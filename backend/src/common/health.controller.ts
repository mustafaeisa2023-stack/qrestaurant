// ============================================================
// QRestaurant - Health Check Endpoint
// Used by Docker healthcheck, load balancers, uptime monitors
// ============================================================

import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  @ApiOperation({ summary: 'Health check (public)' })
  async health() {
    let dbStatus = 'ok';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = 'error';
    }

    const status = dbStatus === 'ok' ? 'ok' : 'degraded';

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV,
      services: {
        database: dbStatus,
        api: 'ok',
      },
    };
  }

  @Get()
  @ApiOperation({ summary: 'API root' })
  root() {
    return {
      name: 'QRestaurant API',
      version: '1.0.0',
      docs: '/api/docs',
      health: '/health',
    };
  }
}
