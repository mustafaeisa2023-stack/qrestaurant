// ============================================================
// QRestaurant - API Services
// ============================================================

import api, { unwrap } from './api';
import type {
  Category,
  MenuItem,
  Table,
  Order,
  OrderStatus,
  TableStatus,
  User,
  DashboardSummary,
  RevenueDataPoint,
  TopMenuItem,
  PaginatedResponse,
} from '@/types';

// ══════════════════════════════════════════════════════════
// AUTH SERVICE
// ══════════════════════════════════════════════════════════

export const authService = {
  login: async (email: string, password: string) => {
    const res = await api.post('/v1/auth/login', { email, password });
    return unwrap<{ accessToken: string; refreshToken: string; user: User }>(res);
  },

  logout: async () => {
    await api.post('/v1/auth/logout');
  },

  getProfile: async () => {
    const res = await api.get('/v1/auth/profile');
    return unwrap<User>(res);
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    const res = await api.patch('/v1/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return unwrap<{ message: string }>(res);
  },
};

// ══════════════════════════════════════════════════════════
// MENU SERVICE
// ══════════════════════════════════════════════════════════

export const menuService = {
  // Public
  getFullMenu: async () => {
    const res = await api.get('/v1/menu/public');
    return unwrap<Category[]>(res);
  },

  getFeatured: async () => {
    const res = await api.get('/v1/menu/featured');
    return unwrap<MenuItem[]>(res);
  },

  // Categories
  getCategories: async (activeOnly = false) => {
    const res = await api.get(`/v1/menu/categories?activeOnly=${activeOnly}`);
    return unwrap<Category[]>(res);
  },

  getCategory: async (id: string) => {
    const res = await api.get(`/v1/menu/categories/${id}`);
    return unwrap<Category>(res);
  },

  createCategory: async (data: Partial<Category>) => {
    const res = await api.post('/v1/menu/categories', data);
    return unwrap<Category>(res);
  },

  updateCategory: async (id: string, data: Partial<Category>) => {
    const res = await api.put(`/v1/menu/categories/${id}`, data);
    return unwrap<Category>(res);
  },

  deleteCategory: async (id: string) => {
    await api.delete(`/v1/menu/categories/${id}`);
  },

  reorderCategories: async (ids: string[]) => {
    await api.patch('/v1/menu/categories/reorder', { ids });
  },

  // Items
  getItems: async (filters?: {
    categoryId?: string;
    isAvailable?: boolean;
    isFeatured?: boolean;
    search?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.categoryId) params.set('categoryId', filters.categoryId);
    if (filters?.isAvailable !== undefined)
      params.set('isAvailable', String(filters.isAvailable));
    if (filters?.isFeatured !== undefined)
      params.set('isFeatured', String(filters.isFeatured));
    if (filters?.search) params.set('search', filters.search);
    const res = await api.get(`/v1/menu/items?${params}`);
    return unwrap<MenuItem[]>(res);
  },

  getItem: async (id: string) => {
    const res = await api.get(`/v1/menu/items/${id}`);
    return unwrap<MenuItem>(res);
  },

  createItem: async (data: Partial<MenuItem>) => {
    const res = await api.post('/v1/menu/items', data);
    return unwrap<MenuItem>(res);
  },

  updateItem: async (id: string, data: Partial<MenuItem>) => {
    const res = await api.put(`/v1/menu/items/${id}`, data);
    return unwrap<MenuItem>(res);
  },

  deleteItem: async (id: string) => {
    await api.delete(`/v1/menu/items/${id}`);
  },

  toggleAvailability: async (id: string) => {
    const res = await api.patch(`/v1/menu/items/${id}/toggle-availability`);
    return unwrap<MenuItem>(res);
  },

  uploadItemImage: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('/v1/uploads/menu-item', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return unwrap<{ url: string }>(res);
  },

  uploadCategoryImage: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('/v1/uploads/category', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return unwrap<{ url: string }>(res);
  },
};

// ══════════════════════════════════════════════════════════
// TABLES SERVICE
// ══════════════════════════════════════════════════════════

export const tablesService = {
  getAll: async (includeInactive = false) => {
    const res = await api.get(`/v1/tables?includeInactive=${includeInactive}`);
    return unwrap<Table[]>(res);
  },

  getOne: async (id: string) => {
    const res = await api.get(`/v1/tables/${id}`);
    return unwrap<Table>(res);
  },

  getByToken: async (qrToken: string) => {
    const res = await api.get(`/v1/tables/by-token/${qrToken}`);
    return unwrap<Table>(res);
  },

createSession: async (qrToken: string, sessionId?: string) => {
  const res = await api.post(`/v1/tables/by-token/${qrToken}/session`, { sessionId });
  return unwrap<{ id: string; tableId: string; sessionToken: string; startedAt: string; isActive: boolean }>(res);
},

  create: async (data: Partial<Table>) => {
    const res = await api.post('/v1/tables', data);
    return unwrap<Table>(res);
  },

  update: async (id: string, data: Partial<Table>) => {
    const res = await api.put(`/v1/tables/${id}`, data);
    return unwrap<Table>(res);
  },

  delete: async (id: string) => {
    await api.delete(`/v1/tables/${id}`);
  },

  regenerateQR: async (id: string) => {
    const res = await api.post(`/v1/tables/${id}/regenerate-qr`);
    return unwrap<Table>(res);
  },

  updateStatus: async (id: string, status: TableStatus) => {
    const res = await api.patch(`/v1/tables/${id}/status`, { status });
    return unwrap<Table>(res);
  },

  getStats: async (id: string) => {
    const res = await api.get(`/v1/tables/${id}/stats`);
    return unwrap<{
      totalOrders: number;
      totalRevenue: number;
      avgOrderValue: number;
    }>(res);
  },
};

// ══════════════════════════════════════════════════════════
// ORDERS SERVICE
// ══════════════════════════════════════════════════════════

export const ordersService = {
  placeOrder: async (data: {
    tableId: string;
    sessionId?: string;
    items: Array<{ menuItemId: string; quantity: number; note?: string }>;
    customerNote?: string;
  }) => {
    const res = await api.post('/v1/orders', data);
    return unwrap<Order>(res);
  },

  trackOrder: async (orderNumber: string) => {
    const res = await api.get(`/v1/orders/track/${orderNumber}`);
    return unwrap<Order>(res);
  },

  getAll: async (filters?: {
    tableId?: string;
    status?: OrderStatus;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const params = new URLSearchParams();
    if (filters?.tableId) params.set('tableId', filters.tableId);
    if (filters?.status) params.set('status', filters.status);
    if (filters?.search) params.set('search', filters.search);
    if (filters?.page) params.set('page', String(filters.page));
    if (filters?.limit) params.set('limit', String(filters.limit));
    const res = await api.get(`/v1/orders?${params}`);
    return unwrap<PaginatedResponse<Order>>(res);
  },

  getActive: async () => {
    const res = await api.get('/v1/orders/active');
    return unwrap<Order[]>(res);
  },

  getOne: async (id: string) => {
    const res = await api.get(`/v1/orders/${id}`);
    return unwrap<Order>(res);
  },

  updateStatus: async (
    id: string,
    data: {
      status: OrderStatus;
      staffNote?: string;
      cancelReason?: string;
      estimatedTime?: number;
    },
  ) => {
    const res = await api.patch(`/v1/orders/${id}/status`, data);
    return unwrap<Order>(res);
  },
};

// ══════════════════════════════════════════════════════════
// ANALYTICS SERVICE
// ══════════════════════════════════════════════════════════

export const analyticsService = {
  getDashboard: async () => {
    const res = await api.get('/v1/analytics/dashboard');
    return unwrap<DashboardSummary>(res);
  },

  getRevenue: async (days = 7) => {
    const res = await api.get(`/v1/analytics/revenue?days=${days}`);
    return unwrap<RevenueDataPoint[]>(res);
  },

  getTopItems: async (limit = 10) => {
    const res = await api.get(`/v1/analytics/top-items?limit=${limit}`);
    return unwrap<TopMenuItem[]>(res);
  },

  getTableAnalytics: async () => {
    const res = await api.get('/v1/analytics/tables');
    return unwrap<any[]>(res);
  },

  getStatusBreakdown: async () => {
    const res = await api.get('/v1/analytics/status-breakdown');
    return unwrap<Array<{ status: OrderStatus; count: number }>>(res);
  },
};
