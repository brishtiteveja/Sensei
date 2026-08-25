/**
 * The product palette — one definition, both clients.
 *
 * These values existed twice: as CSS custom properties in web/src/styles/
 * tokens.css and as literals in mobile/src/theme. They had already drifted —
 * `page` and `border` went neutral grey on the phone where the web carries a
 * violet cast — which is exactly the kind of difference nobody files a bug
 * about and everybody feels.
 *
 * Kept as plain values with no imports, so a Vite bundle and a Metro bundle can
 * both read it. Anything platform-specific (a CSS gradient string, a
 * react-native-svg element) belongs in the per-platform renderer, not here.
 */

/** The gradient: indigo into violet into fuchsia. */
export const GRADIENT = ['#4F46E5', '#8B5CF6', '#D946EF'] as const;

/** Secondary identity hues, for subject chips and decorative accents. */
export const DECO = {
  teal: '#0D9488',
  amber: '#D97706',
  cyan: '#0891B2',
} as const;

/** Background wash hues, drawn under everything. */
export const AURORA = ['#6366F1', '#C026D3', '#14B8A6'] as const;

/**
 * Semantic colours. Light and dark are separate maps rather than one map of
 * pairs, because each client resolves a theme once and then reads flat values.
 */
export const LIGHT = {
  page: '#F8F8FD',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  border: '#E2E2EE',
  accent: '#4F46E5',
  accentStrong: '#4338CA',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#06B6D4',
} as const;

export const DARK = {
  page: '#0B0B14',
  surface: '#14141F',
  card: '#171723',
  border: '#26263A',
  accent: '#6366F1',
  accentStrong: '#818CF8',
  success: '#34D399',
  warning: '#FBBF24',
  danger: '#F87171',
  info: '#22D3EE',
} as const;

/** The owl's own palette, shared with the launcher icon. */
export const OWL = {
  indigo: '#4F46E5',
  cream: '#F5F0EB',
  cyan: '#06B6D4',
  gold: '#F4C542',
  wing: '#D4C5B5',
} as const;

/** Paper. The eraser is a fat brush of exactly this. */
export const PAPER = '#FFFFFF';
