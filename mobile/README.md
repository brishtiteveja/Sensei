# Sensei — mobile

Expo client for the Sensei tutor running on the GB10. Four screens: **Tutor** (streaming
Socratic chat), **My work** (photo → error localisation), **Course** (the knowledge graph
as a gated path), **Settings** (backend URL + box health).

Everything it talks to is the box. There is no second host.

---

## Run it

```bash
cd mobile
npm install
npx expo start          # then scan the QR with Expo Go, or press a/i
```

Then open **Settings** in the app and set the **Base URL** to the GB10's LAN address.
No rebuild is needed to retarget it — that is the whole point of that field.

Checks that do not need a device:

```bash
npm run typecheck       # tsc --noEmit
npm run bundle-check    # full Metro bundle; catches bad imports and missing assets
```

## Pointing it at the box

On the GB10:

```bash
cd backend
uv run uvicorn sensei.server:app --host 0.0.0.0 --port 8080   # 0.0.0.0, not localhost
hostname -I                                                    # the address to type
```

In the app → **Settings** → Base URL. A bare IP is enough; `:8080` is assumed and the
resolved URL is shown under the field. It is persisted with AsyncStorage, so it survives
app restarts.

**Settings also shows box status.** `warm: true` means the pinned model is resident.
`warm: false` means the next request pays a 1–5 minute cold swap, served on that same
request — pre-warm before demoing, because on stage a cold swap is indistinguishable
from a hang. The same indicator is mirrored as a dot in the Tutor header.

Learner id (default `demo`) keys the on-box memory: mastery, past mistakes, exam date.
Change it in Settings to demo a second student.

## The offline contract

The closing move of the pitch is pulling the network cable, so the app is built to have
nothing to lose:

- **No CDN fonts.** Hind Siliguri ships as `.ttf` files in `assets/fonts/` (OFL, licence
  included) and is loaded with `expo-font`. It covers Bengali *with* conjunct shaping
  (`akhn`/`blwf`/`half`/`rphf`/`pres`/`pstf`) *and* Latin, so one family renders the whole
  UI. A Bengali-only font would have dropped every English glyph to a mismatched system
  fallback.
- **No analytics, no telemetry, no crash SDK, no remote images.**
- The only network destination in the bundle is the base URL you type in Settings.
  `npm run bundle-check` and grepping the output for `http` is a cheap way to keep that
  true.

One caveat for the rehearsal: **Expo Go loads the JS bundle from the Metro dev server on
your laptop.** That is still LAN-only, so the cable-pull works — but the laptop has to
stay on the same network as the phone. For a laptop-free demo, build a standalone APK
(`npx expo run:android --variant release`, or EAS) so the bundle and fonts are embedded
in the app.

## Streaming: why XMLHttpRequest

`src/api/stream.ts` reads `/tutor/stream` with `XMLHttpRequest`, not `fetch`.

React Native's `fetch` does not implement `response.body` as a `ReadableStream`. A
fetch-based reader does not throw — it just resolves once with the whole body, or hangs.
On device that looks exactly like the model thinking forever. XHR is the only transport in
RN that surfaces bytes as they arrive.

The mechanics that matter if you touch that file:

- `xhr.onprogress` must be **assigned before `send()`** — that assignment is what switches
  RN into incremental-delivery mode.
- Each progress event hands you the entire `responseText` so far, so the reader keeps a
  cursor of how much it has already consumed and slices off the tail.
- Frames are split on a blank line. Payloads are JSON-encoded server-side, so no literal
  `\n\n` can appear inside one.
- `xhr.timeout` is **900 s**. The floor is 600 s: a cold model swap is served on this same
  request. Every other call in the app goes through the same XHR helper for the same
  reason (`fetch` has no timeout knob), except `/health`, which fails fast at 20 s so an
  unreachable box is not mistaken for a warming one.

## Demo notes

- **The root-cause redirect is the money shot.** When `/tutor/stream` returns a non-null
  `root_cause` on the `start` event, the chat renders an amber banner above the reply:
  *"GOING BACK TO THE REAL PROBLEM"*. It only fires when a `concept_id` is sent, so the app
  defaults the tutoring target to `path.next` and lets you retarget it by tapping any
  unlocked concept in **Course**.
- **My work** takes 30–60 s (vision pass + a tutoring turn), longer from cold. It shows a
  running elapsed counter rather than a spinner, and the request keeps going if you switch
  tabs. "Continue in chat" drops the tutor's opening question into the conversation.
- **Course** shows `name_local` (Bangla) first with the English name underneath.
  Mastered ≥ 0.7, matching `MASTERY_THRESHOLD` in `backend/sensei/graph.py`. If the path
  screen says no course is loaded, the box needs `POST /curriculum/build`.

## Layout

```
App.tsx                 tab shell, font loading; no navigation library
src/api/http.ts         the one HTTP path (XHR + 900s timeout + URL normalisation)
src/api/stream.ts       SSE over XHR -- read the comments before changing it
src/api/sensei.ts       endpoint wrappers
src/api/types.ts        wire types, mirrors backend/sensei/server.py
src/state/store.tsx     single provider: settings, health, course, chat, diagnosis
src/screens/            ChatScreen, WorkScreen, PathScreen, SettingsScreen
src/components/ui.tsx   Txt/Btn/Field/Card -- Txt forces the bundled font everywhere
assets/fonts/           Hind Siliguri Regular + Bold (OFL)
```

Dependencies are deliberately few: `expo-font`, `expo-image-picker`,
`@react-native-async-storage/async-storage`, `react-native-safe-area-context`. No
navigation library, no icon pack, no state library — four screens do not justify them, and
every dependency is one more thing that can fail on a borrowed phone at an event.
