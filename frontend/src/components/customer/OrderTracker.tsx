'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, Clock, ChefHat, Bell, Utensils } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ordersService } from '@/lib/services';
import { useCustomerSocket } from '@/hooks/useSocket';
import { useCartStore } from '@/stores';
import { formatCurrency } from '@/lib/utils';
import type { OrderStatus } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
}

const STATUS_STEPS: {
  status: OrderStatus;
  label: string;
  icon: React.ReactNode;
  desc: string;
}[] = [
  { status: 'PENDING',   label: 'Order Placed', icon: <Clock size={16} />,       desc: 'Waiting for confirmation' },
  { status: 'CONFIRMED', label: 'Confirmed',     icon: <CheckCircle2 size={16} />, desc: 'Order accepted' },
  { status: 'PREPARING', label: 'Preparing',     icon: <ChefHat size={16} />,     desc: 'Kitchen is cooking' },
  { status: 'READY',     label: 'Ready!',        icon: <Bell size={16} />,        desc: 'Coming to your table' },
  { status: 'SERVED',    label: 'Served',        icon: <Utensils size={16} />,    desc: 'Enjoy your meal!' },
];

const STATUS_COLORS: Record<string, string> = {
  PENDING:   '#d97706',
  CONFIRMED: '#2563eb',
  PREPARING: '#7c3aed',
  READY:     '#16a34a',
  SERVED:    '#0891b2',
  COMPLETED: '#6b7280',
  CANCELLED: '#dc2626',
};

