/**
 * The product gradient: indigo into violet into fuchsia.
 *
 * These are the web client's `--s-grad-1/2/3` verbatim. The two apps already
 * agreed on the accent (#4F46E5) but not on this, which is why the phone read
 * as flat next to the site — the gradient is what carries the identity across
 * hero panels, primary buttons and rings.
 *
 * Kept as plain arrays rather than a component so callers can hand them to
 * expo-linear-gradient, to an SVG gradient, or read a single stop for a border.
 */

export const SENSEI_GRADIENT = ['#4F46E5', '#8B5CF6', '#D946EF'] as const;

/** The same ramp, softened — for washes behind content that must stay readable. */
export const SENSEI_GRADIENT_SOFT = ['#EEF2FF', '#F5F3FF', '#FDF4FF'] as const;

/** Diagonal, matching the web's 118deg. */
export const GRADIENT_START = { x: 0, y: 0 };
export const GRADIENT_END = { x: 1, y: 1 };

/** Secondary identity hues, for subject chips and accents. */
export const DECO = {
  teal: '#0D9488',
  amber: '#D97706',
  cyan: '#0891B2',
} as const;
