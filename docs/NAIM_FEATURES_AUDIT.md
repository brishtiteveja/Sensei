# Community, payments and gamification — audit before adoption

What Naim Lasker built, where it actually lives, and what it would cost to bring
into Sensei. Written 26 Aug 2026, before any code moves.

---

## 1. The headline: nothing was lost

The assumption was that the hackathon overwrote these features. It did not.

All 98 of Naim's commits are intact in `/home/projects/ShikkhaDikkha` on
`origin/feat/naim`, tip dated **7 Jul 2026**. What actually happened is quieter
and more fixable:

- `feat/naim` has **never been merged** into `master`, `dev` or `new-ui`.
  Verified with `git merge-base --is-ancestor` against all three.
- `origin/master` on that repo is stale since **Dec 2025**, so `feat/naim` is
  the most advanced line of that work, not a side experiment.
- Sensei's mobile client began on **15 Aug 2026** as a fresh snapshot that
  never carried those screens.

So this is a branch that was never landed in a different repository — not a
deletion. Nothing needs recovering; it needs deciding on.

**The single most urgent action is unrelated to Sensei:** months of work sit on
an unmerged branch in a repo whose main line has not moved since December. That
is where it is at risk.

---

## 2. What exists

### Payments — 10 files, 1,891 lines
`backend/src/modules/payments/`, with **two live gateways**:

| gateway | file |
|---|---|
| bKash | `gateways/bkash.gateway.ts` |
| Nagad | `gateways/nagad.gateway.ts` |

Routes include `POST /initiate`, `POST /verify`, both gateways' `callback`
pairs (GET and POST), `GET /methods`, `GET /packages`, `GET /history`,
`GET /subscription/status`, `POST /credits/initiate`.

Mobile screens: `subscription.tsx`, `payment-result.tsx`, `payment-history.tsx`,
`ai-credits.tsx`.

### Gamification — 9 files, 522 lines
`backend/src/modules/xp/` (`xp-rules.ts`) and `modules/leaderboard/`, with a
Prisma migration `20260707120000_add_xp_events`. Wired into community and
mocktest so XP accrues from real activity rather than being a separate score.

### Community — 8 files, 465 lines
`backend/src/modules/community/`. Posts, comments, reactions, sharing:
`GET /:id`, `GET /:id/comments`, `POST /:id/comment`, `POST /:id/react`,
`POST /comments/:id/react`, `POST /share`.

Mobile screen: `community.tsx`.

### Documentation
Twelve design docs, written alongside the code: `payment-system.md`,
`leaderboard-xp-system.md`, `community-system.md`, `personal-growth-system.md`,
`backend-db-and-api-client.md`, `feature-status-audit.md` and others.

---

## 3. What Sensei already has that meets it halfway

More than expected. The mobile client kept the **API clients** even though the
screens went:

`src/api/ai-credits.ts`, `mocktest.ts`, `user.ts`, `conversation.ts`,
`question-bank.ts` — all present, all pointed at `EXPO_PUBLIC_API_BASE_URL`,
all currently failing soft because that variable is unset.

The Progress tab also carries a **hardcoded mock leaderboard** — three fake
names with fake points — sitting exactly where the real one plugs in.

So the mobile half of gamification is a wiring job, not a build.

---

## 4. What standing up the backend actually requires

Decision taken: **run NestJS alongside SenseiClaw** rather than porting to
Python. His code lands nearly untouched and it matches the two-backend split
the app already assumes.

The cost is concrete:

- **A second database.** 31 Prisma models with migrations to run. Postgres is
  already on the box for the question bank; this wants its own database beside
  it, not a merge.
- **~40 required environment variables**, per `config/env.validation.ts`:
  `DATABASE_URL`, JWT access/refresh secrets and expirations, Google and
  Facebook OAuth triplets, throttle settings, the AI provider block, and the
  payment credentials below.
- **Live merchant credentials** for both gateways: `BKASH_APP_KEY`,
  `BKASH_APP_SECRET`, `BKASH_USERNAME`, `BKASH_PASSWORD`, `BKASH_BASE_URL`,
  `BKASH_CALLBACK_URL`, and the Nagad equivalents including a merchant private
  key and the PG public key.
- **A public HTTPS callback URL** (`PAYMENT_CALLBACK_BASE_URL`) that the
  gateways can reach. This collides with a known open problem: nginx currently
  answers **405 to every POST** on the `/sensei/api` path. A payment callback
  is a POST from an external service, so that must be fixed first or payments
  cannot complete.
- `EXPO_ACCESS_TOKEN` for push, plus `APP_DEEP_LINK_BASE` so
  `payment-result.tsx` can be returned to after a gateway redirect.

---

## 5. Sequence

Ordered by risk and dependency, not by appetite.

**0. Protect the work.** Merge `feat/naim` into ShikkhaDikkha's `dev`. It is
independent of everything below and the only step that stops months of work
rotting on an unmerged branch.

**1. Gamification.** Cheapest and lowest risk: no external credentials, no
moderation duty, and the mobile side is already stubbed. XP rules are written
and already fire from mocktest and community activity. Landing this replaces a
fake leaderboard with a real one.

**2. Community.** Small backend (465 lines) and one screen. The real cost is
not code: an app used by **minors** with user-generated content needs a
moderation policy, a report path, and someone to action reports. Do not ship
this without deciding who does that.

**3. Payments.** Last, deliberately. It needs the nginx POST fix, live
credentials, a public callback, and it is the one area where a bug costs real
money rather than a bad answer. It also wants a sandbox run against bKash's
test environment before anything touches production.

---

## 6. Open questions for the owner

- Which Postgres instance and database name should the NestJS service use?
- Are there existing bKash and Nagad merchant accounts, or does that need
  applying for? Lead times are non-trivial.
- Who owns community moderation?
- Does Sensei want Naim's auth (Google/Facebook OAuth, JWT) as its account
  system? Right now the tutor deliberately has **no sign-in wall** and mints a
  device-local learner id instead. Those two models need to be reconciled
  rather than both being true — see `mobile/src/lib/learner.ts`.
