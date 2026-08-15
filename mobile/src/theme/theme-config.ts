import type { ThemeName } from './tokens';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { ACTIVE_THEME: sharedActiveTheme } = require('./theme-config.shared');

export const ACTIVE_THEME = sharedActiveTheme as ThemeName;
