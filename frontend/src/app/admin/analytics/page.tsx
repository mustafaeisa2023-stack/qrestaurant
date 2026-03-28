'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { analyticsService } from '@/lib/services';
import { formatCurrency, ORDER_STATUS_CONFIG, TABLE_STATUS_CONFIG } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';

const CHART_COLORS = ['#a855f7', '#2563eb', '#16a34a', '#d97706', '#dc2626', '#0891b2', '#7c3aed'];

export default function AnalyticsPage() {
  const { t, locale } = useTranslation();
  const [revenueDays, setRevenueDays] = useState(7);

  const { data: dashboard } = useQuery({
    queryKey: ['dashboard'],
    queryFn:  analyticsService.getDashboard,
    refetchInterval: 60_000,
  });

  const { data: revenue = [], isLoading: revenueLoading } = useQuery({
    queryKey: ['revenue', revenueDays],
    queryFn:  () => analyticsService.getRevenue(revenueDays),
  });

  const { data: topItems = [] } = useQuery({
    queryKey: ['top-items'],
    queryFn:  () => analyticsService.getTopItems(8),
  });

  const { data: statusBreakdown = [] } = useQuery({
    queryKey: ['status-breakdown'],
    queryFn:  analyticsService.getStatusBreakdown,
  });

  const { data: tableAnalytics = [] } = useQuery({
    queryKey: ['table-analytics'],
    queryFn:  analyticsService.getTableAnalytics,
  });

  const pieData = statusBreakdown.map(({ status, count }) => ({
    name: t(status as any) || ORDER_STATUS_CONFIG[status]?.label || status,
    value: count,
  }));

  const kpis = [
    { label: t('totalRevenue'),   value: formatCurrency(dashboard?.today.revenue ?? 0),       icon: '💰', sub: `${dashboard?.today.totalOrders ?? 0} ${t('orders')}` },
    { label: 'Avg Order Value',   value: formatCurrency(dashboard?.today.avgOrderValue ?? 0),  icon: '📊', sub: 'today' },
    { label: 'Items Sold Today',  value: dashboard?.today.itemsSold ?? 0,                      icon: '🍽️', sub: t('items') },
    { label: 'Tables Occupied',   value: dashboard?.live.tablesOccupied ?? 0,                  icon: '🪑', sub: 'live' },
  ];

  const tooltipStyle = {
    borderRadius: '10px',
    border: '1px solid var(--border-default)',
    background: 'var(--bg-surface)',
    color: 'var(--text-primary)',
    fontSize: '12px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', letterSpacing: '0.06em', color: 'var(--text-primary)' }}>
          {t('analytics')}
        </h1>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>
          Performance overview and insights
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(({ label, value, icon, sub }) => (
          <div key={label} className="card p-4">
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>{icon}</div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontFamily: 'var(--font-mono)' }}>
              {label}
            </p>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '20px', color: 'var(--text-primary)', letterSpacing: '0.04em' }}>
              {value}
            </p>
            <p style={{ fontSize: '11px', color: 'var(--text-disabled)', marginTop: '3px', fontFamily: 'var(--font-mono)' }}>
              {sub}
            </p>
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-5">
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '14px', letterSpacing: '0.06em', color: 'var(--text-primary)' }}>
            {t('totalRevenue')}
          </h2>
          <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--bg-inset)' }}>
            {[7, 14, 30].map((d) => (
              <button key={d} onClick={() => setRevenueDays(d)}
                style={{
                  padding: '4px 10px', borderRadius: '6px', fontSize: '11px',
                  fontFamily: 'var(--font-mono)', cursor: 'pointer', transition: 'all 0.15s',
                  background:   revenueDays === d ? 'var(--brand)'       : 'transparent',
                  color:        revenueDays === d ? 'white'              : 'var(--text-muted)',
                  border:       revenueDays === d ? '1px solid var(--brand)' : '1px solid transparent',
                }}>
                {d}d
              </button>
            ))}
          </div>
        </div>
        {revenueLoading ? (
          <div className="h-48 shimmer rounded-xl" />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenue} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#a855f7" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false}
                tickFormatter={(v) => new Date(v).toLocaleDateString('en', { month: 'short', day: 'numeric' })} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} width={48}
                tickFormatter={(v) => `${v}`} />
              <Tooltip formatter={(v: number) => [formatCurrency(v), t('totalRevenue')]}
                labelFormatter={(l) => new Date(l).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}
                contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="revenue" stroke="#a855f7" strokeWidth={2}
                fill="url(#revGrad)" dot={false} activeDot={{ r: 5, fill: '#a855f7' }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">

        {/* Top items */}
        <div className="card p-5">
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '14px', letterSpacing: '0.06em', color: 'var(--text-primary)', marginBottom: '16px' }}>
            Top {t('items')}
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topItems.slice(0, 6)} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
              <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} width={110} />
              <Tooltip formatter={(v: number) => [v, 'Qty']} contentStyle={tooltipStyle} />
              <Bar dataKey="totalQuantity" radius={[0, 6, 6, 0]}>
                {topItems.slice(0, 6).map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div className="card p-5">
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '14px', letterSpacing: '0.06em', color: 'var(--text-primary)', marginBottom: '16px' }}>
            {t('orders')} — {t('status')}
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', color: 'var(--text-secondary)' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table analytics */}
      <div className="card overflow-hidden">
        <div className="p-5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '14px', letterSpacing: '0.06em', color: 'var(--text-primary)' }}>
            {t('tables')} Performance
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full" style={{ fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-elevated)' }}>
                {[t('table'), t('floor'), t('status'), t('orders'), t('totalRevenue'), 'Avg'].map(h => (
                  <th key={h} className="text-left px-4 py-3 whitespace-nowrap"
                    style={{ fontSize: '11px', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableAnalytics.slice(0, 10).map((row: any) => {
                const sc = TABLE_STATUS_CONFIG[row.status as keyof typeof TABLE_STATUS_CONFIG];
                return (
                  <tr key={row.id} style={{ borderTop: '1px solid var(--border-subtle)' }}
                    className="transition-colors" onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td className="px-4 py-3" style={{ fontWeight: '600', color: 'var(--text-primary)', fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}>
                      {t('table')} {row.number}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                      {row.floor}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5">
                        <span className={`status-dot ${sc?.dot}`} />
                        <span style={{ fontSize: '12px', fontWeight: '500', color: sc?.color }}>
                          {t(row.status.toLowerCase() as any) || sc?.label}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3" style={{ fontWeight: '600', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                      {row.totalOrders}
                    </td>
                    <td className="px-4 py-3" style={{ fontWeight: '700', color: 'var(--brand)', fontFamily: 'var(--font-mono)' }}>
                      {formatCurrency(row.totalRevenue)}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {formatCurrency(row.avgOrderValue)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}