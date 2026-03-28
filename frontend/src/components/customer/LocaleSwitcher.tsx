'use client';

import { useLocaleStore } from '@/stores';
import { cn } from '@/lib/utils';

const LOCALES = [
  { code: 'en', label: 'EN' },
  { code: 'ar', label: 'ع' },
  { code: 'fr', label: 'FR' },
] as const;

export default function LocaleSwitcher() {
  const { locale, setLocale } = useLocaleStore();
  return (
    <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-0.5 gap-0.5">
      {LOCALES.map((l) => (
        <button
          key={l.code}
          onClick={() => setLocale(l.code)}
          className={cn(
            'px-2 py-1 rounded-lg text-xs font-semibold transition-colors',
            locale === l.code
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
          )}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
