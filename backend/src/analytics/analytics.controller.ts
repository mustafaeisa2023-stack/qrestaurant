import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('analytics')
@Controller('v1/analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard summary stats' })
  getDashboard() {
    return this.analyticsService.getDashboardSummary();
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Get revenue over time' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  getRevenue(@Query('days') days?: number) {
    return this.analyticsService.getRevenueOverTime(days || 7);
  }

  @Get('top-items')
  @ApiOperation({ summary: 'Get top selling menu items' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getTopItems(@Query('limit') limit?: number) {
    return this.analyticsService.getTopMenuItems(limit || 10);
  }

  @Get('tables')
  @ApiOperation({ summary: 'Get per-table analytics' })
  getTableAnalytics() {
    return this.analyticsService.getTableAnalytics();
  }

  @Get('status-breakdown')
  @ApiOperation({ summary: 'Get order status distribution' })
  getStatusBreakdown() {
    return this.analyticsService.getOrderStatusBreakdown();
  }

  @Get('hourly')
  @ApiOperation({ summary: 'Get hourly order distribution (last 30 days)' })
  getHourlyDistribution() {
    return this.analyticsService.getHourlyDistribution();
  }
}
