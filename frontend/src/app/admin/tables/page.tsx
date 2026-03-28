'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, QrCode, RefreshCw, Trash2, Edit3, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { tablesService } from '@/lib/services';
import { cn, TABLE_STATUS_CONFIG } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import type { Table } from '@/types';

export default function TablesPage() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    }, 8000);
    return () => clearInterval(interval);
  }, [queryClient]);

  const [showForm, setShowForm] = useState(false);
  const [editTable, setEditTable] = useState<Table | null>(null);
  const [qrTable,   setQrTable]   = useState<Table | null>(null);

  const { data: tables = [], isLoading } = useQuery({
    queryKey: ['tables'],
    queryFn:  () => tablesService.getAll(),
    refetchInterval: 10_000,
  });

  const { mutate: deleteTable } = useMutation({
    mutationFn: tablesService.delete,
    onSuccess: () => { toast.success(t('deleteTable')); queryClient.invalidateQueries({ queryKey: ['tables'] }); },
    onError:   () => toast.error('Failed to delete table'),
  });

  const { mutate: regenQR, isPending: isRegenning } = useMutation({
    mutationFn: tablesService.regenerateQR,
    onSuccess: (updated) => {
      toast.success('QR code regenerated');
      setQrTable(updated);
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    },
  });

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', letterSpacing: '0.06em', color: 'var(--text-primary)' }}>
            {t('tables')}
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px', fontFamily: 'var(--font-mono)' }}>
            {tables.filter(t => t.isActive).length} {t('active')}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              if (!confirm(t('resetAll') + '?')) return;
              const all = await tablesService.getAll(true);
              await Promise.all(all.map(t => tablesService.updateStatus(t.id, 'AVAILABLE' as any)));
              queryClient.invalidateQueries({ queryKey: ['tables'] });
              toast.success(t('resetAll'));
            }}
            className="btn-secondary flex items-center gap-2 py-2"
          >
            ↺ {t('resetAll')}
          </button>
          <button
            onClick={() => { setEditTable(null); setShowForm(true); }}
            className="btn-primary flex items-center gap-2 py-2"
          >
            <Plus size={17} />
            {t('addTable')}
          </button>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-44 shimmer rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {tables.map((table) => {
            const statusCfg = TABLE_STATUS_CONFIG[table.status];
            return (
              <div key={table.id} className={cn('card p-4 flex flex-col', !table.isActive && 'opacity-50')}>

                {/* Status */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <span className={cn('status-dot', statusCfg.dot)} />
                    <span className="text-xs font-medium" style={{ color: statusCfg.color }}>
                      {t(table.status.toLowerCase() as any) || statusCfg.label}
                    </span>
                  </div>
                  {!table.isActive && (
                    <span className="badge" style={{ fontSize: '10px' }}>{t('inactive')}</span>
                  )}
                </div>

                {/* Number */}
                <div className="flex-1 text-center py-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-2"
                    style={{ background: 'var(--bg-inset)', border: '1.5px solid var(--border-default)' }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '18px', color: 'var(--text-primary)' }}>
                      {table.number}
                    </span>
                  </div>
                  <p style={{ fontWeight: '600', fontSize: '13px', color: 'var(--text-primary)' }}>{table.label}</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px', fontFamily: 'var(--font-mono)' }}>
                    {table.floor} · {table.capacity} {t('capacity')}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  <button
                    onClick={() => setQrTable(table)}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl text-xs transition-colors"
                    style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
                  >
                    <QrCode size={12} /> QR
                  </button>

                  <button
                    onClick={() => { setEditTable(table); setShowForm(true); }}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl text-xs transition-colors"
                    style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)', color: '#2563eb' }}
                  >
                    <Edit3 size={12} /> {t('edit')}
                  </button>

                  {table.status === 'OCCUPIED' && (
                    <button
                      onClick={async () => {
                        await tablesService.updateStatus(table.id, 'AVAILABLE');
                        queryClient.invalidateQueries({ queryKey: ['tables'] });
                        toast.success(`${t('table')} ${table.number} ${t('clearTable')}`);
                      }}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl text-xs transition-colors"
                      style={{ background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.2)', color: '#16a34a' }}
                    >
                      ✓ {t('clearTable')}
                    </button>
                  )}

                  <button
                    onClick={() => window.open(`http://localhost:3000/menu/${table.qrToken}`, '_blank')}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl text-xs transition-colors"
                    style={{ background: 'var(--brand-subtle)', border: '1px solid var(--brand-border)', color: 'var(--brand)' }}
                  >
                    🔗 {t('openMenu')}
                  </button>

                  <button
                    onClick={() => { if (confirm(`${t('delete')} ${t('table')} ${table.number}?`)) deleteTable(table.id); }}
                    className="py-1.5 px-2 rounded-xl text-xs transition-colors"
                    style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', color: '#dc2626' }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <TableFormModal
          table={editTable}
          onClose={() => { setShowForm(false); setEditTable(null); }}
          onSaved={() => { setShowForm(false); setEditTable(null); queryClient.invalidateQueries({ queryKey: ['tables'] }); }}
        />
      )}

      {qrTable && (
        <QRModal
          table={qrTable}
          onClose={() => setQrTable(null)}
          onRegenerate={() => regenQR(qrTable.id)}
          isRegenning={isRegenning}
        />
      )}
    </div>
  );
}

