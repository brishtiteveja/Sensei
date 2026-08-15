# rn-onboardly

Interactive, Duolingo-style onboarding plugin for React Native. Drop in a `<OnboardingFlow />`, pass a list of questions, and ship a smooth, animated preference flow in minutes. Fully customizable content, options, layout, theme, and entrance animations.

![npm](https://img.shields.io/npm/v/rn-onboardly) ![license](https://img.shields.io/npm/l/rn-onboardly)

---

## Features

- Duolingo-inspired question flow with animated emoji mascots
- Single and multi-select options with `minSelect` enforcement
- Grid or list layouts, configurable per question
- Skippable questions (per-question or whole-flow)
- Theme override: colors, fonts, border radius, dark-mode ready
- Three entrance animations: `slide`, `fade`, `spring`
- Spring-press feedback on option tap, pop-on-select
- Animated progress bar, back navigation, skip-all
- Self-contained React state — **no external state library required**
- Fully controlled from the host app: storage, routing, analytics all live in your `onComplete` handler
- Written in TypeScript with exported types

---

## Installation

```bash
# npm
npm install rn-onboardly react-native-reanimated

# yarn
yarn add rn-onboardly react-native-reanimated
```

### Peer dependencies

| package | version |
| --- | --- |
| `react` | `>=18` |
| `react-native` | `>=0.70` |
| `react-native-reanimated` | `>=3` |

### Reanimated setup

`react-native-reanimated` must be configured per [its docs](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/getting-started). In short, add its Babel plugin **last** in `babel.config.js`:

```js
module.exports = {
  presets: ['babel-preset-expo'],
  plugins: [
    // ...other plugins
    'react-native-reanimated/plugin', // must be last
  ],
};
```

---

## Quick start

```tsx
import { OnboardingFlow, type OnboardlyQuestion } from 'rn-onboardly';
import { useRouter } from 'expo-router';

const questions: OnboardlyQuestion[] = [
  {
    id: 'goal',
    title: 'What brings you here?',
    subtitle: 'Pick one — you can change this later.',
    emoji: '🎯',
    layout: 'list',
    options: [
      { id: 'learn', label: 'Learn new things', emoji: '📚' },
      { id: 'exam', label: 'Prepare for an exam', emoji: '📝' },
      { id: 'fun', label: 'Just exploring', emoji: '🎉' },
    ],
  },
  {
    id: 'subjects',
    title: 'Which subjects interest you?',
    subtitle: 'Pick as many as you like.',
    emoji: '✨',
    multiSelect: true,
    minSelect: 1,
    layout: 'grid',
    skippable: true,
    options: [
      { id: 'math', label: 'Math', emoji: '🔢' },
      { id: 'sci', label: 'Science', emoji: '🔬' },
      { id: 'eng', label: 'English', emoji: '📖' },
      { id: 'hist', label: 'History', emoji: '🏛️' },
    ],
  },
];

export default function OnboardingScreen() {
  const router = useRouter();

  return (
    <OnboardingFlow
      questions={questions}
      animation="slide"
      onComplete={async (answers) => {
        // You decide where answers go: AsyncStorage, API, Zustand, etc.
        console.log(answers); // { goal: ['exam'], subjects: ['math', 'sci'] }
        router.replace('/login');
      }}
      onSkipAll={() => router.replace('/login')}
    />
  );
}
```

---

## API

### `<OnboardingFlow />` props

| prop | type | default | description |
| --- | --- | --- | --- |
| `questions` | `OnboardlyQuestion[]` | — **required** | Ordered list of steps |
| `onComplete` | `(answers: OnboardlyAnswers) => void` | — **required** | Fired when Finish is pressed. **You own persistence and navigation.** |
| `onSkipAll` | `() => void` | — | If provided, renders a "Skip all" button in the header |
| `theme` | `Partial<OnboardlyTheme>` | built-in light theme | Base theme overrides; also applied in dark mode unless `darkTheme` overrides them |
| `darkTheme` | `Partial<OnboardlyTheme>` | built-in dark theme | Dark-mode-specific overrides |
| `colorScheme` | `'light' \| 'dark' \| 'system'` | `'system'` | Controls whether the flow renders in light, dark, or follows the device setting |
| `animation` | `'slide' \| 'fade' \| 'spring'` | `'slide'` | Entrance/exit transition per step |
| `nextLabel` | `string` | `'Continue'` | Primary button label on non-final steps |
| `finishLabel` | `string` | `'Finish'` | Primary button label on the last step |
| `skipLabel` | `string` | `'Skip'` | Per-question skip button label |
| `skipAllLabel` | `string` | `'Skip all'` | Header skip-all label |
| `showProgress` | `boolean` | `true` | Toggle progress bar |
| `showBack` | `boolean` | `true` | Toggle back button (hidden on first step) |

### `OnboardlyQuestion`

```ts
type OnboardlyQuestion = {
  id: string;              // unique key; used in the answers object
  title: string;
  subtitle?: string;
  emoji?: string;          // large animated emoji mascot above the title
  multiSelect?: boolean;   // allow multiple selections (default: false)
  minSelect?: number;      // required picks before Continue enables (default: 1)
  skippable?: boolean;     // show per-question Skip button
  layout?: 'grid' | 'list'; // 'grid' = 2-column emoji cards (default: 'list')
  options: OnboardlyOption[];
};
```

### `OnboardlyOption`

```ts
type OnboardlyOption = {
  id: string;
  label: string;
  emoji?: string;
  icon?: React.ReactNode;   // alternative to emoji
  description?: string;     // small helper text shown under the label
};
```

### `OnboardlyTheme`

```ts
type OnboardlyTheme = {
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
};
```

Any subset can be passed; unspecified keys fall back to `defaultTheme` (also exported).

### `OnboardlyAnswers`

```ts
type OnboardlyAnswers = Record<string, string[]>; // questionId -> selected option ids
```

Even single-select questions return an array of length 1 for consistency.

---

## Theming

Pass a partial theme override:

```tsx
<OnboardingFlow
  questions={questions}
  theme={{
    primary: '#7C3AED',
    cardSelected: '#F3E8FF',
    borderSelected: '#7C3AED',
    fontFamily: 'Inter_400Regular',
    fontFamilyBold: 'Inter_700Bold',
    borderRadius: 20,
  }}
  onComplete={(a) => {}}
/>
```

### Dark mode

Built-in light/dark mode is supported. By default the flow follows the device color scheme, or you can sync it with your app state:

```tsx
const { colorScheme } = useTheme();

<OnboardingFlow
  colorScheme={colorScheme}
  theme={{
    fontFamily: 'Inter_400Regular',
    fontFamilyBold: 'Inter_700Bold',
    borderRadius: 20,
  }}
  darkTheme={{
    background: '#0F172A',
    card: '#1E293B',
    text: '#F8FAFC',
  }}
  // ...
/>
```

---

## Controlled outcomes

The plugin is intentionally stateless about what happens **after** the flow ends. The Finish button only calls `onComplete(answers)`. You decide what that means:

```tsx
onComplete={async (answers) => {
  await AsyncStorage.setItem('onboarding', JSON.stringify(answers));
  await api.saveUserPreferences(answers);
  analytics.track('onboarding_completed', answers);
  router.replace('/home');
}}
```

The same applies to `onSkipAll` — it only fires the callback. Nothing is persisted or navigated for you.

---

## Persisting completion (first-launch gate)

A common pattern: show onboarding only once per device install.

```tsx
// On app startup, check a flag:
const done = await AsyncStorage.getItem('onboarding_done');
if (done === '1') router.replace('/home');
else router.replace('/onboarding');

// In onComplete, set it:
onComplete={async (answers) => {
  await AsyncStorage.setItem('onboarding_done', '1');
  await AsyncStorage.setItem('onboarding_answers', JSON.stringify(answers));
  router.replace('/home');
}}
```

---

## State model

`OnboardingFlow` owns its own step index and answer map via `useState`. State lives for the lifetime of the mounted component and is released on unmount. Re-mounting the flow (e.g. via navigation) starts fresh.

If you need to restore a partially-completed flow across sessions, lift state into your app and render a custom flow — a headless-hooks API is planned for a future release.

---

## Compatibility

- **Expo SDK**: 49+
- **React Native**: 0.70+
- **Reanimated**: 3.x and 4.x
- **New Architecture**: supported (layout animations via Reanimated)

---

## Development

```bash
git clone <repo>
cd rn-onboardly
npm install
npm run typecheck
```

The plugin exports source TypeScript directly (`"main": "src/index.ts"`) so consumers bundle it via Metro — no build step is required to develop.

### Publishing

```bash
npm version <patch|minor|major>
npm publish
```

Only `src/`, `README.md`, and `package.json` are published (see the `files` field).

---

## Roadmap

- Headless hooks API (`useOnboardly`) for custom layouts
- Lottie/illustration slot per question
- Branching / conditional questions
- Haptics on select (opt-in)
- i18n hook

---

## License

MIT
