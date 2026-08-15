// Card-style onboarding (original)
export { OnboardingFlow } from './OnboardingFlow';

// Chat-style onboarding (Learna pattern)
export { ChatOnboardingFlow } from './ChatOnboardingFlow';
export { PersonalizingLoader } from './PersonalizingLoader';

// Themes
export { defaultTheme } from './theme/defaultTheme';
export { defaultDarkTheme } from './theme/defaultDarkTheme';

// Shared components
export { AnimatedEmoji } from './components/AnimatedEmoji';
export { ProgressBar } from './components/ProgressBar';
export { OptionButton } from './components/OptionButton';
export { QuestionCard } from './components/QuestionCard';
export { AiBubble } from './components/AiBubble';
export { UserBubble } from './components/UserBubble';
export { ChipPicker } from './components/ChipPicker';
export { SendFab } from './components/SendFab';
export { TextInputDock } from './components/TextInputDock';

// Types
export type {
  // Card types
  OnboardlyOption,
  OnboardlyQuestion,
  OnboardlyTheme,
  OnboardlyAnimation,
  OnboardlyAnswers,
  OnboardlyColorScheme,
  OnboardlyLocale,
  OnboardlyLocaleStrings,
  OnboardlyProps,
  // Chat types
  ChatChoice,
  ChatAnswers,
  ChatStep,
  ChatOnboardingLocaleStrings,
  ChatOnboardingProps,
  // Personalizing types
  PlanTile,
  PersonalizingLoaderProps,
} from './types';
