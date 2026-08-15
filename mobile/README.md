# Sensei — mobile

Expo (SDK 54) client for Sensei. The UI is the ShikkhaDikkha design imported unchanged —
Duolingo-style learn path, Socratic chat, practice, progress — rebranded to Sensei.

```bash
cd mobile
yarn install            # yarn.lock is the source of truth (npm needs --legacy-peer-deps)
yarn typecheck          # tsc --noEmit
yarn bundle-check       # expo export --platform android
yarn start
```

## Backend

Everything the app needs comes from **SenseiClaw**:

```
EXPO_PUBLIC_SENSEI_API_URL=http://167.86.98.204:4050   # default when unset
```

- `src/api/sensei.ts` — `/tutor/stream` (SSE), `/tutor/query`, `/tutor/suggestions`, `/tutor/hint`.
  The `language` field is sent with every tutor call and drives the global-language behaviour.
- `src/api/curriculum.ts` — `/curriculum/*` and `/practice/questions`. `getQuestions({ lang })`
  asks the server to translate the Bangla question bank on demand; do not drop that parameter.

`src/api/client.ts` is the legacy REST client (profile, preferences, mock-test sets). Sensei
ships without that service, so those calls fail soft — the screens degrade to empty states.

## Screens

`app/welcome-onboarding.tsx` → tabs: `index` (home), `learn`, `ai-chat`, `practice`, `progress`,
plus `quiz`, `lesson-detail`, `mocktest`, `mocktest-session`, `my-preferences`, `choose-language`.

## Vendored packages

`vendor/rn-onboardly` and `vendor/rn-motionfold` are checked in and referenced with
`file:./vendor/...`. Nothing resolves outside this repo. Metro watches both folders.
