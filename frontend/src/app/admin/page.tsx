'use client';

import { useQuery } from '@tanstack/react-query';
import { analyticsService, ordersService } from '@/lib/services';
import { formatCurrency, formatRelativeTime, ORDER_STATUS_CONFIG } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import { TrendingUp, ShoppingBag, Users, Clock, ChefHat } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Link from 'next/link';

export default function AdminDashboard() {
  const { t, locale } = useTranslation();

  const { data: summary } = useQuery({ queryKey: ['dashboard'], queryFn: analyticsService.getDashboard, refetchInterval: 30000 });
  const { data: revenue  } = useQuery({ queryKey: ['revenue'],   queryFn: () => analyticsService.getRevenue(7) });
  const { data: activeOrders = [] } = useQuery({ queryKey: ['active-orders'], queryFn: ordersService.getActive, refetchInterval: 10000 });
  const { data: topItems = []     } = useQuery({ queryKey: ['top-items'],     queryFn: () => analyticsService.getTopItems(5) });

  const stats = [
    { label: t('totalRevenue'),   value: formatCurrency(summary?.today.revenue || 0), icon: TrendingUp, color: '#16a34a', bg: 'rgba(22,163,74,0.10)'  },
    { label: t('todayOrders'),    value: summary?.today.totalOrders || 0,              icon: ShoppingBag, color: '#2563eb', bg: 'rgba(37,99,235,0.10)'  },
    { label: t('activeOrders'),   value: summary?.live.activeOrders || 0,              icon: Clock,       color: '#d97706', bg: 'rgba(217,119,6,0.10)'  },
    { label: t('tablesOccupied'), value: summary?.live.tablesOccupied || 0, icon: Users, color: 'var(--brand)', bg: 'var(--brand-subtle)' },
  ];

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', letterSpacing: '0.06em', color: 'var(--text-primary)' }}>
          {t('dashboard')}
        </h1>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px', fontFamily: 'var(--font-mono)' }}>
          {new Date().toLocaleDateString(locale === 'ar' ? 'ar-JO' : locale === 'fr' ? 'fr-FR' : 'en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: s.bg }}>
              <s.icon size={18} style={{ color: s.color }} />
            </div>
            <p style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
              {s.value}
            </p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">

        {/* Revenue chart */}
        <div className="lg:col-span-2 card p-5">
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '13px', letterSpacing: '0.06em', color: 'var(--text-primary)', marginBottom: '16px' }}>
            {t('totalRevenue')} — 7 {t('days')}

          </h2>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={revenue || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                tickFormatter={(v) => new Date(v).toLocaleDateString(locale === 'ar' ? 'ar-JO' : locale === 'fr' ? 'fr-FR' : 'en-US', { month: 'short', day: 'numeric' })} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={(v) => `${v}`} />
              <Tooltip formatter={(v: any) => formatCurrency(v)}
                contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: '8px', fontSize: '12px' }} />
              <Area type="monotone" dataKey="revenue" stroke="var(--brand)" fill="var(--brand-subtle)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top items */}
        <div className="card p-5">
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '13px', letterSpacing: '0.06em', color: 'var(--text-primary)', marginBottom: '16px' }}>
            {t('topItems')}
          </h2>
          <div className="space-y-3">
            {topItems.map((item, i) => (
              <div key={item.menuItemId} className="flex items-center gap-3">
                <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', width: '16px' }}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }} className="truncate">
                    {item.name}
                  </p>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.totalQuantity} {t('sold')}</p>
                </div>
                <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--brand)', fontFamily: 'var(--font-mono)' }}>
                  {formatCurrency(item.totalRevenue)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Active orders */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '13px', letterSpacing: '0.06em', color: 'var(--text-primary)' }}>
            {t('activeOrders')} ({activeOrders.length})
          </h2>
          <Link href="/admin/orders" style={{ fontSize: '12px', color: 'var(--brand)', fontFamily: 'var(--font-mono)' }}>
            {t('viewAll')} →
          </Link>
        </div>

        {activeOrders.length === 0 ? (
          <div className="text-center py-10">
            <ChefHat size={40} style={{ color: 'var(--text-disabled)', margin: '0 auto 8px' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{t('noOrders')}</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeOrders.map((order) => {
              const cfg = ORDER_STATUS_CONFIG[order.status];
              return (
                <div key={order.id} className="rounded-xl p-4" style={{ border: '1.5px solid var(--border-default)', background: 'var(--bg-elevated)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: '700', color: 'var(--text-primary)' }}>
                      {order.orderNumber}
                    </span>
                    <span className="badge" style={{ background: `${cfg.color}15`, color: cfg.color, border: `1px solid ${cfg.color}30` }}>
                      {cfg.icon} {t(order.status as any) || cfg.label}
                    </span>
                  </div>
                  <p style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '13px' }}>
                    {t('table')} {order.table?.number}
                  </p>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>
                    {order.items?.length} {t('items')} · {formatCurrency(order.total)}
                  </p>
                  <p style={{ fontSize: '11px', color: 'var(--text-disabled)', marginTop: '3px', fontFamily: 'var(--font-mono)' }}>
                    {formatRelativeTime(order.createdAt)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}