import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { setLocale } from '@/i18n/strings';
import { readRaw, writeRaw } from '@/lib/storage';

export type ThemeMode = 'light' | 'dark' | 'system';

interface SettingsApi {
  /** Locale code sent as `?lang=` and in `context_data.language`. */
  language: string;
  setLanguage: (code: string) => void;
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
  isDark: boolean;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

const Ctx = createContext<SettingsApi | null>(null);

function resolveDark(mode: ThemeMode): boolean {
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<string>(() => readRaw('lang') || 'en');
  const [theme, setThemeState] = useState<ThemeMode>(
    () => (readRaw('theme') as ThemeMode | null) ?? 'system',
  );
  const [isDark, setIsDark] = useState<boolean>(() => resolveDark(theme));
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(
    () => readRaw('sidebar') === 'collapsed',
  );

  // Point `t` at the active locale during render, not in an effect: children
  // read `t` as they render, so an effect would let one paint of the previous
  // language through first.
  setLocale(language);

  // Keep <html class="dark"> in sync, including live OS changes in system mode.
  useEffect(() => {
    const apply = () => {
      const dark = resolveDark(theme);
      setIsDark(dark);
      document.documentElement.classList.toggle('dark', dark);
    };
    apply();

    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((code: string) => {
    setLanguageState(code);
    writeRaw('lang', code);
  }, []);

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode);
    // index.html reads this pre-paint; store the resolved value it expects.
    writeRaw('theme', mode === 'system' ? 'system' : mode);
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((v) => {
      writeRaw('sidebar', v ? 'open' : 'collapsed');
      return !v;
    });
  }, []);

  const value = useMemo<SettingsApi>(
    () => ({ language, setLanguage, theme, setTheme, isDark, sidebarCollapsed, toggleSidebar }),
    [language, setLanguage, theme, setTheme, isDark, sidebarCollapsed, toggleSidebar],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSettings(): SettingsApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>');
  return ctx;
}
