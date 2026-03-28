'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { ordersService } from '@/lib/services';
import { formatCurrency, formatRelativeTime, ORDER_STATUS_CONFIG } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { Order, OrderStatus } from '@/types';

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  PENDING:   'CONFIRMED',
  CONFIRMED: 'PREPARING',
  PREPARING: 'READY',
  READY:     'SERVED',
  SERVED:    'COMPLETED',
};

export default function OrdersPage() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const STATUS_FILTERS: { label: string; value: OrderStatus | 'ALL' }[] = [
    { label: t('allCategories'), value: 'ALL' },
    { label: `⏳ ${t('PENDING')}`,   value: 'PENDING'   },
    { label: `✅ ${t('CONFIRMED')}`, value: 'CONFIRMED' },
    { label: `👨‍🍳 ${t('PREPARING')}`, value: 'PREPARING' },
    { label: `🔔 ${t('READY')}`,    value: 'READY'     },
    { label: `🍽️ ${t('SERVED')}`,   value: 'SERVED'    },
    { label: `✔️ ${t('COMPLETED')}`, value: 'COMPLETED' },
    { label: `✕ ${t('CANCELLED')}`, value: 'CANCELLED' },
  ];

  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>('ALL');
  const [search,       setSearch]       = useState('');
  const [page,         setPage]         = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['orders', { status: statusFilter, search, page }],
    queryFn: () => ordersService.getAll({
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      search: search || undefined,
      page, limit: 15,
    }),
    refetchInterval: 30_000,
  });

  const { mutate: updateStatus, isPending: isUpdating } = useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: OrderStatus; note?: string }) =>
      ordersService.updateStatus(id, { status, staffNote: note }),
    onSuccess: (updated) => {
      toast.success(`${t('updateStatus')}: ${t(updated.status as any)}`);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['active-orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      if (selectedOrder?.id === updated.id) setSelectedOrder(updated);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to update'),
  });

  const orders = data?.data || [];
  const meta   = data?.meta;

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', letterSpacing: '0.06em', color: 'var(--text-primary)' }}>
            {t('orders')}
          </h1>
          {meta && (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px', fontFamily: 'var(--font-mono)' }}>
              {meta.total} total
            </p>
          )}
        </div>
        <button onClick={() => refetch()} className="btn-secondary flex items-center gap-2 py-2">
          <RefreshCw size={15} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="card p-3 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder={`${t('search')}...`}
            className="input pl-9"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {STATUS_FILTERS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => { setStatusFilter(value); setPage(1); }}
              className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap"
              style={{
                fontFamily: 'var(--font-display)',
                letterSpacing: '0.05em',
                background:   statusFilter === value ? 'var(--brand)'        : 'var(--bg-inset)',
                color:        statusFilter === value ? 'white'               : 'var(--text-secondary)',
                border:       `1.5px solid ${statusFilter === value ? 'var(--brand)' : 'var(--border-default)'}`,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => <div key={i} className="h-20 shimmer rounded-2xl" />)}
        </div>
      ) : orders.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-4xl mb-3">📋</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No orders found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map((order) => {
            const cfg  = ORDER_STATUS_CONFIG[order.status];
            const next = NEXT_STATUS[order.status];
            return (
              <div
                key={order.id}
                className="card p-4 flex flex-col sm:flex-row sm:items-center gap-3 cursor-pointer card-hover"
                onClick={() => setSelectedOrder(order)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="badge" style={{ fontFamily: 'var(--font-mono)' }}>
                      {order.orderNumber}
                    </span>
                    <span className="badge" style={{ background: `${cfg.color}15`, color: cfg.color, borderColor: `${cfg.color}30` }}>
                      {cfg.icon} {t(order.status as any) || cfg.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap" style={{ fontSize: '13px' }}>
                    <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                      {t('table')} {order.table?.number}
                    </span>
                    <span style={{ color: 'var(--border-strong)' }}>·</span>
                    <span style={{ color: 'var(--text-muted)' }}>{order.table?.floor}</span>
                    <span style={{ color: 'var(--border-strong)' }}>·</span>
                    <span style={{ color: 'var(--text-muted)' }}>{order._count?.items} {t('items')}</span>
                  </div>
                  {order.customerNote && (
                    <p className="text-xs italic truncate mt-1" style={{ color: 'var(--text-muted)' }}>
                      "{order.customerNote}"
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <p style={{ fontWeight: '700', color: 'var(--brand)', fontFamily: 'var(--font-mono)' }}>
                      {formatCurrency(order.total)}
                    </p>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {formatRelativeTime(order.createdAt)}
                    </p>
                  </div>

                  {next && (
                    <button
                      onClick={(e) => { e.stopPropagation(); updateStatus({ id: order.id, status: next }); }}
                      disabled={isUpdating}
                      className="btn-primary text-xs py-1.5 px-3 whitespace-nowrap"
                    >
                      → {t(next as any) || ORDER_STATUS_CONFIG[next].label}
                    </button>
                  )}

                  {order.status === 'PENDING' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`${t('cancel')}?`)) updateStatus({ id: order.id, status: 'CANCELLED' });
                      }}
                      className="btn-danger text-xs py-1.5 px-3"
                    >
                      {t('cancel')}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-secondary py-1.5 px-3 text-sm disabled:opacity-40">
            ←
          </button>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {page} / {meta.totalPages}
          </span>
          <button disabled={page >= meta.totalPages} onClick={() => setPage(p => p + 1)} className="btn-secondary py-1.5 px-3 text-sm disabled:opacity-40">
            →
          </button>
        </div>
      )}

      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStatusUpdate={(id, status, note) => updateStatus({ id, status, note })}
          isUpdating={isUpdating}
        />
      )}
    </div>
  );
}

