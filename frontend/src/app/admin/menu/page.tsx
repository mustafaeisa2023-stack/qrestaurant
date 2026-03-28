'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit3, Trash2, Eye, EyeOff, Upload, ChevronDown, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import Image from 'next/image';
import { useDropzone } from 'react-dropzone';
import { menuService } from '@/lib/services';
import { formatCurrency, cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import type { Category, MenuItem } from '@/types';

export default function MenuPage() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'categories' | 'items'>('categories');
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [editItem, setEditItem] = useState<MenuItem | null>(null);
  const [showCatForm, setShowCatForm] = useState(false);
  const [showItemForm, setShowItemForm] = useState(false);
  const [selectedCatForItem, setSelectedCatForItem] = useState<string>('');

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn:  () => menuService.getCategories(false),
  });

  const { mutate: toggleAvailability } = useMutation({
    mutationFn: menuService.toggleAvailability,
    onSuccess: () => { toast.success(t('update')); queryClient.invalidateQueries({ queryKey: ['admin-categories'] }); },
  });

  const { mutate: deleteCategory } = useMutation({
    mutationFn: menuService.deleteCategory,
    onSuccess: () => { toast.success(t('deleteItem')); queryClient.invalidateQueries({ queryKey: ['admin-categories'] }); },
    onError:   () => toast.error('Failed to delete'),
  });

  const { mutate: deleteItem } = useMutation({
    mutationFn: menuService.deleteItem,
    onSuccess: () => { toast.success(t('deleteItem')); queryClient.invalidateQueries({ queryKey: ['admin-categories'] }); },
    onError:   () => toast.error('Failed to delete'),
  });

  const allItems = categories.flatMap(c => (c.items || []).map(i => ({ ...i, categoryName: c.name })));

  const TABS = [
    { value: 'categories', label: t('categories') },
    { value: 'items',      label: t('items') },
  ] as const;

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', letterSpacing: '0.06em', color: 'var(--text-primary)' }}>
            {t('menu')}
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px', fontFamily: 'var(--font-mono)' }}>
            {categories.length} {t('categories')} · {allItems.length} {t('items')}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setEditCategory(null); setShowCatForm(true); }} className="btn-secondary flex items-center gap-2 py-2">
            <Plus size={15} /> {t('addCategory')}
          </button>
          <button onClick={() => { setEditItem(null); setShowItemForm(true); }} className="btn-primary flex items-center gap-2 py-2">
            <Plus size={15} /> {t('addItem')}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-inset)' }}>
        {TABS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setActiveTab(value)}
            style={{
              padding: '6px 16px', borderRadius: '8px', fontSize: '12px',
              fontFamily: 'var(--font-display)', letterSpacing: '0.05em', cursor: 'pointer', transition: 'all 0.15s',
              background:  activeTab === value ? 'var(--bg-surface)' : 'transparent',
              color:       activeTab === value ? 'var(--text-primary)' : 'var(--text-muted)',
              border:      activeTab === value ? '1px solid var(--border-default)' : '1px solid transparent',
              boxShadow:   activeTab === value ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 shimmer rounded-2xl" />)}</div>
      ) : activeTab === 'categories' ? (
        <div className="space-y-3">
          {categories.map((cat) => (
            <div key={cat.id} className="card overflow-hidden">
              <div
                className="flex items-center gap-3 p-4 cursor-pointer transition-colors"
                style={{ background: 'transparent' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                onClick={() => setExpandedCat(expandedCat === cat.id ? null : cat.id)}
              >
                {cat.imageUrl && (
                  <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 relative" style={{ background: 'var(--bg-inset)' }}>
                    <Image src={cat.imageUrl} alt={cat.name} fill className="object-cover" sizes="40px" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '14px' }}>{cat.name}</p>
                    {!cat.isActive && (
                      <span className="badge" style={{ background: 'var(--bg-inset)', color: 'var(--text-muted)' }}>
                        {t('inactive')}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {cat._count?.items ?? cat.items?.length ?? 0} {t('items')}
                  </p>
                </div>
                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                  <button onClick={() => { setEditCategory(cat); setShowCatForm(true); }}
                    className="p-2 rounded-xl transition-colors" style={{ color: '#2563eb', background: 'rgba(37,99,235,0.06)' }}>
                    <Edit3 size={14} />
                  </button>
                  <button onClick={() => { setSelectedCatForItem(cat.id); setEditItem(null); setShowItemForm(true); }}
                    className="p-2 rounded-xl transition-colors" style={{ color: '#16a34a', background: 'rgba(22,163,74,0.06)' }}>
                    <Plus size={14} />
                  </button>
                  <button onClick={() => { if (confirm(`${t('delete')} "${cat.name}"?`)) deleteCategory(cat.id); }}
                    className="p-2 rounded-xl transition-colors" style={{ color: '#dc2626', background: 'rgba(220,38,38,0.06)' }}>
                    <Trash2 size={14} />
                  </button>
                  {expandedCat === cat.id
                    ? <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />
                    : <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />}
                </div>
              </div>

              {expandedCat === cat.id && cat.items && cat.items.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border-subtle)' }}>
                  {cat.items.map((item) => (
                    <ItemRow key={item.id} item={item}
                      onEdit={() => { setEditItem(item); setShowItemForm(true); }}
                      onDelete={() => { if (confirm(`${t('delete')} "${item.name}"?`)) deleteItem(item.id); }}
                      onToggle={() => toggleAvailability(item.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="card overflow-hidden">
          {allItems.length === 0 ? (
            <div className="p-12 text-center" style={{ color: 'var(--text-muted)' }}>
              No {t('items')} yet
            </div>
          ) : (
            allItems.map((item) => (
              <ItemRow key={item.id} item={item}
                onEdit={() => { setEditItem(item); setShowItemForm(true); }}
                onDelete={() => { if (confirm(`${t('delete')} "${item.name}"?`)) deleteItem(item.id); }}
                onToggle={() => toggleAvailability(item.id)}
              />
            ))
          )}
        </div>
      )}

      {showCatForm && (
        <CategoryFormModal
          category={editCategory}
          onClose={() => { setShowCatForm(false); setEditCategory(null); }}
          onSaved={() => { setShowCatForm(false); setEditCategory(null); queryClient.invalidateQueries({ queryKey: ['admin-categories'] }); }}
        />
      )}

      {showItemForm && (
        <ItemFormModal
          item={editItem}
          categories={categories}
          defaultCategoryId={selectedCatForItem}
          onClose={() => { setShowItemForm(false); setEditItem(null); setSelectedCatForItem(''); }}
          onSaved={() => { setShowItemForm(false); setEditItem(null); setSelectedCatForItem(''); queryClient.invalidateQueries({ queryKey: ['admin-categories'] }); }}
        />
      )}
    </div>
  );
}

// ── Item Row ──────────────────────────────────────────────

function ItemRow({ item, onEdit, onDelete, onToggle }: {
  item: MenuItem & { categoryName?: string };
  onEdit: () => void; onDelete: () => void; onToggle: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-3 px-4 py-3 transition-colors"
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
      <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 relative" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}>
        {item.imageUrl
          ? <Image src={item.imageUrl} alt={item.name} fill className="object-cover" sizes="48px" />
          : <div className="w-full h-full flex items-center justify-center" style={{ fontSize: '18px', opacity: 0.3 }}>🎯</div>
        }
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p style={{ fontWeight: '600', fontSize: '13px', color: 'var(--text-primary)' }} className="truncate">{item.name}</p>
          {item.isFeatured && (
            <span className="badge" style={{ background: 'rgba(217,119,6,0.1)', color: '#d97706', borderColor: 'rgba(217,119,6,0.25)', fontSize: '10px' }}>
              ★ {t('featured')}
            </span>
          )}
          {!item.isAvailable && (
            <span className="badge" style={{ fontSize: '10px' }}>{t('unavailable')}</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span style={{ color: 'var(--brand)', fontSize: '13px', fontWeight: '700', fontFamily: 'var(--font-mono)' }}>
            {formatCurrency(item.discountPrice ?? item.price)}
          </span>
          {item.discountPrice && (
            <span style={{ fontSize: '11px', color: 'var(--text-disabled)', textDecoration: 'line-through', fontFamily: 'var(--font-mono)' }}>
              {formatCurrency(item.price)}
            </span>
          )}
          {(item as any).categoryName && (
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>· {(item as any).categoryName}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button onClick={onToggle} className="p-1.5 rounded-lg transition-colors"
          style={{ color: item.isAvailable ? '#16a34a' : 'var(--text-disabled)', background: item.isAvailable ? 'rgba(22,163,74,0.06)' : 'var(--bg-inset)' }}>
          {item.isAvailable ? <Eye size={14} /> : <EyeOff size={14} />}
        </button>
        <button onClick={onEdit} className="p-1.5 rounded-lg transition-colors"
          style={{ color: '#2563eb', background: 'rgba(37,99,235,0.06)' }}>
          <Edit3 size={14} />
        </button>
        <button onClick={onDelete} className="p-1.5 rounded-lg transition-colors"
          style={{ color: '#dc2626', background: 'rgba(220,38,38,0.06)' }}>
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

// ── Category Form Modal ───────────────────────────────────

function CategoryFormModal({ category, onClose, onSaved }: {
  category: Category | null; onClose: () => void; onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    name: category?.name ?? '', nameAr: category?.nameAr ?? '', nameFr: category?.nameFr ?? '',
    description: category?.description ?? '', sortOrder: category?.sortOrder ?? 0, isActive: category?.isActive ?? true,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      if (category) { await menuService.updateCategory(category.id, form); toast.success(t('update')); }
      else           { await menuService.createCategory(form);             toast.success(t('addCategory')); }
      onSaved();
    } catch (err: any) { toast.error(err?.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="rounded-3xl w-full max-w-md shadow-modal overflow-y-auto" style={{ background: 'var(--bg-surface)', border: '1.5px solid var(--border-default)', maxHeight: '90vh' }}>
        <div className="p-5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', letterSpacing: '0.06em' }}>
            {category ? t('editCategory') : t('addCategory')}
          </h3>
          <button onClick={onClose} style={{ color: 'var(--text-muted)', padding: '6px', borderRadius: '8px', cursor: 'pointer' }}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {t('name')} (EN) *
            </label>
            <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {t('nameAr')}
              </label>
              <input value={form.nameAr} onChange={e => setForm(f => ({ ...f, nameAr: e.target.value }))} className="input" dir="rtl" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {t('nameFr')}
              </label>
              <input value={form.nameFr} onChange={e => setForm(f => ({ ...f, nameFr: e.target.value }))} className="input" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {t('description')}
            </label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="input resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {t('sortOrder')}
              </label>
              <input type="number" min="0" value={form.sortOrder}
                onChange={e => setForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))} className="input" />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isActive}
                  onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                  className="w-4 h-4 rounded" style={{ accentColor: 'var(--brand)' }} />
                <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{t('active')}</span>
              </label>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 py-2.5">{t('cancel')}</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 py-2.5">
              {saving ? t('loading') : category ? t('update') : t('create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Item Form Modal ───────────────────────────────────────

function ItemFormModal({ item, categories, defaultCategoryId, onClose, onSaved }: {
  item: MenuItem | null; categories: Category[];
  defaultCategoryId?: string; onClose: () => void; onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    categoryId: item?.categoryId ?? defaultCategoryId ?? categories[0]?.id ?? '',
    name: item?.name ?? '', nameAr: item?.nameAr ?? '', nameFr: item?.nameFr ?? '',
    description: item?.description ?? '', descriptionAr: item?.descriptionAr ?? '',
    price: item?.price ?? '', discountPrice: item?.discountPrice ?? '',
    calories: item?.calories ?? '', preparationTime: item?.preparationTime ?? '',
    tags: (item?.tags ?? []).join(', '), allergens: (item?.allergens ?? []).join(', '),
    isAvailable: item?.isAvailable ?? true, isFeatured: item?.isFeatured ?? false,
    sortOrder: item?.sortOrder ?? 0, imageUrl: item?.imageUrl ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]; if (!file) return;
    setUploading(true);
    try {
      const result = await menuService.uploadItemImage(file);
      setForm(f => ({ ...f, imageUrl: result.url }));
      toast.success('Image uploaded');
    } catch { toast.error('Upload failed'); }
    finally { setUploading(false); }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'image/*': [] }, maxFiles: 1, maxSize: 5 * 1024 * 1024,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = {
        ...form,
        price: parseFloat(String(form.price)),
        discountPrice: form.discountPrice ? parseFloat(String(form.discountPrice)) : undefined,
        calories: form.calories ? parseInt(String(form.calories)) : undefined,
        preparationTime: form.preparationTime ? parseInt(String(form.preparationTime)) : undefined,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        allergens: form.allergens ? form.allergens.split(',').map(a => a.trim()).filter(Boolean) : [],
        imageUrl: form.imageUrl || undefined,
      };
      if (item) { await menuService.updateItem(item.id, payload); toast.success(t('update')); }
      else       { await menuService.createItem(payload);          toast.success(t('addItem')); }
      onSaved();
    } catch (err: any) { toast.error(err?.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="rounded-3xl w-full max-w-lg shadow-modal overflow-y-auto" style={{ background: 'var(--bg-surface)', border: '1.5px solid var(--border-default)', maxHeight: '90vh' }}>
        <div className="p-5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', letterSpacing: '0.06em' }}>
            {item ? t('editItem') : t('addItem')}
          </h3>
          <button onClick={onClose} style={{ color: 'var(--text-muted)', padding: '6px', borderRadius: '8px', cursor: 'pointer' }}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">

          {/* Image */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              Image
            </label>
            <div {...getRootProps()} className="rounded-xl p-4 text-center cursor-pointer transition-colors"
              style={{ border: `2px dashed ${isDragActive ? 'var(--brand)' : 'var(--border-default)'}`, background: isDragActive ? 'var(--brand-subtle)' : 'transparent' }}>
              <input {...getInputProps()} />
              {form.imageUrl ? (
                <div className="relative w-full h-28">
                  <Image src={form.imageUrl} alt="Preview" fill className="object-cover rounded-lg" />
                </div>
              ) : (
                <div className="py-4">
                  <Upload size={22} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    {uploading ? t('loading') : 'Drop image or click to upload'}
                  </p>
                  <p style={{ fontSize: '11px', color: 'var(--text-disabled)', marginTop: '4px' }}>
                    Max 5MB · JPG, PNG, WebP
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {t('categories')} *
            </label>
            <select required value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))} className="input">
              <option value="">Select…</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {t('name')} (EN) *
            </label>
            <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{t('nameAr')}</label>
              <input value={form.nameAr} onChange={e => setForm(f => ({ ...f, nameAr: e.target.value }))} className="input" dir="rtl" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{t('nameFr')}</label>
              <input value={form.nameFr} onChange={e => setForm(f => ({ ...f, nameFr: e.target.value }))} className="input" />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{t('description')}</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="input resize-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {t('description')} (AR)
            </label>
            <textarea value={form.descriptionAr} onChange={e => setForm(f => ({ ...f, descriptionAr: e.target.value }))} rows={2} className="input resize-none" dir="rtl" />
          </div>

          {/* Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {t('price')} *
              </label>
              <input type="number" required min="0" step="0.01"
                value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {t('discountPrice')}
              </label>
              <input type="number" min="0" step="0.01"
                value={form.discountPrice} onChange={e => setForm(f => ({ ...f, discountPrice: e.target.value }))} className="input" />
            </div>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {t('calories')}
              </label>
              <input type="number" min="0" value={form.calories}
                onChange={e => setForm(f => ({ ...f, calories: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {t('preparationTime')}
              </label>
              <input type="number" min="0" value={form.preparationTime}
                onChange={e => setForm(f => ({ ...f, preparationTime: e.target.value }))} className="input" />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {t('tags')} (comma-separated)
            </label>
            <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
              placeholder="vegetarian, vegan, gluten-free" className="input" />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {t('allergens')} (comma-separated)
            </label>
            <input value={form.allergens} onChange={e => setForm(f => ({ ...f, allergens: e.target.value }))}
              placeholder="gluten, dairy, eggs, nuts" className="input" />
          </div>

          {/* Flags */}
          <div className="flex gap-5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isAvailable}
                onChange={e => setForm(f => ({ ...f, isAvailable: e.target.checked }))}
                className="w-4 h-4 rounded" style={{ accentColor: 'var(--brand)' }} />
              <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{t('available_items')}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isFeatured}
                onChange={e => setForm(f => ({ ...f, isFeatured: e.target.checked }))}
                className="w-4 h-4 rounded" style={{ accentColor: 'var(--brand)' }} />
              <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{t('featured')}</span>
            </label>
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 py-2.5">{t('cancel')}</button>
            <button type="submit" disabled={saving || uploading} className="btn-primary flex-1 py-2.5">
              {saving ? t('loading') : item ? t('update') : t('create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}