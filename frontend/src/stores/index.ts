// ============================================================
// QRestaurant - Zustand State Stores
// Fixed: subtotal/itemCount as derived values (not getters)
// ============================================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import Cookies from 'js-cookie';
import type { User, CartItem, MenuItem, Order } from '@/types';

// ══════════════════════════════════════════════════════════
// AUTH STORE
// ══════════════════════════════════════════════════════════

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
  updateUser: (user: Partial<User>) => void;
  setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      _hasHydrated: false,

      setHasHydrated: (state) => set({ _hasHydrated: state }),

      setAuth: (user, accessToken, refreshToken) => {
        const isProd = process.env.NODE_ENV === 'production';
        Cookies.set('accessToken',  accessToken,  { expires: 1 / 96, secure: isProd, sameSite: 'strict' });
        Cookies.set('refreshToken', refreshToken, { expires: 7,      secure: isProd, sameSite: 'strict' });
        if (typeof window !== 'undefined') {
          localStorage.setItem('accessToken',  accessToken);
          localStorage.setItem('refreshToken', refreshToken);
        }
        set({ user, accessToken, refreshToken, isAuthenticated: true });
      },

      clearAuth: () => {
        Cookies.remove('accessToken');
        Cookies.remove('refreshToken');
        if (typeof window !== 'undefined') {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        }
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
      },

      updateUser: (userData) =>
        set((state) => ({ user: state.user ? { ...state.user, ...userData } : null })),
    }),
    {
      name: 'qr-auth',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? localStorage : { getItem: () => null, setItem: () => {}, removeItem: () => {} }
      ),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);

// ══════════════════════════════════════════════════════════
// CART STORE
// Fixed: subtotal & itemCount as plain state (computed on
// every mutation) so React re-renders correctly.
// ══════════════════════════════════════════════════════════

interface CartState {
  items: CartItem[];
  tableId: string | null;
  sessionId: string | null;
  qrToken: string | null;
  subtotal: number;
  itemCount: number;
  addItem: (menuItem: MenuItem, quantity?: number, note?: string) => void;
  removeItem: (menuItemId: string) => void;
  updateQuantity: (menuItemId: string, quantity: number) => void;
  updateNote: (menuItemId: string, note: string) => void;
  clearCart: () => void;
  setTableInfo: (tableId: string, sessionId: string, qrToken: string) => void;
}

// Helper: recompute derived values from items array
const computeTotals = (items: CartItem[]) => ({
  subtotal: items.reduce(
    (sum, i) => sum + (i.menuItem.discountPrice ?? i.menuItem.price) * i.quantity,
    0,
  ),
  itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
});

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      tableId: null,
      sessionId: null,
      qrToken: null,
      subtotal: 0,
      itemCount: 0,

      addItem: (menuItem, quantity = 1, note) => {
        set((state) => {
          const idx = state.items.findIndex((i) => i.menuItem.id === menuItem.id);
          let newItems: CartItem[];
          if (idx >= 0) {
            newItems = state.items.map((item, i) =>
              i === idx
                ? { ...item, quantity: item.quantity + quantity, note: note ?? item.note }
                : item,
            );
          } else {
            newItems = [...state.items, { menuItem, quantity, note }];
          }
          return { items: newItems, ...computeTotals(newItems) };
        });
      },

      removeItem: (menuItemId) => {
        set((state) => {
          const newItems = state.items.filter((i) => i.menuItem.id !== menuItemId);
          return { items: newItems, ...computeTotals(newItems) };
        });
      },

      updateQuantity: (menuItemId, quantity) => {
        if (quantity <= 0) { get().removeItem(menuItemId); return; }
        set((state) => {
          const newItems = state.items.map((i) =>
            i.menuItem.id === menuItemId ? { ...i, quantity } : i,
          );
          return { items: newItems, ...computeTotals(newItems) };
        });
      },

      updateNote: (menuItemId, note) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.menuItem.id === menuItemId ? { ...i, note } : i,
          ),
        })),

      clearCart: () => set({ items: [], subtotal: 0, itemCount: 0 }),

      setTableInfo: (tableId, sessionId, qrToken) =>
        set({ tableId, sessionId, qrToken }),
    }),
    {
      name: 'qr-cart',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? localStorage : { getItem: () => null, setItem: () => {}, removeItem: () => {} }
      ),
    },
  ),
);

// ══════════════════════════════════════════════════════════
// NOTIFICATIONS STORE
// ══════════════════════════════════════════════════════════

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  data?: any;
}

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (n: Omit<AppNotification, 'id' | 'isRead' | 'createdAt'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,

  addNotification: (n) => {
    const notification: AppNotification = {
      ...n,
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      isRead: false,
      createdAt: new Date(),
    };
    set((state) => ({
      notifications: [notification, ...state.notifications].slice(0, 50),
      unreadCount: state.unreadCount + 1,
    }));
  },

  markAsRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n,
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    })),

  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    })),

  clearAll: () => set({ notifications: [], unreadCount: 0 }),
}));

// ══════════════════════════════════════════════════════════
// LOCALE STORE
// ══════════════════════════════════════════════════════════

type Locale = 'en' | 'ar' | 'fr';

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: 'en' as Locale,
      setLocale: (locale) => set({ locale }),
    }),
    { name: 'qr-locale' },
  ),
);