export default function OrderTracker({ open, onClose }: Props) {
  const queryClient = useQueryClient();
  const sessionId   = useCartStore((s) => s.sessionId);
  const tableId     = useCartStore((s) => s.tableId);

  const { data: order, isLoading } = useQuery({
    queryKey: ['customer-order', tableId, sessionId],
    queryFn: async () => {
      if (!tableId) return null;
      const result = await ordersService.getAll({ tableId, page: 1, limit: 1 });
      const latestOrder = result.data?.[0];
      if (!latestOrder) return null;
      // إذا الطلب من session مختلف — الزبون الجديد ما يشوفه
      if (latestOrder.sessionId && sessionId && latestOrder.sessionId !== sessionId) {
        return null;
      }
      return latestOrder;
    },
    enabled: !!tableId && open,
    refetchInterval: 20_000,
  });

  // WebSocket — تحديث فوري
  useCustomerSocket({
    tableId: tableId || undefined,
    onStatusChanged: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-order', tableId, sessionId] });
    },
  });

  const currentStep = order
    ? STATUS_STEPS.findIndex((s) => s.status === order.status)
    : -1;

  const isCancelled = order?.status === 'CANCELLED';
  const isCompleted = order?.status === 'COMPLETED';
  const statusColor = order ? STATUS_COLORS[order.status] || '#7c3aed' : '#7c3aed';

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="fixed bottom-0 left-0 right-0 z-50 max-w-lg mx-auto rounded-t-3xl overflow-hidden"
            style={{
              background: 'var(--bg-surface)',
              border: '1.5px solid var(--border-default)',
              borderBottom: 'none',
              maxHeight: '85dvh',
            }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border-strong)' }} />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', fontSize: '16px', letterSpacing: '0.06em' }}>
                  ORDER STATUS
                </h2>
                {order && (
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--brand)' }}>
                    {order.orderNumber}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl transition-colors"
                style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}
              >
                <X size={17} />
              </button>
            </div>

            <div className="overflow-y-auto" style={{ maxHeight: 'calc(85dvh - 100px)' }}>

              {/* Loading */}
              {isLoading && (
                <div className="flex items-center justify-center py-16">
                  <div className="w-8 h-8 rounded-full border-2 animate-spin"
                    style={{ borderColor: 'var(--brand-border)', borderTopColor: 'var(--brand)' }} />
                </div>
              )}

              {/* No order */}
              {!isLoading && !order && (
                <div className="text-center py-16 px-6">
                  <div className="text-5xl mb-4" style={{ opacity: 0.3 }}>🎯</div>
                  <p style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', fontSize: '14px', letterSpacing: '0.06em' }}>
                    NO ACTIVE ORDER
                  </p>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px' }}>
                    Place an order from the menu first
                  </p>
                </div>
              )}

              {/* Order found */}
              {!isLoading && order && (
                <div className="px-5 py-4 space-y-5">

                  {/* Status badge */}
                  <div className="flex items-center justify-between">
                    <div
                      className="flex items-center gap-2 px-4 py-2 rounded-xl"
                      style={{ background: `${statusColor}15`, border: `1.5px solid ${statusColor}35` }}
                    >
                      <span style={{ color: statusColor, fontSize: '13px', fontFamily: 'var(--font-display)', letterSpacing: '0.06em' }}>
                        {isCancelled ? '✕ CANCELLED' : isCompleted ? '✔ COMPLETED' : order.status}
                      </span>
                    </div>
                    {order.estimatedTime && !isCompleted && !isCancelled && (
                      <div className="flex items-center gap-1.5">
                        <Clock size={14} style={{ color: 'var(--brand)' }} />
                        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--brand)', fontWeight: '700', fontSize: '13px' }}>
                          {order.estimatedTime} min
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Progress tracker */}
                  {!isCancelled && !isCompleted && (
                    <div className="relative">
                      <div className="absolute left-5 top-5 bottom-5 w-0.5"
                        style={{ background: 'var(--border-subtle)' }} />
                      <div
                        className="absolute left-5 top-5 w-0.5 transition-all duration-700"
                        style={{
                          background: 'var(--brand)',
                          height: currentStep >= 0 ? `${(currentStep / (STATUS_STEPS.length - 1)) * 100}%` : '0%',
                          boxShadow: '0 0 8px rgba(124,58,237,0.5)',
                        }}
                      />
                      <div className="space-y-4 relative">
                        {STATUS_STEPS.map((step, idx) => {
                          const done   = idx <= currentStep;
                          const active = idx === currentStep;
                          return (
                            <motion.div
                              key={step.status}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.07 }}
                              className="flex items-center gap-4"
                            >
                              <div
                                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500"
                                style={{
                                  background: done ? 'var(--brand)' : 'var(--bg-inset)',
                                  border: `2px solid ${done ? 'var(--brand)' : 'var(--border-default)'}`,
                                  color: done ? 'white' : 'var(--text-disabled)',
                                  boxShadow: active ? '0 0 16px rgba(124,58,237,0.5)' : 'none',
                                  transform: active ? 'scale(1.15)' : 'scale(1)',
                                }}
                              >
                                {step.icon}
                              </div>
                              <div>
                                <p style={{
                                  fontFamily: 'var(--font-display)',
                                  fontSize: '13px',
                                  letterSpacing: '0.05em',
                                  color: done ? 'var(--text-primary)' : 'var(--text-disabled)',
                                }}>
                                  {step.label}
                                </p>
                                <p style={{
                                  fontSize: '12px',
                                  color: active ? 'var(--brand)' : 'var(--text-muted)',
                                  fontFamily: active ? 'var(--font-mono)' : 'var(--font-body)',
                                }}>
                                  {active ? `⊕ ${step.desc}` : step.desc}
                                </p>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Completed */}
                  {isCompleted && (
                    <div className="text-center py-6">
                      <div className="text-5xl mb-3">✅</div>
                      <p style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', fontSize: '16px', letterSpacing: '0.06em' }}>
                        ENJOY YOUR MEAL!
                      </p>
                    </div>
                  )}

                  {/* Cancelled */}
                  {isCancelled && (
                    <div className="p-4 rounded-xl" style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)' }}>
                      <p style={{ color: '#dc2626', fontFamily: 'var(--font-display)', fontSize: '13px', letterSpacing: '0.05em' }}>
                        ORDER CANCELLED
                      </p>
                      {order.cancelReason && (
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          {order.cancelReason}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Items */}
                  <div>
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: '12px', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '10px' }}>
                      YOUR ORDER
                    </p>
                    <div className="space-y-2">
                      {order.items?.map((item) => (
                        <div key={item.id} className="flex justify-between items-center py-2"
                          style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold"
                              style={{ background: 'var(--brand-subtle)', color: 'var(--brand)', fontFamily: 'var(--font-mono)' }}>
                              {item.quantity}
                            </span>
                            <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{item.name}</span>
                          </div>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--brand)', fontWeight: '700' }}>
                            {formatCurrency(item.subtotal)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Total */}
                    <div className="flex justify-between items-center mt-3 pt-3"
                      style={{ borderTop: '1.5px solid var(--border-default)' }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: '14px', letterSpacing: '0.06em', color: 'var(--text-primary)' }}>
                        TOTAL
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '18px', fontWeight: '700', color: 'var(--brand)' }}>
                        {formatCurrency(order.total)}
                      </span>
                    </div>
                  </div>

                  {/* Note */}
                  {order.customerNote && (
                    <div className="p-3 rounded-xl" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: '3px' }}>
                        YOUR NOTE
                      </p>
                      <p style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{order.customerNote}</p>
                    </div>
                  )}

                  <div style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }} />
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}