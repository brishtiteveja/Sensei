import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ThemeName } from '@/theme/tokens';
import { ACTIVE_THEME } from '@/theme/theme-config';
import { themes } from '@/theme/themes';

type ColorScheme = 'light' | 'dark';
const THEME_STORAGE_KEY = 'theme_scheme';
const THEME_NAME_STORAGE_KEY = 'theme_name';

interface ThemeContextValue {
  colorScheme: ColorScheme;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (scheme: ColorScheme) => void;
  activeThemeName: ThemeName;
  setActiveThemeName: (themeName: ThemeName) => void;
  isReady: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  colorScheme: 'dark',
  isDark: true,
  toggleTheme: () => {},
  setTheme: () => {},
  activeThemeName: ACTIVE_THEME,
  setActiveThemeName: () => {},
  isReady: false,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [manualScheme, setManualScheme] = useState<ColorScheme | null>(null);
  const [activeThemeName, setActiveThemeNameState] = useState<ThemeName>(ACTIVE_THEME);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function hydrateTheme() {
      try {
        const [storedTheme, storedThemeName] = await Promise.all([
          AsyncStorage.getItem(THEME_STORAGE_KEY),
          AsyncStorage.getItem(THEME_NAME_STORAGE_KEY),
        ]);
        if (!isMounted) return;

        if (!storedTheme) {
          setManualScheme('dark');
          await AsyncStorage.setItem(THEME_STORAGE_KEY, 'dark');
        } else if (storedTheme === 'light' || storedTheme === 'dark') {
          setManualScheme(storedTheme);
        } else {
          setManualScheme('dark');
          await AsyncStorage.setItem(THEME_STORAGE_KEY, 'dark');
        }

        if (storedThemeName && storedThemeName in themes) {
          setActiveThemeNameState(storedThemeName as ThemeName);
        } else {
          setActiveThemeNameState(ACTIVE_THEME);
          await AsyncStorage.setItem(THEME_NAME_STORAGE_KEY, ACTIVE_THEME);
        }
      } finally {
        if (isMounted) {
          setIsReady(true);
        }
      }
    }

    hydrateTheme();

    return () => {
      isMounted = false;
    };
  }, []);

  const colorScheme: ColorScheme = manualScheme ?? 'dark';
  const isDark = colorScheme === 'dark';

  const setTheme = useCallback((scheme: ColorScheme) => {
    setManualScheme(scheme);
    AsyncStorage.setItem(THEME_STORAGE_KEY, scheme).catch(() => {});
  }, []);

  const setActiveThemeName = useCallback((themeName: ThemeName) => {
    setActiveThemeNameState(themeName);
    AsyncStorage.setItem(THEME_NAME_STORAGE_KEY, themeName).catch(() => {});
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(isDark ? 'light' : 'dark');
  }, [isDark, setTheme]);

  const value = useMemo(
    () => ({
      colorScheme,
      isDark,
      toggleTheme,
      setTheme,
      activeThemeName,
      setActiveThemeName,
      isReady,
    }),
    [colorScheme, isDark, toggleTheme, setTheme, activeThemeName, setActiveThemeName, isReady],
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
