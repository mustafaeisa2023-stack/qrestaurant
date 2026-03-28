'use client';

import { useLocaleStore } from '@/stores';
import { useTranslation } from '@/lib/i18n';

export default function SettingsPage() {
  const { locale, setLocale } = useLocaleStore();
  const { t } = useTranslation();

  const LOCALES = [
    { code: 'en', label: 'English', flag: '🇺🇸', native: 'English' },
    { code: 'ar', label: 'Arabic',  flag: '🇯🇴', native: 'العربية' },
    { code: 'fr', label: 'French',  flag: '🇫🇷', native: 'Français' },
  ] as const;

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', letterSpacing: '0.06em', color: 'var(--text-primary)' }}>
          {t('settings')}
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
          Manage your preferences
        </p>
      </div>

      {/* Language */}
      <div className="card p-5">
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '13px', letterSpacing: '0.06em', color: 'var(--text-primary)', marginBottom: '16px' }}>
          {t('language')}
        </p>
        <div className="grid grid-cols-3 gap-3">
          {LOCALES.map(({ code, label, flag, native }) => (
            <button
              key={code}
              onClick={() => setLocale(code)}
              className="p-4 rounded-xl transition-all text-center"
              style={{
                border: '1.5px solid',
                background:   locale === code ? 'var(--brand-subtle)' : 'transparent',
                borderColor:  locale === code ? 'var(--brand)'        : 'var(--border-default)',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: '28px', marginBottom: '6px' }}>{flag}</div>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '12px', color: locale === code ? 'var(--brand)' : 'var(--text-primary)', letterSpacing: '0.05em' }}>
                {native}
              </p>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                {label}
              </p>
              {locale === code && (
                <div className="mt-2 mx-auto w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'var(--brand)' }}>
                  <span style={{ color: 'white', fontSize: '12px' }}>✓</span>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}