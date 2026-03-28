'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, CheckCircle2, ChefHat } from 'lucide-react';
import toast from 'react-hot-toast';
import { ordersService } from '@/lib/services';
import { ORDER_STATUS_CONFIG } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import type { Order, OrderStatus } from '@/types';

const KITCHEN_STATUSES: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'];

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  PENDING:   'CONFIRMED',
  CONFIRMED: 'PREPARING',
  PREPARING: 'READY',
  READY:     'SERVED',
};

const COLUMN_COLORS: Record<string, { border: string; header: string }> = {
  PENDING:   { border: 'rgba(217,119,6,0.4)',   header: 'rgba(217,119,6,0.08)'  },
  CONFIRMED: { border: 'rgba(37,99,235,0.4)',   header: 'rgba(37,99,235,0.08)'  },
  PREPARING: { border: 'rgba(234,88,12,0.4)',   header: 'rgba(234,88,12,0.08)'  },
  READY:     { border: 'rgba(22,163,74,0.4)',   header: 'rgba(22,163,74,0.08)'  },
};

const ACTION_COLORS: Partial<Record<OrderStatus, string>> = {
  CONFIRMED: '#2563eb',
  PREPARING: '#ea580c',
  READY:     '#16a34a',
  SERVED:    '#0891b2',
};

export default function KitchenPage() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const { data: activeOrders = [], isLoading } = useQuery({
    queryKey: ['active-orders'],
    queryFn:  ordersService.getActive,
    refetchInterval: 15_000,
  });

  const { mutate: advance, isPending } = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      ordersService.updateStatus(id, { status }),
    onSuccess: (order) => {
      toast.success(`${order.orderNumber} → ${t(order.status as any)}`);
      queryClient.invalidateQueries({ queryKey: ['active-orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: () => toast.error('Failed to update order'),
  });

  const columns = KITCHEN_STATUSES.map((status) => ({
    status,
    colors: COLUMN_COLORS[status],
    orders: activeOrders.filter((o) => o.status === status),
  }));

  const COLUMN_LABELS: Record<string, string> = {
    PENDING:   `⏳ ${t('PENDING')}`,
    CONFIRMED: `✅ ${t('CONFIRMED')}`,
    PREPARING: `👨‍🍳 ${t('PREPARING')}`,
    READY:     `🔔 ${t('READY')}`,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <ChefHat size={48} className="mx-auto mb-3 animate-bounce" style={{ color: 'var(--brand)' }} />
          <p style={{ color: 'var(--text-muted)' }}>{t('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 h-full">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ChefHat size={22} style={{ color: 'var(--brand)' }} />
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', letterSpacing: '0.06em', color: 'var(--text-primary)' }}>
              {t('kitchen')}
            </h1>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {activeOrders.length} {t('activeOrders')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5" style={{ fontSize: '12px', color: '#16a34a', fontFamily: 'var(--font-mono)' }}>
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          LIVE
        </div>
      </div>

      {/* Kanban */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4" style={{ minHeight: 'calc(100vh - 180px)' }}>
        {columns.map(({ status, colors, orders }) => (
          <div
            key={status}
            className="flex flex-col rounded-2xl overflow-hidden"
            style={{
              border: `2px solid ${colors.border}`,
              background: 'var(--bg-surface)',
            }}
          >
            {/* Column header */}
            <div className="px-4 py-3 flex items-center justify-between" style={{ background: colors.header, borderBottom: '1px solid var(--border-subtle)' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '12px', letterSpacing: '0.06em', color: 'var(--text-primary)' }}>
                {COLUMN_LABELS[status]}
              </h2>
              {orders.length > 0 && (
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: 'var(--bg-surface)', color: 'var(--brand)', fontFamily: 'var(--font-mono)', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }}>
                  {orders.length}
                </span>
              )}
            </div>

            {/* Cards */}
            <div className="flex-1 p-3 space-y-3 overflow-y-auto">
              <AnimatePresence>
                {orders.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center py-10"
                    style={{ color: 'var(--text-disabled)' }}
                  >
                    <CheckCircle2 size={28} className="mb-2" />
                    <p style={{ fontSize: '12px', fontFamily: 'var(--font-mono)' }}>No orders</p>
                  </motion.div>
                )}
                {orders.map((order) => (
                  <KitchenCard
                    key={order.id}
                    order={order}
                    nextStatus={NEXT_STATUS[status]}
                    onAdvance={(nextSt) => advance({ id: order.id, status: nextSt })}
                    isPending={isPending}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Kitchen Card ──────────────────────────────────────────

function KitchenCard({ order, nextStatus, onAdvance, isPending }: {
  order: Order;
  nextStatus?: OrderStatus;
  onAdvance: (status: OrderStatus) => void;
  isPending: boolean;
}) {
  const { t } = useTranslation();
  const ageMin   = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000);
  const isUrgent = ageMin >= 15 && order.status === 'PENDING';

  const ACTION_LABELS: Partial<Record<OrderStatus, string>> = {
    CONFIRMED: `✅ ${t('CONFIRMED')}`,
    PREPARING: `👨‍🍳 ${t('PREPARING')}`,
    READY:     `🔔 ${t('READY')}`,
    SERVED:    `🍽️ ${t('SERVED')}`,
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      className="rounded-xl overflow-hidden"
      style={{
        border: `1.5px solid ${isUrgent ? 'rgba(220,38,38,0.5)' : 'var(--border-default)'}`,
        background: 'var(--bg-elevated)',
        boxShadow: isUrgent ? '0 0 12px rgba(220,38,38,0.2)' : 'none',
      }}
    >
      {/* Card header */}
      <div className="flex items-center justify-between px-3 py-2"
        style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>
            {order.orderNumber}
          </p>
          <p style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}>
            {t('table')} {order.table?.number}
          </p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1" style={{
            fontSize: '11px', fontWeight: '600', fontFamily: 'var(--font-mono)',
            color: isUrgent ? '#dc2626' : ageMin >= 10 ? '#d97706' : 'var(--text-muted)',
          }}>
            <Clock size={11} />
            {ageMin === 0 ? 'now' : `${ageMin}m`}
          </div>
          {order.table?.floor && (
            <p style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {order.table.floor}
            </p>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="px-3 py-2 space-y-1.5">
        {order.items?.map((item) => (
          <div key={item.id} className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ background: 'var(--brand-subtle)', color: 'var(--brand)', fontFamily: 'var(--font-mono)' }}>
              {item.quantity}
            </span>
            <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', lineHeight: '1.3' }}>
              {item.name}
            </span>
          </div>
        ))}
        {order.customerNote && (
          <div className="mt-2 px-2 py-1.5 rounded-lg" style={{ background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.2)' }}>
            <p style={{ fontSize: '11px', color: '#d97706', lineHeight: '1.4' }}>
              📝 {order.customerNote}
            </p>
          </div>
        )}
      </div>

      {/* Action button */}
      {nextStatus && (
        <div className="px-3 pb-3">
          <button
            onClick={() => onAdvance(nextStatus)}
            disabled={isPending}
            className="w-full py-2 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-50"
            style={{
              background: ACTION_COLORS[nextStatus] || 'var(--brand)',
              color: 'white',
              fontFamily: 'var(--font-display)',
              letterSpacing: '0.05em',
            }}
          >
            {ACTION_LABELS[nextStatus] || `→ ${t(nextStatus as any)}`}
          </button>
        </div>
      )}
    </motion.div>
  );
}