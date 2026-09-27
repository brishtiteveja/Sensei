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
| **NestJS** | `EXPO_PUBLIC_API_BASE_URL` | accounts, mock-test sets |
| **Sensei backend** (`backend/sensei`) | `EXPO_PUBLIC_BACKEND_URL` | community feed, saved mock-test attempts, payments, AI credits |

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

**Onboarding is chat-only.** First run goes straight to "Welcome to Sensei!" (tap Continue --
no auto-advance, no splash) → the chat setup questions → personalizing → tabs. The old "Quick Visual"
card-style flow was removed.

**Country / language picker is off for now.** Every new install starts as Bangladesh / Bangla
(`DEFAULT_REGION` in
`src/constants/languages.ts`). The picker is commented out, not deleted: to bring it back,
start `langPhase` at `'splash'`, restore the commented splash timer, and uncomment the `langPhase === 'pick'`
block and the back button in `app/welcome-onboarding.tsx`, and the `/choose-language`
redirect in `app/index.tsx`. Users can still switch language later in `my-preferences`.

## Community

Ported from ShikkhaDikkha (`mobile-app/app/community.tsx` and its NestJS module) and kept
wire-compatible with it. A student finishes a mock test (`app/mocktest-session.tsx`) and taps
**Share to Community**: the attempt is saved with a snapshot of every question, then posted.
Others react (🔥 🎉 💪 ❤️ 😮 — one each, same again removes it, never on your own), comment and
reply in a bottom sheet, and open **View Attempt** for the full answer review
(`app/community/[postId]/attempt.tsx`). `app/community/post/[postId]` is the deep-link target.

The server is `backend/sensei/community.py` (SQLite, tests in `backend/tests/`):

```bash
cd backend && uv run uvicorn sensei.server:app --host 0.0.0.0 --port 8000
uv run --with pytest --with httpx pytest -q tests/test_community.py
```

Two things differ from ShikkhaDikkha, both because Sensei has no sign-in:

- **You are your learner id** (`src/lib/learner.ts`), sent as `X-Learner-Id`. It is an
  identifier, not a credential — anyone who knows an id can post as it. Fine for a pilot; put
  real auth in front of the write routes before this is public.
- **Your name is the one you gave in onboarding** (`src/lib/display-name.ts`), else
  "Anonymous User". No avatars.

Not ported: push notifications for reactions and replies (the app has no push setup). Like the
original there is **no reporting, blocking or moderation**, and correct answers on a shared
attempt are visible to everyone. The users are minors — decide who reviews comments before
launch.

## Payments

Ported from ShikkhaDikkha (`subscription.tsx`, `ai-credits.tsx`, `payment-history.tsx`,
`payment-result.tsx` and its NestJS `payments` / `ai-credits` modules), wire-compatible like
community. Two products share one pipeline: **subscriptions** (7 days ৳59 to 6 months ৳849,
stacking on an active one) and **AI credit packs** (100 / 300 / 800). Both pay through
**bKash** (tokenized checkout) or **Nagad**. Entry points: Progress → Quick Links, the chat's
out-of-credits dialog, and the Pro paywall.

```
app                         backend/sensei/payments.py            gateway
POST /payment/initiate ───► PENDING row ── create / initiate ────► checkout URL
openAuthSessionAsync(checkoutURL, sensei://payment-result)
                             GET /payments/<gw>/callback ◄──────── browser redirect
                             execute (bKash) / verify (Nagad),
                             amount check, PENDING→APPROVED + grant
                             302 → sensei://payment-result?status=…
POST /payment/verify ──────► asks the gateway again: the safety net
```

Nothing the client sends approves a payment; only a successful execute/verify does, and only
a `PENDING` payment changes state, so double callbacks and replays cannot fulfil twice.

**Credits.** Every learner starts with 20, and each tutor turn costs one
(`app/(tabs)/ai-chat.tsx`): spent before the tutor is asked, refunded if the turn fails, and at
zero the chat offers plans or credits. An active subscription makes chats free and hides the
meter. SenseiClaw knows nothing about credits, so **this gate runs on the client and is easy to
bypass**. That is fine for a pilot, but it is not enforcement. When the credits server is
unreachable, the tutor still answers.

Server config is in `backend/.env.example`: gateway credentials, and a **callback URL that the
phone's browser can reach**. Without credentials a gateway shows as disabled. The redirect back
into the app needs the `sensei` scheme, so test in a dev build (`yarn ios` / `yarn android`).
In Expo Go the redirect does not come back, but `verify` still settles the payment once the
browser is closed.

```bash
cd backend && uv run --with pytest --with httpx pytest -q tests/test_payments.py
```

As with community, **you are your learner id**. A purchase belongs to that id, so reinstalling
without signing in loses it. Anyone who knows an id can read its history and spend its credits,
but cannot move money. Put real auth in front before this is public. Still open, as in the
original: Nagad response signatures are not verified, and payments left `PENDING` are never
swept.

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
