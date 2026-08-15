import { useMemo } from 'react';
import { useTheme } from '@/contexts/theme-context';
import { ACTIVE_THEME } from './theme-config';
import { themes } from './themes';
import type { SemanticTokens } from './tokens';

export function useAppTheme(): SemanticTokens {
  const { isDark, activeThemeName } = useTheme();
  return useMemo(
    () => themes[activeThemeName ?? ACTIVE_THEME][isDark ? 'dark' : 'light'],
    [activeThemeName, isDark],
  );
}
