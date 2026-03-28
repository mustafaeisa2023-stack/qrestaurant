'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore, useNotificationStore, useLocaleStore } from '@/stores';
import { authService } from '@/lib/services';
import { useAdminSocket } from '@/hooks/useSocket';
import { useTranslation } from '@/lib/i18n';
import { useQueryClient } from '@tanstack/react-query';
import ThemeToggle from '@/components/shared/ThemeToggle';
import {
  LayoutDashboard, UtensilsCrossed, Table2, ClipboardList,
  BarChart3, LogOut, Bell, Menu, X, Users, ChefHat, Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import Footer from '@/components/shared/Footer';


// ── Socket handler — كومبوننت منفصل عشان الـ hooks تشتغل صح ──
function AdminSocketHandler() {
  const queryClient = useQueryClient();
  useAdminSocket({
    onNewOrder: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['active-orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onOrderStatusUpdated: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['active-orders'] });
    },
  });
  return null;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, clearAuth, _hasHydrated } = useAuthStore();
  const { unreadCount, markAllAsRead } = useNotificationStore();
  const { locale, setLocale } = useLocaleStore();
  const { t, isRTL } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const NAV_ITEMS = [
    { href: '/admin',           label: t('dashboard'), icon: LayoutDashboard, exact: true  },
    { href: '/admin/orders',    label: t('orders'),    icon: ClipboardList,   exact: false },
    { href: '/admin/kitchen',   label: t('kitchen'),   icon: ChefHat,         exact: false },
    { href: '/admin/tables',    label: t('tables'),    icon: Table2,          exact: false },
    { href: '/admin/menu',      label: t('menu'),      icon: UtensilsCrossed, exact: false },
    { href: '/admin/analytics', label: t('analytics'), icon: BarChart3,       exact: false },
    { href: '/admin/users',     label: t('team'),      icon: Users,           exact: false },
    { href: '/admin/settings',  label: t('settings'),  icon: Settings,        exact: false },
  ];

  const LOCALES = [
    { code: 'en', label: 'EN' },
    { code: 'ar', label: 'ع' },
    { code: 'fr', label: 'FR' },
  ] as const;

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated && pathname !== '/admin/login') {
      router.replace('/admin/login');
    }
  }, [_hasHydrated, isAuthenticated, pathname, router]);

  const handleLogout = async () => {
    try { await authService.logout(); } catch (_) {}
    clearAuth();
    router.push('/admin/login');
    toast.success(t('logout'));
  };

  // ── Login page ───────────────────────────────────────────
  if (pathname === '/admin/login') return <>{children}</>;

  // ── Waiting for hydration ────────────────────────────────
  if (!_hasHydrated) return (
    <div className="min-h-dvh flex items-center justify-center" style={{ background: 'var(--bg-page)' }}>
      <div className="w-8 h-8 rounded-full border-2 animate-spin"
        style={{ borderColor: 'var(--brand-border)', borderTopColor: 'var(--brand)' }} />
    </div>
  );

  // ── Not authenticated ────────────────────────────────────
  if (!isAuthenticated) return null;

  const currentLabel = NAV_ITEMS.find(n => n.exact ? pathname === n.href : pathname.startsWith(n.href))?.label ?? '';

  return (
    <div
      className={cn('min-h-dvh flex', isRTL && 'rtl')}
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{ background: 'var(--bg-page)', color: 'var(--text-primary)' }}
    >
      {/* Socket handler — يشتغل بس لما المستخدم مسجل */}
      <AdminSocketHandler />

      {/* ── SIDEBAR ─────────────────────────────────────── */}
      <aside className={cn(
        'fixed inset-y-0 z-50 w-64 flex flex-col transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 lg:flex',
        isRTL ? 'right-0' : 'left-0',
        sidebarOpen ? 'translate-x-0' : isRTL ? 'translate-x-full' : '-translate-x-full',
      )} style={{
        background: 'var(--bg-surface)',
        borderRight: isRTL ? 'none' : '1.5px solid var(--border-default)',
        borderLeft:  isRTL ? '1.5px solid var(--border-default)' : 'none',
      }}>

        {/* Logo */}
        <div className="p-5 flex items-center gap-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--brand)', boxShadow: '0 2px 10px rgba(124,58,237,0.35)' }}>
            <span style={{ color: 'white', fontFamily: 'var(--font-display)', fontSize: '11px', letterSpacing: '0.05em' }}>PB</span>
          </div>
          <div className="flex-1 min-w-0">
            <p style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', fontSize: '13px', letterSpacing: '0.06em' }}>
              SPLAT ZONE
            </p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--brand)' }}>
              {t('adminPanel')}
            </p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1.5 rounded-lg transition-colors" style={{ color: 'var(--text-muted)' }}>
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link key={href} href={href} onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: active ? 'var(--brand-subtle)' : 'transparent',
                  color:      active ? 'var(--brand)'        : 'var(--text-secondary)',
                  border:     active ? '1px solid var(--brand-border)' : '1px solid transparent',
                  fontFamily: 'var(--font-body)',
                  fontWeight: active ? '600' : '500',
                }}>
                <Icon size={17} style={{ color: active ? 'var(--brand)' : 'var(--text-muted)', flexShrink: 0 }} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Language */}
        <div className="px-4 py-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.06em' }}>
            {t('language')}
          </p>
          <div className="flex gap-1.5">
            {LOCALES.map(({ code, label }) => (
              <button key={code} onClick={() => setLocale(code)} style={{
                flex: 1, padding: '5px', borderRadius: '6px', fontSize: '11px',
                fontFamily: 'var(--font-display)', letterSpacing: '0.05em', cursor: 'pointer', transition: 'all 0.15s',
                border: '1.5px solid',
                background:  locale === code ? 'var(--brand)'  : 'transparent',
                color:       locale === code ? 'white'         : 'var(--text-secondary)',
                borderColor: locale === code ? 'var(--brand)'  : 'var(--border-default)',
              }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* User */}
        <div className="p-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-3 mb-3 min-w-0">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--brand-subtle)', border: '1.5px solid var(--brand-border)' }}>
              <span style={{ color: 'var(--brand)', fontSize: '13px', fontWeight: '700', fontFamily: 'var(--font-display)' }}>
                {user?.name?.charAt(0).toUpperCase() ?? '?'}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate leading-tight" style={{ color: 'var(--text-primary)' }}>{user?.name}</p>
              <p className="text-xs leading-tight capitalize" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {user?.role?.toLowerCase().replace('_', ' ')}
              </p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors"
            style={{ color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)' }}>
            <LogOut size={15} />
            {t('logout')}
          </button>
        </div>
      </aside>

      {/* Backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── MAIN ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="sticky top-0 z-30 px-4 h-14 flex items-center gap-3" style={{
          background: 'var(--bg-overlay)', backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)', borderBottom: '1.5px solid var(--border-default)',
        }}>
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-xl transition-colors lg:hidden"
            style={{ background: 'var(--brand-subtle)', border: '1px solid var(--brand-border)', color: 'var(--brand)' }}>
            <Menu size={18} />
          </button>

          <span className="hidden sm:block" style={{ fontFamily: 'var(--font-display)', fontSize: '13px', letterSpacing: '0.06em', color: 'var(--text-primary)' }}>
            {currentLabel}
          </span>

          <div className="flex-1" />

          <div className="hidden md:flex gap-1">
            {LOCALES.map(({ code, label }) => (
              <button key={code} onClick={() => setLocale(code)} style={{
                padding: '4px 10px', borderRadius: '6px', fontSize: '11px',
                fontFamily: 'var(--font-display)', letterSpacing: '0.05em', cursor: 'pointer', transition: 'all 0.15s',
                border: '1.5px solid',
                background:  locale === code ? 'var(--brand)'  : 'transparent',
                color:       locale === code ? 'white'         : 'var(--text-secondary)',
                borderColor: locale === code ? 'var(--brand)'  : 'var(--border-default)',
              }}>
                {label}
              </button>
            ))}
          </div>

          <ThemeToggle />

          <button
            onClick={() => { markAllAsRead(); router.push('/admin/orders'); }}
            className="relative p-2 rounded-xl transition-colors"
            style={{ background: 'var(--brand-subtle)', border: '1px solid var(--brand-border)', color: 'var(--brand)' }}
          >
            <Bell size={17} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1"
                style={{ background: '#dc2626' }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-auto">{children}</main>
        <Footer />
      </div>
    </div>
  );
}