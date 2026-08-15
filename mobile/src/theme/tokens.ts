export interface SemanticTokens {
  page: string;
  surface: string;
  surfaceAlt: string;
  card: string;
  border: string;
  borderStrong: string;

  text: string;
  textSoft: string;
  textMuted: string;
  textDisabled: string;
  textInverse: string;

  accent: string;
  accentStrong: string;
  accentSoft: string;
  accentDisabled: string;

  success: string;
  successBg: string;
  successText: string;
  warning: string;
  warningBg: string;
  warningText: string;
  danger: string;
  dangerBg: string;
  dangerText: string;
  info: string;
  infoBg: string;
  infoText: string;

  easyBg: string;
  easyText: string;
  mediumBg: string;
  mediumText: string;
  hardBg: string;
  hardText: string;

  heroBg: string;
  heroText: string;
  heroTextSoft: string;
  heroTextMuted: string;
  heroDropdownBg: string;

  aiPrimary: string;
  aiAccent: string;
  aiGlow: string;

  overlay: string;
  sheetBackdrop: string;
  whiteOverlaySoft: string;
  whiteOverlayMedium: string;
  whiteOverlayStrong: string;
  skeletonBase: string;
  skeletonShimmer: string;
  shadow: string;
}

export type ThemeName = 'quantum-indigo' | 'aurora-violet' | 'focus-emerald';

export interface ThemeDefinition {
  name: ThemeName;
  label: string;
  light: SemanticTokens;
  dark: SemanticTokens;
}
