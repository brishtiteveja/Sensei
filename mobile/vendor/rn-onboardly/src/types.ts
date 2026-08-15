import type { ReactNode } from 'react';

// ---------------------------------------------------------------------------
// Card-style onboarding (original)
// ---------------------------------------------------------------------------

export type OnboardlyOption = {
  id: string;
  label: string;
  emoji?: string;
  icon?: ReactNode;
  description?: string;
};

export type OnboardlyQuestion = {
  id: string;
  title?: string;
  subtitle?: string;
  titleAnimation?: 'typewriter';
  subtitleAnimation?: 'typewriter';
  titleAnimationSpeed?: number;
  subtitleAnimationSpeed?: number;
  titleAnimationDelay?: number;
  subtitleAnimationDelay?: number;
  emoji?: string;
  /**
   * Custom content rendered in place of the options grid.
   * Use this for intro / mascot / illustration steps where the user
   * just taps Continue. Takes precedence over `options`.
   */
  content?: ReactNode;
  multiSelect?: boolean;
  skippable?: boolean;
  layout?: 'grid' | 'list';
  minSelect?: number;
  options?: OnboardlyOption[];
  /**
   * Per-step override for the plugin-level `mascot`.
   * Defaults to true when a mascot is provided.
   * Set false on intro/custom steps that show their own larger version.
   */
  showMascot?: boolean;
};

// ---------------------------------------------------------------------------
// Theme (shared by both card and chat flows)
// ---------------------------------------------------------------------------

export type OnboardlyTheme = {
  background: string;
  card: string;
  cardSelected: string;
  primary: string;
  primaryText: string;
  text: string;
  textMuted: string;
  border: string;
  borderSelected: string;
  fontFamily?: string;
  fontFamilyBold?: string;
  borderRadius: number;

  // Chat-specific tokens (optional — defaults provided)
  bubbleAi?: string;
  bubbleUser?: string;
  bubbleAiText?: string;
  bubbleUserText?: string;
  inputBg?: string;
  chipBorder?: string;
  chipActiveBg?: string;
  chipActiveText?: string;
  fabBg?: string;
  fabDisabledBg?: string;
  ringTrack?: string;
};

export type OnboardlyAnimation = 'slide' | 'fade' | 'spring';

export type OnboardlyAnswers = Record<string, string[]>;

export type OnboardlyColorScheme = 'light' | 'dark' | 'system';

export type OnboardlyLocale = 'en' | 'bn';

export type OnboardlyLocaleStrings = {
  nextLabel: string;
  skipLabel: string;
  finishLabel: string;
  skipAllLabel: string;
};

export type OnboardlyProps = {
  questions: OnboardlyQuestion[];
  theme?: Partial<OnboardlyTheme>;
  darkTheme?: Partial<OnboardlyTheme>;
  colorScheme?: OnboardlyColorScheme;
  animation?: OnboardlyAnimation;
  onComplete: (answers: OnboardlyAnswers) => void;
  onSkipAll?: () => void;
  /**
   * Optional mascot/illustration rendered above the question on every step.
   * The plugin stays brand-neutral — pass any React node (SVG, Lottie, image, etc.).
   * Individual steps can override with `showMascot: false`.
   */
  mascot?: ReactNode;
  /** Where the mascot sits vertically. Defaults to 'top'. */
  mascotPosition?: 'top' | 'above-title';
  locale?: OnboardlyLocale;
  localeStrings?: Partial<OnboardlyLocaleStrings>;
  showProgress?: boolean;
  showBack?: boolean;
};

// ---------------------------------------------------------------------------
// Chat-style onboarding (Learna pattern)
// ---------------------------------------------------------------------------

export type ChatChoice = {
  label: string;
  emoji?: string;
};

export type ChatAnswers = Record<string, string | string[]>;

export type ChatStep = {
  id: string;
  type: 'text' | 'single' | 'multi';
  prompt: string | ((answers: ChatAnswers) => string);
  helper?: string;
  placeholder?: string;
  options?: ChatChoice[] | ((answers: ChatAnswers) => ChatChoice[]);
  max?: number;
};

export type ChatOnboardingLocaleStrings = {
  continueLabel: string;
};

export type ChatOnboardingProps = {
  steps: ChatStep[];
  introMessages?: string[];
  completionMessage?: string;
  theme?: Partial<OnboardlyTheme>;
  darkTheme?: Partial<OnboardlyTheme>;
  colorScheme?: OnboardlyColorScheme;
  onComplete: (answers: ChatAnswers) => void;
  mascot?: ReactNode;
  showProgress?: boolean;
  localeStrings?: Partial<ChatOnboardingLocaleStrings>;
  sendIcon?: ReactNode;
};

// ---------------------------------------------------------------------------
// Personalizing loader
// ---------------------------------------------------------------------------

export type PlanTile = {
  label: string;
  value: string;
  emoji?: string;
  wide?: boolean;
};

export type PersonalizingLoaderProps = {
  planTitle?: string;
  planTiles?: PlanTile[];
  socialProofMessages?: string[];
  mascot?: ReactNode;
  theme?: Partial<OnboardlyTheme>;
  darkTheme?: Partial<OnboardlyTheme>;
  colorScheme?: OnboardlyColorScheme;
  onComplete: () => void;
  localeStrings?: Partial<{
    getMyPlanLabel: string;
    personalizingLabel: string;
    readyLabel: string;
  }>;
};
