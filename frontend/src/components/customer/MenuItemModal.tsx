'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { X, Plus, Minus, Clock, Flame } from 'lucide-react';
import { cn, formatCurrency, getItemName, TAG_COLORS } from '@/lib/utils';
import type { MenuItem } from '@/types';

interface Props {
  item: MenuItem | null;
  locale: string;
  onClose: () => void;
  onAdd: (item: MenuItem, quantity: number, note?: string) => void;
}

const ALLERGEN_ICONS: Record<string, string> = {
  gluten: '🌾', dairy: '🥛', eggs: '🥚', fish: '🐟',
  seafood: '🦐', nuts: '🥜', soy: '🫘', sulfites: '🍷',
};

export default function MenuItemModal({ item, locale, onClose, onAdd }: Props) {
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (item) { setQuantity(1); setNote(''); }
  }, [item?.id]);

  useEffect(() => {
    if (item) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [item]);

  if (!item) return null;

  const name = getItemName(item, locale);
  const effectivePrice = item.discountPrice ?? item.price;
  const total = effectivePrice * quantity;

  return (
    <AnimatePresence>
      {item && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[90dvh] overflow-y-auto bg-white dark:bg-gray-900 rounded-t-3xl"
          >
            {/* Image */}
            <div className="relative h-56 bg-gray-100 dark:bg-gray-800">
              {item.imageUrl ? (
                <Image src={item.imageUrl} alt={name} fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-6xl">🍽️</div>
              )}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-9 h-9 bg-black/40 backdrop-blur-sm text-white rounded-full flex items-center justify-center hover:bg-black/60 transition-colors"
              >
                <X size={18} />
              </button>
              {item.discountPrice && (
                <span className="absolute top-4 left-4 badge bg-red-500 text-white text-xs">
                  Sale
                </span>
              )}
            </div>

            {/* Content */}
            <div className="p-5 pb-safe">
              {/* Tags */}
              {item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {item.tags.map((tag) => (
                    <span key={tag} className={cn('badge', TAG_COLORS[tag] || 'bg-gray-100 text-gray-600')}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <h2 className="font-display font-bold text-xl mb-1">{name}</h2>

              {/* Meta */}
              <div className="flex items-center gap-3 mb-3">
                {item.calories && (
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Flame size={12} className="text-orange-400" />
                    {item.calories} cal
                  </span>
                )}
                {item.preparationTime && (
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock size={12} />
                    {item.preparationTime} min
                  </span>
                )}
              </div>

              {item.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                  {item.description}
                </p>
              )}

              {/* Allergens */}
              {item.allergens.length > 0 && (
                <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1.5">Allergens</p>
                  <div className="flex flex-wrap gap-2">
                    {item.allergens.map((a) => (
                      <span key={a} className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        {ALLERGEN_ICONS[a] || '⚠️'} {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Special instructions */}
              <div className="mb-5">
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                  Special Instructions (optional)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="E.g. no onions, extra sauce..."
                  rows={2}
                  className="input resize-none text-sm"
                  maxLength={200}
                />
              </div>

              {/* Quantity + Add */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
                  <button
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="w-9 h-9 rounded-lg bg-white dark:bg-gray-700 shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-50"
                    disabled={quantity <= 1}
                  >
                    <Minus size={16} />
                  </button>
                  <span className="w-8 text-center font-bold text-lg">{quantity}</span>
                  <button
                    onClick={() => setQuantity(q => q + 1)}
                    className="w-9 h-9 rounded-lg bg-white dark:bg-gray-700 shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                <button
                  onClick={() => onAdd(item, quantity, note || undefined)}
                  disabled={!item.isAvailable}
                  className="flex-1 btn-primary flex items-center justify-between py-3"
                >
                  <span>Add to Cart</span>
                  <span>{formatCurrency(total)}</span>
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
