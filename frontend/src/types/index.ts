// ============================================================
// QRestaurant - Shared TypeScript Types
// Used by both frontend and backend
// ============================================================

// ─── ENUMS ────────────────────────────────────────────────

export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'STAFF';

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'SERVED'
  | 'COMPLETED'
  | 'CANCELLED';

export type TableStatus =
  | 'AVAILABLE'
  | 'OCCUPIED'
  | 'RESERVED'
  | 'MAINTENANCE';

export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'REFUNDED';

// ─── USER ────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

// ─── TABLE ───────────────────────────────────────────────

export interface Table {
  id: string;
  number: number;
  label: string;
  capacity: number;
  status: TableStatus;
  qrCode?: string;
  qrToken: string;
  floor?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  orders?: Order[];
  _count?: { orders: number };
}

export interface TableSession {
  id: string;
  tableId: string;
  sessionToken: string;
  customerCount?: number;
  startedAt: string;
  endedAt?: string;
  isActive: boolean;
}

// ─── MENU ────────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  nameAr?: string;
  nameFr?: string;
  description?: string;
  imageUrl?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  items?: MenuItem[];
  _count?: { items: number };
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  nameAr?: string;
  nameFr?: string;
  description?: string;
  descriptionAr?: string;
  descriptionFr?: string;
  price: number;
  discountPrice?: number;
  imageUrl?: string;
  calories?: number;
  preparationTime?: number;
  tags: string[];
  allergens: string[];
  isAvailable: boolean;
  isFeatured: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  category?: { id: string; name: string };
}

// ─── ORDER ───────────────────────────────────────────────

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
  note?: string;
  menuItem?: { name: string; imageUrl?: string };
}

export interface OrderStatusHistory {
  id: string;
  orderId: string;
  status: OrderStatus;
  note?: string;
  changedBy?: string;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  tableId: string;
  sessionId?: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  customerNote?: string;
  staffNote?: string;
  estimatedTime?: number;
  confirmedAt?: string;
  preparingAt?: string;
  readyAt?: string;
  servedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
  table?: { number: number; label: string; floor?: string };
  items?: OrderItem[];
  statusHistory?: OrderStatusHistory[];
  _count?: { items: number };
}

// ─── CART ────────────────────────────────────────────────

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  note?: string;
}

// ─── API ─────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ─── ANALYTICS ───────────────────────────────────────────

export interface DashboardSummary {
  today: {
    totalOrders: number;
    revenue: number;
    avgOrderValue: number;
    itemsSold: number;
  };
  live: {
    activeOrders: number;
    tablesOccupied: number;
    pendingOrders: number;
  };
}

export interface RevenueDataPoint {
  date: string;
  revenue: number;
}

export interface TopMenuItem {
  menuItemId: string;
  name: string;
  totalQuantity: number;
  totalRevenue: number;
  orderCount: number;
}

// ─── WEBSOCKET ───────────────────────────────────────────

export interface WsOrderEvent {
  type: 'ORDER_NEW' | 'ORDER_STATUS_UPDATED';
  order: Order;
  timestamp: string;
}

export interface WsOrderStatusEvent {
  type: 'ORDER_STATUS_CHANGED';
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  estimatedTime?: number;
  timestamp: string;
}

// ─── LOCALE ──────────────────────────────────────────────

export type Locale = 'en' | 'ar' | 'fr';
