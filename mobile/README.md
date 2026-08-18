# Sensei — mobile

Expo (SDK 54) client for Sensei. The UI began as the ShikkhaDikkha design — Duolingo-style
learn path, Socratic chat, practice, progress — and now carries the web client's identity
(owl, gradient, subject art) and its tutoring features (vision coaching, session recording,
learner memory).

```bash
cd mobile
yarn install            # yarn.lock is the source of truth (npm needs --legacy-peer-deps)
yarn typecheck          # tsc --noEmit
yarn bundle-check       # expo export --platform android — catches what tsc cannot
yarn start
```

There is no test runner. `bundle-check` is the closest thing to a build gate: it resolves
every import and native module, so it catches the class of error that only shows up at
runtime. Run it before committing anything structural.

---

## Two backends, on purpose

| Service | Base URL | Owns |
|---|---|---|
| **SenseiClaw** | `EXPO_PUBLIC_SENSEI_API_URL` | tutor, curriculum, question bank, vision, learner memory, telemetry |
| **NestJS** | `EXPO_PUBLIC_API_BASE_URL` | accounts, credits, mock-test sets |

Neither has a hardcoded production fallback any more. An unset URL fails immediately and says
so, because a wrong host that answers is harder to debug than no host at all — the NestJS
client used to fall back to the *tutor's* host and port, which presented as login bugs.

### The endpoint has to be HTTPS, and it has to accept POST

Both have bitten us:

- **Cleartext.** iOS ATS and Android 9+ block plain HTTP. `http://<ip>:4050` works in dev and
  fails on every real device.
- **A read-only edge.** As of Aug 2026 `https://drishtikon.life/sensei/api` serves GET and
  answers **405 to every POST** from nginx itself. Curriculum browsing looks healthy while
  chat, coaching and recording — all POST — fail. The fix is on the prod nginx location.

`src/api/tutor-endpoint.ts` owns the base URL and `diagnoseTutor()`, which probes GET *then*
POST and reports which of `cleartext` / `unreachable` / `read-only` it is. Preferences shows
the verdict. When someone reports "the tutor is down", look there first.

---

## What the tutor can see

Three layers, each usable without the ones above it.

**1. The flight recorder** (`src/lib/observe.ts`) records what the student *did* — strokes as
geometry, answers, turns — not pixels. No screen-record permission, tiny payloads, and a text
model can reason over it directly. `digest()` folds the last ~2 minutes into the tutor's
prompt so its questions react to the workspace.

React Native has no `sendBeacon`/`keepalive`, so the recorder flushes when the app
**backgrounds** — that is when a phone session actually ends.

**2. Attempts** (`src/lib/attempts.ts`) scope those events to one problem. An attempt is one
sitting, resumable: returning to a problem continues it rather than starting a stub. Answering
closes it. `useAttemptRecording()` is the hook screens use; `summarize()` produces the one-row
account (time to first action, undos, erases, coach asks, outcome) posted to `/observe/attempt`.

**3. Replay** (`src/lib/replay.ts`) rebuilds the canvas at any timestamp from the log — replay
is a deterministic re-render, which is only possible because strokes were stored as geometry.
`contactSheet()` tiles the turning points into one image for `/tutor/coach`, so the model sees
*how* the work developed in one call instead of N calls over a video.

Two deliberate differences from the web renderer:

- Stroke geometry lives in `src/lib/strokes.ts`, shared by the canvas that draws it and the
  replay that redraws it. The web keeps two copies of the same shape maths.
- The web bakes panel captions into the sheet with `fillText`. On Skia that would mean
  shipping a typeface, so captions ride as prompt text keyed to panel numbers instead.

---

## Vision coaching

A photo goes to `/tutor/see` (read the page) then `/tutor/coach` (decide what to ask) — never
to the general chat endpoint, which would answer the question instead of teaching it. Entry
points: an image attachment in chat, the floating owl's camera action, and "Ask Sensei" on a
replay.

Photos are downscaled to 1600px (`src/lib/image.ts`) first. The model gains nothing from 12
megapixels and the upload is the difference between a coach that answers and one that times
out.

When no vision model is loaded the server returns `coach: null` with a reason. Say so — never
answer as though the work had been read.

---

## Learner memory

`src/lib/learner.ts` mints a device-local learner id — no sign-in wall, because the students
this is for are minors and a registration wall before the first question loses most of them.
It is deliberately *not* the NestJS account id: signing in should not reset what the tutor
remembers.

Every tutor turn carries `learner_id` and the digest. Every checked answer posts an
observation, which moves recency-weighted mastery and lets the concept graph name a **root
cause** — the upstream idea actually missing, rather than the symptom just got wrong.

---

## Voice, on the device

`src/lib/speech.ts`. Dictation via `expo-speech-recognition`, read-aloud via `expo-speech`.
Both run on the handset: a child reading homework aloud is exactly the audio that should never
leave it, and it works with no signal. `speakable()` strips Markdown and turns LaTeX into "the
formula" — a voice that says "dollar v backslash sin" is worse than no voice.

`localeFor()` maps the app language to BCP-47 for both directions. Dictation was hardcoded to
`bn-BD` and was silently mis-recognising the other seven languages.

---

## Design

`src/theme/gradient.ts` carries the web's `--s-grad-1/2/3` verbatim; the accent (`#4F46E5`)
already matched. `src/components/art/` holds the owl and subject art ported to
`react-native-svg`.

`subjectVisual()` matches subject names in the languages they are **stored** in — this client
keys off localised names, and the web's English-only matcher would send every subject to the
hash and give physics an arbitrary hue.

The floating owl (`src/components/floating-sensei.tsx`) is deliberately calmer than the web's:
no cursor to follow and no margin to roam in on a phone, so it snaps to an edge and leads with
the camera. It hides on the chat tab, notebook, replay and onboarding.

---

## Screens

`app/welcome-onboarding.tsx` → tabs: `index` (home), `learn`, `ai-chat`, `practice`,
`progress`, plus `quiz`, `lesson-detail`, `mocktest`, `mocktest-session`, `notebook`,
`replay`, `my-preferences`, `choose-language`.

## i18n

Eight languages (`en bn hi es id ms ha zh`) in `src/i18n/*.ts`. `t()` splits keys on `.`, so a
literal `'outcome.correct'` member is unreachable — nest it. Templates use `{token}`.

## Vendored packages

`vendor/rn-onboardly` and `vendor/rn-motionfold` are checked in and referenced with
`file:./vendor/...`. Nothing resolves outside this repo. Metro watches both folders.

## Known gaps

- Feature tours (the web's `?` walkthroughs) are not ported.
- Teacher tools — grading, NoTeS-Bank — are web-only; mobile is student-facing. The API
  client (`src/api/sensei-work.ts`) already exposes `/grade` and `/samples/draft` if that
  changes.
- Practice observations use the **subject** as the topic, so mastery moves per subject rather
  than per concept and root-cause diagnosis is blunter than it could be. Tagging questions
  with concept ids is the upgrade.
