import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import zhCN from './zh-CN.json';
import enUS from './en-US.json';

export type Locale = 'zh-CN' | 'en-US';

type Messages = typeof zhCN;

const LOCALE_KEY = 'frag-note:locale';

const messagesMap: Record<Locale, Messages> = {
  'zh-CN': zhCN,
  'en-US': enUS,
};

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return path;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === 'string' ? current : path;
}

function getInitialLocale(): Locale {
  try {
    const saved = localStorage.getItem(LOCALE_KEY);
    if (saved === 'zh-CN' || saved === 'en-US') return saved;
  } catch {
    // SSR or localStorage unavailable
  }
  return 'zh-CN';
}

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale);
    try {
      localStorage.setItem(LOCALE_KEY, nextLocale);
    } catch {
      // SSR or localStorage unavailable
    }
  }, []);

  const t = useCallback(
    (key: string) => getNestedValue(messagesMap[locale] as unknown as Record<string, unknown>, key),
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

const fallbackT = (key: string) => getNestedValue(zhCN as unknown as Record<string, unknown>, key);
const fallbackContext: LocaleContextValue = { locale: 'zh-CN', setLocale: () => {}, t: fallbackT };

export function useTranslation() {
  const context = useContext(LocaleContext);
  return context ?? fallbackContext;
}
