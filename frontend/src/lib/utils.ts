// ============================================================
// QRestaurant - Utility Functions
// ============================================================

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { OrderStatus, TableStatus } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// export function formatCurrency(amount: number, currency = 'USD'): string {
//   return new Intl.NumberFormat('en-US', {
//     style: 'currency',
//     currency,
//     minimumFractionDigits: 2,
//   }).format(amount);
// }

// دينار أردني
export function formatCurrency(amount: number, currency = 'JOD'): string {
  return new Intl.NumberFormat('ar-JO', {
    style: 'currency',
    currency,
    minimumFractionDigits: 3,
  }).format(amount);
}


export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('ar-JO', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(date));
}

export function formatRelativeTime(date: string | Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return minutes + 'm ago';
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + 'h ago';
  return formatDate(date);
}

export const ORDER_STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bgColor: string; icon: string; step: number }> = {
  PENDING:   { label: 'Pending',    color: 'text-amber-600',  bgColor: 'bg-amber-50 dark:bg-amber-900/20',   icon: '⏳', step: 0 },
  CONFIRMED: { label: 'Confirmed',  color: 'text-blue-600',   bgColor: 'bg-blue-50 dark:bg-blue-900/20',     icon: '✅', step: 1 },
  PREPARING: { label: 'Preparing',  color: 'text-orange-600', bgColor: 'bg-orange-50 dark:bg-orange-900/20', icon: '👨‍🍳', step: 2 },
  READY:     { label: 'Ready!',     color: 'text-green-600',  bgColor: 'bg-green-50 dark:bg-green-900/20',   icon: '🔔', step: 3 },
  SERVED:    { label: 'Served',     color: 'text-teal-600',   bgColor: 'bg-teal-50 dark:bg-teal-900/20',     icon: '🍽️', step: 4 },
  COMPLETED: { label: 'Completed',  color: 'text-gray-600',   bgColor: 'bg-gray-50 dark:bg-gray-900/20',     icon: '✔️', step: 5 },
  CANCELLED: { label: 'Cancelled',  color: 'text-red-600',    bgColor: 'bg-red-50 dark:bg-red-900/20',       icon: '✕',  step: -1 },
};

export const TABLE_STATUS_CONFIG: Record<TableStatus, { label: string; color: string; dot: string }> = {
  AVAILABLE:   { label: 'Available',   color: 'text-green-600', dot: 'bg-green-500' },
  OCCUPIED:    { label: 'Occupied',    color: 'text-red-600',   dot: 'bg-red-500' },
  RESERVED:    { label: 'Reserved',    color: 'text-amber-600', dot: 'bg-amber-500' },
  MAINTENANCE: { label: 'Maintenance', color: 'text-gray-600',  dot: 'bg-gray-400' },
};

export function getItemName(item: { name: string; nameAr?: string | null; nameFr?: string | null }, locale: string): string {
  if (locale === 'ar' && item.nameAr) return item.nameAr;
  if (locale === 'fr' && item.nameFr) return item.nameFr;
  return item.name;
}

export const TAG_COLORS: Record<string, string> = {
  vegetarian:  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  vegan:       'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'gluten-free': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  spicy:       'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};
