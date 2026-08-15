import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Language, translations } from '@/i18n/translations';

type TOptions = Record<string, string | number>;
const LANGUAGE_STORAGE_KEY = 'app_language';

type I18nContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, options?: TOptions) => string;
  isReady: boolean;
};

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

function resolveValue(obj: unknown, key: string): string | undefined {
  const path = key.split('.');
  let current: unknown = obj;

  for (const segment of path) {
    if (!current || typeof current !== 'object' || !(segment in current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return typeof current === 'string' ? current : undefined;
}

function formatTemplate(template: string, options?: TOptions): string {
  if (!options) return template;

  return template.replace(/\{(\w+)\}/g, (_, token: string) => {
    if (!(token in options)) return `{${token}}`;
    return String(options[token]);
  });
}

function getInitialLanguage(): Language {
  return 'en';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(getInitialLanguage);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function hydrateLanguage() {
      try {
        const storedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (!isMounted || !storedLanguage) return;
        setLanguage(storedLanguage as Language);
      } finally {
        if (isMounted) {
          setIsReady(true);
        }
      }
    }

    hydrateLanguage();

    return () => {
      isMounted = false;
    };
  }, []);

  const persistLanguage = useCallback((nextLanguage: Language) => {
    setLanguage(nextLanguage);
    AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage).catch(() => {});
  }, []);

  const value = useMemo<I18nContextValue>(() => {
    const t = (key: string, options?: TOptions): string => {
      const primary = resolveValue(translations[language], key);
      if (primary) {
        return formatTemplate(primary, options);
      }

      const fallback = resolveValue(translations.en, key);
      if (fallback) {
        return formatTemplate(fallback, options);
      }

      return key;
    };

    return {
      language,
      setLanguage: persistLanguage,
      toggleLanguage: () => persistLanguage(language === 'en' ? 'bn' : 'en'),
      t,
      isReady,
    };
  }, [isReady, language, persistLanguage]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used inside I18nProvider');
  }
  return context;
}
