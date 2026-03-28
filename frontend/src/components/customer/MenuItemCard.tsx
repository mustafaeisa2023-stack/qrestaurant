'use client';

import Image from 'next/image';
import { Plus } from 'lucide-react';
import { cn, formatCurrency, getItemName } from '@/lib/utils';
import type { MenuItem } from '@/types';

const TAG_CONFIG: Record<string, { label: string; color: string }> = {
  vegetarian:    { label: 'Veg',    color: '#16a34a' },
  vegan:         { label: 'Vegan',  color: '#16a34a' },
  'gluten-free': { label: 'GF',     color: '#d97706' },
  spicy:         { label: 'Spicy',  color: '#dc2626' },
  popular:       { label: 'Top',    color: '#7c3aed' },
};

interface Props {
  item: MenuItem;
  locale: string;
  onSelect: () => void;
  onQuickAdd: () => void;
}

export default function MenuItemCard({ item, locale, onSelect, onQuickAdd }: Props) {
  const name = getItemName(item, locale);
  const price = item.discountPrice ?? item.price;

  return (
    <div
      onClick={onSelect}
      className={cn('card card-hover tactical-corners flex gap-3 p-3 cursor-pointer', !item.isAvailable && 'opacity-50')}
    >
      {/* Image */}
      <div
        className="relative w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden"
        style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}
      >
        {item.imageUrl ? (
          <Image src={item.imageUrl} alt={name} fill className="object-cover" sizes="96px" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl" style={{ opacity: 0.3 }}>🎯</div>
        )}
        {!item.isAvailable && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(2px)' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '10px', color: '#f87171', letterSpacing: '0.1em' }}>
              SOLD OUT
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1.5">
              {item.tags.slice(0, 2).map((tag) => {
                const cfg = TAG_CONFIG[tag];
                if (!cfg) return null;
                return (
                  <span key={tag} className="badge" style={{ color: cfg.color, borderColor: `${cfg.color}35`, background: `${cfg.color}12` }}>
                    {cfg.label}
                  </span>
                );
              })}
            </div>
          )}

          <h3 className="line-clamp-1" style={{ fontFamily: 'var(--font-body)', fontWeight: '600', fontSize: '14px', color: 'var(--text-primary)', lineHeight: '1.3', marginBottom: '3px' }}>
            {name}
          </h3>

          {item.description && (
            <p className="line-clamp-2" style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              {item.description}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between mt-2">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--brand)', fontSize: '14px', fontWeight: '700' }}>
                {formatCurrency(price)}
              </span>
              {item.discountPrice && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-disabled)', textDecoration: 'line-through' }}>
                  {formatCurrency(item.price)}
                </span>
              )}
            </div>
            {item.calories && (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                {item.calories} kcal
              </p>
            )}
          </div>

          {item.isAvailable && (
            <button
              onClick={(e) => { e.stopPropagation(); onQuickAdd(); }}
              className="transition-all active:scale-90"
              style={{ width: '34px', height: '34px', borderRadius: '8px', border: '2px solid var(--brand)', background: 'var(--brand)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}
            >
              <Plus size={17} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
