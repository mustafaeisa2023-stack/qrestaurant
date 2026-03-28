'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { X, Plus, Minus, Trash2, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCartStore } from '@/stores';
import { ordersService } from '@/lib/services';
import { formatCurrency } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onOrderPlaced: (orderNumber: string) => void;
}

export default function CartPanel({ isOpen, onClose, onOrderPlaced }: Props) {
  const { t } = useTranslation();

  // Individual selectors – each re-renders only on its own slice change
  const items        = useCartStore((s) => s.items);
  const tableId      = useCartStore((s) => s.tableId);
  const sessionId    = useCartStore((s) => s.sessionId);
  const subtotal     = useCartStore((s) => s.subtotal);
  const removeItem   = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const clearCart    = useCartStore((s) => s.clearCart);

  const [orderNote, setOrderNote] = useState('');
  const [isPlacing, setIsPlacing] = useState(false);

  const tax   = subtotal * 0.1;
  const total = subtotal + tax;

  const handlePlaceOrder = async () => {
    if (!tableId) { toast.error('Table not identified. Please re-scan the QR code.'); return; }
    if (!items.length) { toast.error('Your cart is empty'); return; }

    setIsPlacing(true);
    try {
      const order = await ordersService.placeOrder({
        tableId,
        sessionId: sessionId || undefined,
        items: items.map((i) => ({
          menuItemId: i.menuItem.id,
          quantity: i.quantity,
          note: i.note,
        })),
        customerNote: orderNote || undefined,
      });

      clearCart();
      setOrderNote('');
      onOrderPlaced(order.orderNumber);
      toast.success('Order placed! 🎉');
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'Failed to place order. Please try again.');
    } finally {
      setIsPlacing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 350 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-white dark:bg-gray-900 z-50 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
              <div>
                <h2 className="font-display font-bold text-lg">{t('yourCart')}</h2>
                <p className="text-xs text-gray-500">
                  {items.reduce((s, i) => s + i.quantity, 0)} item(s)
                </p>
              </div>
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Items list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-16">
                  <div className="text-5xl mb-4">🛒</div>
                  <p className="font-semibold text-gray-700 dark:text-gray-300">{t('emptyCart')}</p>
                  <p className="text-sm text-gray-500 mt-1">{t('emptyCartSub')}</p>
                </div>
              ) : (
                items.map((cartItem) => {
                  const effectivePrice = cartItem.menuItem.discountPrice ?? cartItem.menuItem.price;
                  return (
                    <div key={cartItem.menuItem.id} className="card p-3">
                      <div className="flex gap-3">
                        {/* Thumbnail */}
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0 relative">
                          {cartItem.menuItem.imageUrl ? (
                            <Image src={cartItem.menuItem.imageUrl} alt={cartItem.menuItem.name} fill className="object-cover" sizes="64px" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xl">🍽️</div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm leading-snug truncate">{cartItem.menuItem.name}</p>
                          <p className="text-brand-600 dark:text-brand-400 text-sm font-bold mt-0.5">
                            {formatCurrency(effectivePrice * cartItem.quantity)}
                          </p>
                          {cartItem.note && (
                            <p className="text-xs text-gray-400 mt-0.5 italic truncate">{cartItem.note}</p>
                          )}
                        </div>
                      </div>

                      {/* Quantity controls */}
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
                          <button
                            onClick={() => updateQuantity(cartItem.menuItem.id, cartItem.quantity - 1)}
                            className="w-7 h-7 rounded-md bg-white dark:bg-gray-700 flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors"
                          >
                            <Minus size={13} />
                          </button>
                          <span className="w-6 text-center text-sm font-bold">{cartItem.quantity}</span>
                          <button
                            onClick={() => updateQuantity(cartItem.menuItem.id, cartItem.quantity + 1)}
                            className="w-7 h-7 rounded-md bg-white dark:bg-gray-700 flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors"
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                        <button
                          onClick={() => removeItem(cartItem.menuItem.id)}
                          className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Order-level note */}
              {items.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Order Notes</label>
                  <textarea
                    value={orderNote}
                    onChange={(e) => setOrderNote(e.target.value)}
                    placeholder={t('addNote')}
                    rows={2}
                    className="input resize-none text-sm"
                    maxLength={500}
                  />
                </div>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="border-t border-gray-100 dark:border-gray-800 p-4 space-y-3 flex-shrink-0">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                    <span>{t('subtotal')}</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                    <span>{t('tax')}</span>
                    <span>{formatCurrency(tax)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base pt-1.5 border-t border-gray-100 dark:border-gray-800">
                    <span>{t('total')}</span>
                    <span className="text-brand-600 dark:text-brand-400">{formatCurrency(total)}</span>
                  </div>
                </div>

                <button
                  onClick={handlePlaceOrder}
                  disabled={isPlacing}
                  className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 text-base"
                >
                  {isPlacing ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Placing Order…
                    </>
                  ) : (
                    <>
                      <span>{t('placeOrder')}</span>
                      <ChevronRight size={18} />
                    </>
                  )}
                </button>

                <p className="text-center text-xs text-gray-400">Payment at the table after your meal</p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