// ── Order Detail Modal ────────────────────────────────────

function OrderDetailModal({ order, onClose, onStatusUpdate, isUpdating }: {
  order: Order;
  onClose: () => void;
  onStatusUpdate: (id: string, status: OrderStatus, note?: string) => void;
  isUpdating: boolean;
}) {
  const { t } = useTranslation();
  const [note, setNote] = useState(order.staffNote || '');
  const cfg  = ORDER_STATUS_CONFIG[order.status];
  const next = NEXT_STATUS[order.status];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="rounded-3xl w-full max-w-lg overflow-y-auto shadow-modal" style={{ background: 'var(--bg-surface)', border: '1.5px solid var(--border-default)', maxHeight: '90vh' }}>

        {/* Header */}
        <div className="p-5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
              {order.orderNumber}
            </p>
            <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', fontSize: '18px', letterSpacing: '0.06em' }}>
              {t('table')} {order.table?.number}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="badge" style={{ background: `${cfg.color}15`, color: cfg.color, borderColor: `${cfg.color}30` }}>
              {cfg.icon} {t(order.status as any) || cfg.label}
            </span>
            <button onClick={onClose} className="p-2 rounded-xl transition-colors" style={{ color: 'var(--text-muted)' }}>✕</button>
          </div>
        </div>

        <div className="p-5 space-y-5">

          {/* Items */}
          <div>
            <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '12px', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '12px' }}>
              {t('items')}
            </h4>
            <div className="space-y-2">
              {order.items?.map((item) => (
                <div key={item.id} className="flex justify-between items-center py-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{item.name}</p>
                    {item.note && <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>{item.note}</p>}
                  </div>
                  <div className="text-right">
                    <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>×{item.quantity}</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {formatCurrency(item.subtotal)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="rounded-xl p-3 space-y-1.5" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
            <div className="flex justify-between" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              <span>{t('subtotal')}</span><span style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(order.subtotal)}</span>
            </div>
            <div className="flex justify-between" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              <span>{t('tax')}</span><span style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(order.tax)}</span>
            </div>
            <div className="flex justify-between pt-1.5" style={{ borderTop: '1px solid var(--border-default)', fontWeight: '700', color: 'var(--text-primary)' }}>
              <span style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.05em' }}>{t('total')}</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--brand)', fontSize: '16px' }}>{formatCurrency(order.total)}</span>
            </div>
          </div>

          {/* Customer note */}
          {order.customerNote && (
            <div className="rounded-xl p-3" style={{ background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.2)' }}>
              <p style={{ fontSize: '11px', fontFamily: 'var(--font-display)', letterSpacing: '0.05em', color: '#d97706', marginBottom: '4px' }}>
                {t('addNote')}
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{order.customerNote}</p>
            </div>
          )}

          {/* Staff note */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              Staff Note
            </label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="Internal note..." rows={2} className="input resize-none text-sm" />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {next && (
              <button
                onClick={() => onStatusUpdate(order.id, next, note)}
                disabled={isUpdating}
                className="btn-primary flex-1 py-2.5"
              >
                {isUpdating ? t('loading') : `→ ${t(next as any) || ORDER_STATUS_CONFIG[next].label}`}
              </button>
            )}
            {(order.status === 'PENDING' || order.status === 'CONFIRMED') && (
              <button
                onClick={() => {
                  const reason = prompt(`${t('cancel')}:`);
                  if (reason !== null) onStatusUpdate(order.id, 'CANCELLED', reason);
                }}
                className="btn-danger px-4 py-2.5 text-sm"
              >
                {t('cancel')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}