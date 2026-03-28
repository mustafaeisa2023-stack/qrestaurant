// ============================================================
// QRestaurant - Orders Controller
// ============================================================

import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { OrderStatus, Role } from '@prisma/client';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@ApiTags('orders')
@Controller('v1/orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // ─── PUBLIC: Customer places order ────────────────────────
  @Post()
  @ApiOperation({ summary: 'Place a new order (public)' })
  create(@Body() dto: CreateOrderDto) {
    return this.ordersService.create(dto);
  }

  // ─── PUBLIC: Customer tracks their order ──────────────────
  @Get('track/:orderNumber')
  @ApiOperation({ summary: 'Track order by order number (public)' })
  trackOrder(@Param('orderNumber') orderNumber: string) {
    return this.ordersService.findByNumber(orderNumber);
  }

  // ─── ADMIN: Get all orders ────────────────────────────────
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all orders with filters (admin)' })
  @ApiQuery({ name: 'tableId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: OrderStatus })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Query('tableId') tableId?: string,
    @Query('status') status?: OrderStatus,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.ordersService.findAll({ tableId, status, search, page, limit });
  }

  // ─── ADMIN: Get active orders (kitchen display) ───────────
  @Get('active')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all active orders (kitchen view)' })
  getActiveOrders() {
    return this.ordersService.getActiveOrders();
  }

  // ─── ADMIN: Get single order ──────────────────────────────
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get order by ID' })
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  // ─── ADMIN: Update order status ───────────────────────────
  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STAFF, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update order status' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @Request() req: any,
  ) {
    return this.ordersService.updateStatus(id, dto, req.user?.sub);
  }
}
