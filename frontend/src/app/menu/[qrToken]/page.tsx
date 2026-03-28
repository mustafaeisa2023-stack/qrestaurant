'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { ShoppingCart, Search, X, Star, Clock } from 'lucide-react';
import { menuService, tablesService } from '@/lib/services';
import { useCartStore } from '@/stores';
import { useTranslation } from '@/lib/i18n';
import { cn, formatCurrency, getItemName } from '@/lib/utils';
import type { MenuItem } from '@/types';
import CartPanel from '@/components/customer/CartPanel';
import LocaleSwitcher from '@/components/customer/LocaleSwitcher';
import ThemeToggle from '@/components/shared/ThemeToggle';
import MenuItemCard from '@/components/customer/MenuItemCard';
import MenuItemModal from '@/components/customer/MenuItemModal';
import OrderTracker from '@/components/customer/OrderTracker';
import Footer from '@/components/shared/Footer';


export default function MenuPage() {
  const params  = useParams();
  const qrToken = params.qrToken as string;
  const { t, locale, isRTL } = useTranslation();

  const addItem        = useCartStore((s) => s.addItem);
  const itemCount      = useCartStore((s) => s.itemCount);
  const subtotal       = useCartStore((s) => s.subtotal);
  const tableId        = useCartStore((s) => s.tableId);
  const setTableInfo   = useCartStore((s) => s.setTableInfo);

  const [activeCategory,    setActiveCategory]    = useState<string>('all');
  const [searchQuery,       setSearchQuery]       = useState('');
  const [selectedItem,      setSelectedItem]      = useState<MenuItem | null>(null);
  const [isCartOpen,        setIsCartOpen]        = useState(false);
  const [isSearchOpen,      setIsSearchOpen]      = useState(false);
  const [isTrackerOpen,     setIsTrackerOpen]     = useState(false);
  const [placedOrderNumber, setPlacedOrderNumber] = useState<string | null>(null);
  const [isOccupiedError,   setIsOccupiedError]   = useState(false);
  const [sessionChecking,   setSessionChecking]   = useState(true);

  const categoryRefs = useRef<Record<string, HTMLElement | null>>({});

  // ── Fetch table ───────────────────────────────────────────
  const { data: table, isError: tableError } = useQuery({
    queryKey: ['table', qrToken],
    queryFn:  () => tablesService.getByToken(qrToken),
    staleTime: Infinity,
    retry: 1,
  });

  // ── Session — ينشأ دايماً عند فتح الصفحة ─────────────────
  useEffect(() => {
    if (!table) return;

    setSessionChecking(true);
    tablesService.createSession(qrToken, sessionId || undefined)

      .then((session) => {
        setTableInfo(table.id, session.id, qrToken);
        setSessionChecking(false);
      })
      .catch((err) => {
        const status = err?.response?.status;
        const msg    = err?.response?.data?.message || '';
        if (status === 403 || msg.toLowerCase().includes('occupied')) {
          setIsOccupiedError(true);
        } else {
          setTableInfo(table.id, '', qrToken);
        }
        setSessionChecking(false);
      });
  }, [table?.id]);
  const sessionId = useCartStore((s) => s.sessionId);

  // ── Fetch menu ────────────────────────────────────────────
  const { data: categories = [], isLoading: menuLoading } = useQuery({
    queryKey: ['public-menu'],
    queryFn:  menuService.getFullMenu,
    staleTime: 60_000,
  });

  const allItems = categories.flatMap((c) => c.items || []);

  const displayedItems = (() => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return allItems.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          (i.nameAr && i.nameAr.includes(q)) ||
          (i.description && i.description.toLowerCase().includes(q)),
      );
    }
    if (activeCategory === 'all') return allItems;
    return categories.find((c) => c.id === activeCategory)?.items || [];
  })();

  const scrollToCategory = (catId: string) => {
    setActiveCategory(catId);
    if (catId === 'all') { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    const el = categoryRefs.current[catId];
    if (el) window.scrollTo({ top: el.offsetTop - 120, behavior: 'smooth' });
  };

  // ── Error states ──────────────────────────────────────────
  if (isOccupiedError) return (
    <div className="min-h-dvh flex items-center justify-center p-6 text-center" style={{ background: 'var(--bg-page)' }}>
      <div>
        <div className="text-6xl mb-4">🪑</div>
        <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', fontSize: '20px', letterSpacing: '0.06em', marginBottom: '10px' }}>
          TABLE OCCUPIED
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
          This table is currently occupied. Please ask the staff for assistance.
        </p>
      </div>
    </div>
  );

  if (tableError) return (
    <div className="min-h-dvh flex items-center justify-center p-6 text-center" style={{ background: 'var(--bg-page)' }}>
      <div>
        <div className="text-6xl mb-4">😔</div>
        <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', fontSize: '20px', letterSpacing: '0.06em', marginBottom: '10px' }}>
          TABLE NOT FOUND
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
          This QR code may be invalid or expired. Please ask your server for assistance.
        </p>
      </div>
    </div>
  );

  if (menuLoading || sessionChecking) return <MenuSkeleton />;

  return (
    <div className={cn('min-h-dvh', isRTL && 'rtl')} dir={isRTL ? 'rtl' : 'ltr'} style={{ background: 'var(--bg-page)' }}>

      {/* ── HEADER ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-40" style={{
        background: 'var(--bg-overlay)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1.5px solid var(--border-default)',
      }}>
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">

          {/* Brand */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 splat-decor"
              style={{ background: 'var(--brand)', boxShadow: '0 2px 10px rgba(124,58,237,0.35)' }}>
              <span style={{ color: 'white', fontFamily: 'var(--font-display)', fontSize: '11px', letterSpacing: '0.05em' }}>PB</span>
            </div>
            <div className="min-w-0">
              <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', fontSize: '13px', letterSpacing: '0.08em', lineHeight: '1.2' }}>
                SPLAT ZONE GRILLE
              </h1>
              {table && (
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--brand)', letterSpacing: '0.04em' }}>
                  ⊕ ZONE {table.number} · {table.floor}
                </p>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <LocaleSwitcher />
            <ThemeToggle />

            <button
              onClick={() => setIsSearchOpen((v) => !v)}
              className="p-2 rounded-lg transition-all"
              style={{ background: 'var(--brand-subtle)', border: '1.5px solid var(--brand-border)', color: 'var(--brand)' }}
            >
              {isSearchOpen ? <X size={17} /> : <Search size={17} />}
            </button>

            {tableId && (
              <button
                onClick={() => setIsTrackerOpen(true)}
                className="p-2 rounded-lg transition-all"
                style={{ background: 'var(--brand-subtle)', border: '1.5px solid var(--brand-border)', color: 'var(--brand)' }}
                title="Track your order"
              >
                <Clock size={17} />
              </button>
            )}

            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 rounded-lg transition-all"
              style={{ background: 'var(--brand)', border: '1.5px solid var(--brand)', color: 'white' }}
            >
              <ShoppingCart size={17} />
              {itemCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 font-bold rounded-full flex items-center justify-center"
                  style={{ background: '#dc2626', color: 'white', fontSize: '10px', border: '2px solid var(--bg-surface)' }}
                >
                  {itemCount}
                </motion.span>
              )}
            </button>
          </div>
        </div>

        {/* Search bar */}
        <AnimatePresence>
          {isSearchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
              className="overflow-hidden"
              style={{ borderTop: '1px solid var(--border-subtle)' }}
            >
              <div className="max-w-2xl mx-auto px-4 py-3">
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('search')}
                  className="input"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Category pills */}
        {!searchQuery && (
          <div className="max-w-2xl mx-auto px-4 pb-3 flex gap-2 scroll-x"
            style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
            <CategoryPill label={t('allCategories')} active={activeCategory === 'all'} onClick={() => scrollToCategory('all')} />
            {categories.map((cat) => (
              <CategoryPill
                key={cat.id}
                label={getItemName(cat, locale)}
                active={activeCategory === cat.id}
                onClick={() => scrollToCategory(cat.id)}
              />
            ))}
          </div>
        )}
      </header>

      {/* ── MAIN ───────────────────────────────────────────── */}
      <main className="max-w-2xl mx-auto px-4 pb-36">
        {searchQuery ? (
          <section className="pt-4">
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
              {displayedItems.length} result{displayedItems.length !== 1 ? 's' : ''} for &ldquo;{searchQuery}&rdquo;
            </p>
            <div className="grid gap-3">
              {displayedItems.map((item) => (
                <MenuItemCard
                  key={item.id} item={item} locale={locale}
                  onSelect={() => setSelectedItem(item)}
                  onQuickAdd={() => { addItem(item); toast.success(`${item.name} added!`); }}
                />
              ))}
              {displayedItems.length === 0 && (
                <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
                  <p className="text-3xl mb-2">🔍</p>
                  <p className="font-medium">No results found</p>
                </div>
              )}
            </div>
          </section>
        ) : (
          <>
            {/* Featured */}
            {(() => {
              const featured = allItems.filter((i) => i.isFeatured && i.isAvailable);
              if (!featured.length) return null;
              return (
                <section className="pt-4 mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Star size={15} className="text-amber-500 fill-amber-500" />
                    <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', fontSize: '15px', letterSpacing: '0.06em' }}>
                      {t('featured')}
                    </h2>
                  </div>
                  <div className="flex gap-3 scroll-x">
                    {featured.map((item) => (
                      <FeaturedCard key={item.id} item={item} locale={locale} onSelect={() => setSelectedItem(item)} />
                    ))}
                  </div>
                </section>
              );
            })()}

            {/* Categories */}
            {categories.map((cat) => {
              const items = cat.items?.filter((i) => i.isAvailable) || [];
              if (!items.length) return null;
              return (
                <section
                  key={cat.id}
                  ref={(el) => { categoryRefs.current[cat.id] = el; }}
                  className="mb-8"
                >
                  <h2 className="mb-3 pt-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', fontSize: '18px', letterSpacing: '0.05em' }}>
                    {getItemName(cat, locale)}
                  </h2>
                  <div className="grid gap-3">
                    {items.map((item) => (
                      <MenuItemCard
                        key={item.id} item={item} locale={locale}
                        onSelect={() => setSelectedItem(item)}
                        onQuickAdd={() => { addItem(item); toast.success(`${item.name} added!`); }}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </>
        )}
      </main>

      {/* ── FLOATING CART ──────────────────────────────────── */}
      <AnimatePresence>
        {itemCount > 0 && !isCartOpen && (
          <motion.div
            initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-4 right-4 max-w-sm mx-auto z-30"
          >
            <button
              onClick={() => setIsCartOpen(true)}
              className="w-full rounded-xl px-5 py-3.5 flex items-center justify-between transition-all"
              style={{
                background: 'var(--brand)',
                border: '2px solid var(--brand)',
                color: 'white',
                boxShadow: '0 8px 32px rgba(124,58,237,0.4)',
                fontFamily: 'var(--font-display)',
                letterSpacing: '0.07em',
              }}
            >
              <div className="flex items-center gap-3">
                <span style={{
                  background: 'rgba(255,255,255,0.2)',
                  width: '28px', height: '28px',
                  borderRadius: '6px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '13px', fontWeight: '700',
                }}>
                  {itemCount}
                </span>
                <span style={{ fontSize: '13px', textTransform: 'uppercase' }}>{t('cart')}</span>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: '700' }}>
                {formatCurrency(subtotal)}
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── PANELS & MODALS ────────────────────────────────── */}
      <CartPanel
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onOrderPlaced={(orderNumber) => {
          setIsCartOpen(false);
          setPlacedOrderNumber(orderNumber);
          setIsTrackerOpen(true);
        }}
      />

      <MenuItemModal
        item={selectedItem}
        locale={locale}
        onClose={() => setSelectedItem(null)}
        onAdd={(item, qty, note) => {
          addItem(item, qty, note);
          toast.success(`${item.name} added!`);
          setSelectedItem(null);
        }}
      />
      <Footer />

      <OrderTracker
        open={isTrackerOpen || !!placedOrderNumber}
        onClose={() => {
          setIsTrackerOpen(false);
          setPlacedOrderNumber(null);
        }}
      />
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────

function CategoryPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        flexShrink: 0,
        padding: '5px 14px',
        borderRadius: '6px',
        fontSize: '11px',
        fontFamily: 'var(--font-display)',
        letterSpacing: '0.07em',
        textTransform: 'uppercase' as const,
        whiteSpace: 'nowrap' as const,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        border: '1.5px solid',
        background:   active ? 'var(--brand)'  : 'transparent',
        color:        active ? 'white'         : 'var(--brand)',
        borderColor:  active ? 'var(--brand)'  : 'var(--brand-border)',
        boxShadow:    active ? '0 0 12px rgba(124,58,237,0.35)' : 'none',
      }}
    >
      {active ? '⊕ ' : ''}{label}
    </button>
  );
}

function FeaturedCard({ item, locale, onSelect }: { item: MenuItem; locale: string; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className="flex-shrink-0 w-44 rounded-xl overflow-hidden text-left card card-hover tactical-corners"
    >
      <div className="h-28 relative overflow-hidden" style={{ background: 'var(--bg-inset)' }}>
        {item.imageUrl
          ? <Image src={item.imageUrl} alt={item.name} fill className="object-cover" sizes="176px" />
          : <div className="w-full h-full flex items-center justify-center text-3xl" style={{ opacity: 0.25 }}>🎯</div>
        }
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 40%, var(--bg-surface) 100%)', opacity: 0.85 }} />
        <div className="absolute top-2 left-2">
          <span className="badge" style={{ background: 'var(--brand)', color: 'white', border: 'none', fontSize: '9px' }}>
            ★ TOP
          </span>
        </div>
      </div>
      <div className="p-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <p className="truncate" style={{ fontFamily: 'var(--font-body)', fontWeight: '600', fontSize: '13px', color: 'var(--text-primary)', marginBottom: '3px' }}>
          {getItemName(item, locale)}
        </p>
        <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--brand)', fontSize: '13px', fontWeight: '700' }}>
          {formatCurrency(item.discountPrice ?? item.price)}
        </p>
      </div>
    </button>
  );
}

function MenuSkeleton() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-4" style={{ background: 'var(--bg-page)' }}>
      <div className="h-14 shimmer rounded-2xl" />
      <div className="flex gap-2">
        {[80,100,90,75,110].map((w,i) => (
          <div key={i} className="h-8 rounded-full shimmer" style={{ width: w }} />
        ))}
      </div>
      <div className="flex gap-3 overflow-hidden">
        {[1,2,3].map(i => <div key={i} className="w-40 h-36 flex-shrink-0 rounded-2xl shimmer" />)}
      </div>
      {[1,2,3,4,5,6].map(i => <div key={i} className="h-28 rounded-2xl shimmer" />)}
    </div>
  );
}