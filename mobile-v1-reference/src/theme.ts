/**
 * Visual constants. Dark, high-contrast, readable from the back of a room.
 *
 * Nothing here reaches the network: the font is a local .ttf in assets/fonts and the
 * only colours are literals. That is load-bearing -- the closing move of the demo is
 * pulling the cable, so a CDN font request would be fatal.
 */

export const colors = {
  bg: '#0B0F14',
  surface: '#151C24',
  surfaceAlt: '#1D2732',
  border: '#26313D',
  text: '#E8EEF4',
  textDim: '#93A2B1',
  accent: '#76B900', // Spark green
  accentDim: '#4E7B00',
  warn: '#F5A524',
  danger: '#E5484D',
  bubbleUser: '#1F3A17',
  bubbleTutor: '#161F29',
} as const;

/**
 * Hind Siliguri: Bengali + Latin in one family, with the full conjunct shaping tables
 * (akhn/blwf/half/rphf/pres/pstf). A Bengali-only font would drop every English glyph
 * to a mismatched system fallback, and a Latin-only font would tofu the syllabus.
 */
export const fonts = {
  regular: 'HindSiliguri',
  bold: 'HindSiliguri-Bold',
} as const;

export const radius = { sm: 8, md: 12, lg: 18 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;
