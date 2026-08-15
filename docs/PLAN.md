# Sensei — Build Plan

**NVIDIA Spark Hack Series, Seattle.** Lead track: **Spark** (full local stack).
See and Do are supporting evidence, not competing storylines.

> Every student's personal tutor, in every language. Running entirely on the GB10.

---

## The one-sentence demo

We hand Sensei a syllabus in a language nobody in the room reads. It builds the course live.
A student photographs handwritten work; the tutor finds the exact step where they slipped and
teaches from there. **Then we pull the network cable — and it keeps teaching.**

---

## Validated on hardware (not assumed)

Both halves of the architecture were tested against `spark-e257` before writing any code.

| Assumption | Result |
|---|---|
| One VLM can tutor Socratically in Bengali | ✅ Refused the answer, asked two guiding questions, natural Bangla |
| Same VLM can localize an error in written work | ✅ Found the exact line (sign of `a`) and explained why |
| Speed adequate for live tutoring | ✅ `qwen3-vl-30b-a3b-gguf` @ 72 tok/s |

**Known wobble:** the model misread `(20)^2` as `(20)×2` on rendered text while still reasoning
correctly. Real handwriting is harder. See Risks.

---

## The constraint that shapes everything

The vllm router keeps **exactly one model resident**. Requesting a different model triggers a
cold swap of **1–5 minutes**, served on the same HTTP call.

The original pitch implied two models (a VLM for handwriting + a 27B–70B tutor). On one box that
is a swap per interaction — on stage that reads as broken.

**Therefore: one vision-capable multilingual model does both jobs.**
Pinned to `qwen3-vl-30b-a3b-gguf`.

Rules that fall out of this, and are non-negotiable:
- Never request a second model id at runtime. One pin, whole app.
- Client timeout **≥ 600s** everywhere, or a cold swap aborts a good request.
- Stream (`"stream":true`) so load progress is visible instead of a silent hang.
- **Read `/v1/models` at boot** — do not hardcode a catalog. It has already drifted from the docs
  (16 models live; `nemotron-3.5-lightning` was hot and isn't in the vendor list).

---

## Architecture

```
┌─────────────────┐         LAN          ┌──────────────────────────────┐
│  Expo mobile    │ ───────────────────► │  GB10 (Acer Veriton GN100)   │
│  - camera       │   SSE / multipart    │                              │
│  - chat         │ ◄─────────────────── │  FastAPI (sensei)            │
└─────────────────┘                      │    ├── tutor    (SSE)        │
                                         │    ├── vision   (image→step) │
                                         │    ├── learner  (SQLite)     │
                                         │    └── curriculum agent      │
                                         │           │                  │
                                         │           ▼                  │
                                         │  vllm router → ONE VLM       │
                                         └──────────────────────────────┘
                                              zero egress at runtime
```

**Everything is on the box.** No cloud DB, no cloud inference, no telemetry. That is the entire
basis of the Spark-track claim, so it has to be literally true — see "Cable-pull audit".

---

## What we are building (and explicitly not)

Fresh repo. No code lifted from ShikkhaDikkha/DikkhaClaw — those are Gemini-backed and
cloud-shaped. Prior work informs the *design*, not the source.

### Must-have — the demo spine
1. **Socratic tutor loop.** Streaming, multilingual, refuses to hand over answers.
2. **Photo → error localization.** Student shoots their work; same model finds the first wrong step.
3. **Learner model.** Persists strengths/weaknesses/exam date; next turn is built from last mistake.
   *This is what makes it a tutor instead of a chatbot — it's the two-sigma claim.*
4. **Offline proof.** Cable-pull works and is visibly demonstrated.

### Should-have — Do-track evidence
5. **Curriculum agent.** Syllabus in → units/lessons/practice out. Runs as a multi-step agent.

### Non-goals for the weekend
- Auth, accounts, payments, multi-tenant
- Full question bank (seed a handful; the pitch is the *engine*, not content volume)
- Voice, mock exams, streaks, leaderboards

---

## Build order

Each stage ends in something demoable, so we always have a fallback if time runs out.

| # | Stage | Ends with |
|---|---|---|
| 0 | Bootstrap script for a **fresh** GB10 | Clean box → warm model, one command |
| 1 | Provider client + `/health` + model discovery | Backend talks to the pin, streams tokens |
| 2 | Socratic tutor SSE + Expo chat | **Demoable:** live Bengali tutoring |
| 3 | Learner store, injected into prompt | **Demoable:** it remembers you |
| 4 | Photo → error step, wired into tutor | **Demoable:** the See beat |
| 5 | Curriculum agent | **Demoable:** the Do beat |
| 6 | Cable-pull audit + rehearsal | The closer, proven |

---

## Cable-pull audit (do not skip)

The closing move only lands if nothing reaches for the network. Before the demo:
- `SENSEI_OFFLINE=1` hard-fails any non-LAN host at the HTTP client layer
- No CDN fonts/scripts in the Expo bundle; no analytics SDK
- Model already resident (pre-warmed) — a cold swap mid-demo looks identical to a crash
- SQLite local; no hosted DB
- **Rehearse with the cable actually out**, not just in theory

---

## Risks, and what we do about them

| Risk | Severity | Mitigation |
|---|---|---|
| **Real handwriting ≫ harder than rendered text.** Already saw `^2` misread. | **High** | Test on genuine photos of real handwriting early — day one, not day two. Fall back to `qwen3-vl-32b` (higher quality, 10 tok/s) *only* if the swap cost is paid once at boot. Have a known-good sample image as demo insurance. |
| Cold swap mid-demo | **High** | Pin one model; pre-warm; never issue a second model id |
| Fresh GB10 at the event ≠ our dev box | **High** | Bootstrap script written + rehearsed on a clean machine, stage 0 |
| Conference wifi | Low | Irrelevant by design — that's the whole point |
| Model quality varies by language | Medium | Bengali validated. Test any second demo language before promising it on stage |
| See track expects VSS (video-shaped) | Medium | Lead Spark, not See. Don't claim a track we're not really entering |

---

## Team split (3–5 people)

- **Backend / inference** — provider client, tutor loop, prompt engineering
- **Mobile** — Expo app, camera, chat UI
- **Curriculum agent** — syllabus → course pipeline
- **Demo & narrative** — bootstrap, rehearsal, cable-pull audit, the pitch itself

The fourth role is not a spare. The demo is the deliverable.
