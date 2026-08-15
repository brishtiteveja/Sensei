import { useMemo } from 'react';
import { vars } from 'nativewind';
import { useTheme } from '@/contexts/theme-context';
import { themes } from './themes';

export function useThemeVariables() {
  const { activeThemeName } = useTheme();

  return useMemo(() => {
    const activeTheme = themes[activeThemeName];

    return vars({
      '--app-bg': activeTheme.light.page,
      '--app-bg-dark': activeTheme.dark.page,
      '--app-surface': activeTheme.light.surface,
      '--app-surface-dark': activeTheme.dark.surface,
      '--app-surface-alt': activeTheme.light.surfaceAlt,
      '--app-surface-alt-dark': activeTheme.dark.surfaceAlt,
      '--app-text': activeTheme.light.text,
      '--app-text-dark': activeTheme.dark.text,
      '--app-text-muted': activeTheme.light.textMuted,
      '--app-text-muted-dark': activeTheme.dark.textMuted,
      '--app-border': activeTheme.light.border,
      '--app-border-dark': activeTheme.dark.border,
      '--app-accent': activeTheme.light.accent,
      '--app-accent-dark': activeTheme.dark.accent,
      '--app-brand': activeTheme.light.heroBg,
      '--app-success': activeTheme.light.success,
      '--app-warning': activeTheme.light.warning,
      '--app-danger': activeTheme.light.danger,
    });
  }, [activeThemeName]);
}