// ── Table Form Modal ──────────────────────────────────────

function TableFormModal({ table, onClose, onSaved }: {
  table: Table | null; onClose: () => void; onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    number:   table?.number   ?? '',
    label:    table?.label    ?? '',
    capacity: table?.capacity ?? 4,
    floor:    table?.floor    ?? 'Main Hall',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (table) {
        await tablesService.update(table.id, form as any);
        toast.success(t('update'));
      } else {
        await tablesService.create(form as any);
        toast.success(t('addTable'));
      }
      onSaved();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save table');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="rounded-3xl w-full max-w-sm shadow-modal" style={{ background: 'var(--bg-surface)', border: '1.5px solid var(--border-default)' }}>
        <div className="p-5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', letterSpacing: '0.06em' }}>
            {table ? t('editTable') : t('addTable')}
          </h3>
          <button onClick={onClose} className="p-2 rounded-xl transition-colors" style={{ color: 'var(--text-muted)' }}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {t('tableNumber')} *
            </label>
            <input type="number" required min="1"
              value={form.number} onChange={e => setForm(f => ({ ...f, number: parseInt(e.target.value) }))}
              className="input" />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {t('label')} *
            </label>
            <input type="text" required
              value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
              placeholder="Table 1" className="input" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {t('capacity')}
              </label>
              <input type="number" min="1" max="20"
                value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: parseInt(e.target.value) }))}
                className="input" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {t('floor')}
              </label>
              <input type="text"
                value={form.floor} onChange={e => setForm(f => ({ ...f, floor: e.target.value }))}
                placeholder="Main Hall" className="input" />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 py-2.5">{t('cancel')}</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 py-2.5">
              {saving ? t('loading') : table ? t('update') : t('create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── QR Modal ──────────────────────────────────────────────

function QRModal({ table, onClose, onRegenerate, isRegenning }: {
  table: Table; onClose: () => void; onRegenerate: () => void; isRegenning: boolean;
}) {
  const { t } = useTranslation();

  const downloadQR = () => {
    if (!table.qrCode) return;
    const link = document.createElement('a');
    link.href     = table.qrCode;
    link.download = `table-${table.number}-qr.png`;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="rounded-3xl w-full max-w-sm shadow-modal p-6 text-center" style={{ background: 'var(--bg-surface)', border: '1.5px solid var(--border-default)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="text-left">
            <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', letterSpacing: '0.06em' }}>
              {t('table')} {table.number}
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {table.label} · {table.floor}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl transition-colors" style={{ color: 'var(--text-muted)' }}>✕</button>
        </div>

        <div className="rounded-2xl p-4 inline-block mx-auto mb-4" style={{ background: 'white', border: '1px solid var(--border-subtle)' }}>
          {table.qrCode ? (
            <img src={table.qrCode} alt={`QR ${table.number}`} className="w-48 h-48" />
          ) : (
            <div className="w-48 h-48 flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>
              <QrCode size={48} />
            </div>
          )}
        </div>

        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px', fontFamily: 'var(--font-mono)' }}>
          Scan to open the menu
        </p>

        <div className="flex gap-2">
          <button onClick={onRegenerate} disabled={isRegenning} className="btn-secondary flex-1 flex items-center justify-center gap-2 py-2.5">
            <RefreshCw size={14} className={isRegenning ? 'animate-spin' : ''} />
            Regenerate
          </button>
          <button onClick={downloadQR} disabled={!table.qrCode} className="btn-primary flex-1 flex items-center justify-center gap-2 py-2.5">
            <Download size={14} />
            {t('save')}
          </button>
        </div>
      </div>
    </div>
  );
}