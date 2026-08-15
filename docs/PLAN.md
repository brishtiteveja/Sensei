# Sensei — Build Plan

**NVIDIA Spark Hack Series, Seattle.** Lead track: **Spark** (full local stack).
See and Do are supporting evidence, not competing storylines.

> Every student's personal tutor, in every language. Running entirely on the GB10.

---

## Positioning

The closest things to Sensei are **Koji** (Brilliant.org) and **Khanmigo** (Khan Academy).
Both are excellent, and both prove the method works: Socratic, never hands over the answer,
meets the student where they're stuck.

Both are also **cloud, subscription-gated, and English-first**.

That isn't a gap in their roadmap — it's structural. A tutor that runs in someone else's
datacenter cannot work without connectivity, cannot keep a minor's handwriting on-device, and
inherits whatever multilingual quality the frontier lab happened to ship.

**Sensei is the same method on the opposite architecture.**

| | Koji / Khanmigo | Sensei |
|---|---|---|
| Runs | Cloud | On the box |
| Works offline | No | **Yes — that's the demo** |
| Student data | Leaves the device | Never leaves |
| Language | English-first | Whatever the syllabus is in |
| Curriculum | Their content library | Drop in any region's syllabus |
| Cost to student | Subscription | Runs on hardware a school already owns |

**How to say it on stage:** lead with "think Khanmigo, but it runs entirely on this box and
teaches in Bangla" — that buys instant comprehension — then spend the rest of the time on what
only local compute makes possible. Do *not* lead with "open-source Khanmigo." That frames us as
a cheaper copy of a cloud product, and it references none of our actual advantage. We are not
cloning them; we are reaching the students they are structurally unable to serve.

---

## The one-sentence demo

We hand Sensei a syllabus in a language nobody in the room reads. It builds the course live —
concepts, prerequisites, practice. A student photographs handwritten work; Sensei finds the exact
step where they slipped, traces it back to the concept that actually caused it, and teaches from
there. **Then we pull the network cable — and it keeps teaching.**

---

## Validated on hardware (not assumed)

Both halves of the architecture were tested against a real GB10 before any code was written.

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

A design with "a vision model for handwriting plus a separate tutor model" would swap on every
interaction. On stage that reads as broken.

**Therefore: one vision-capable multilingual model does both jobs.**
Pinned to `qwen3-vl-30b-a3b-gguf`.

Rules that fall out of this, non-negotiable:
- Never request a second model id at runtime. One pin, whole app.
- Client timeout **≥ 600s**, or a cold swap aborts a good request.
- Stream, so load progress is visible instead of a silent hang.
- **Read `/v1/models` at boot** — never hardcode a catalog. It has already drifted from the
  vendor docs (16 models live; `nemotron-3.5-lightning` was hot and undocumented).

---

## The three pillars

### 1. Knowledge graph — *why we beat a chatbot*

Concepts are **nodes**; prerequisites are **edges**. Mastery attaches to nodes.

This is the difference between "you got projectile motion wrong" and what a real tutor does:

> You didn't fail projectile motion. You failed **vector decomposition**, two prerequisites back,
> and it has been quietly breaking things for three topics. Let's fix that instead.

A flat list of topic scores cannot express that. The graph is what turns a diagnosis into a
*root cause*, and it's the piece Koji and Khanmigo do least well — they're strong at the
in-the-moment turn, weaker at modelling the student across weeks.

The graph powers three things at once:
- **Root-cause diagnosis** — walk prerequisite edges backward from a failure to the weakest ancestor
- **Course path** — topological order through the graph, gated by mastery (the Duolingo mechanic)
- **Spaced repetition** — schedule review on *concepts*, not on questions

### 2. Persistent memory — *why it's a tutor, not a session*

Bloom's two-sigma comes from a tutor who remembers you. Everything persists on-box in SQLite:
mastery per concept, the specific slips ("wrong sign on acceleration", not "62%"), exam date,
pace. Today's lesson is built from yesterday's mistake.

Specific mistakes are stored verbatim rather than rolled into a score, because "last time the
sign of `a` slipped" is something the tutor can actually *use* in a sentence. "62% on kinematics"
is not.

### 3. Course generation — *the Do track, and the "any syllabus" claim*

An agent pipeline turns a raw syllabus into a graph:

```
syllabus (PDF/text, any language)
    → extract concepts
    → infer prerequisite edges
    → order into units/lessons
    → generate practice per concept
    → emit knowledge graph + course path
```

This is what makes "drop in Bangla HSC, Kenyan KCSE, Indonesian UN" real rather than aspirational,
and it's a genuine multi-step agentic workflow for the Do track.

---

## Architecture

```
┌─────────────────┐         LAN          ┌──────────────────────────────────┐
│  Expo mobile    │ ───────────────────► │  GB10 (Acer Veriton GN100)       │
│  - camera       │   SSE / multipart    │                                  │
│  - chat         │ ◄─────────────────── │  FastAPI (sensei)                │
│  - course path  │                      │    ├── tutor      (SSE)          │
└─────────────────┘                      │    ├── vision     (image→step)   │
                                         │    ├── graph      (concepts+prereqs)
                                         │    ├── memory     (SQLite)       │
                                         │    └── curriculum agent          │
                                         │             │                    │
                                         │             ▼                    │
                                         │   vllm router → ONE VLM          │
                                         └──────────────────────────────────┘
                                              zero egress at runtime
```

Everything is on the box. No cloud DB, no cloud inference, no telemetry — that is the entire
basis of the Spark-track claim, so it has to be literally true. See "Cable-pull audit".

---

## Scope

### Must-have — the demo spine
1. **Knowledge graph** with prerequisite edges and per-concept mastery
2. **Socratic tutor loop** — streaming, multilingual, refuses to hand over answers
3. **Photo → error localization → root cause** via the graph
4. **Persistent memory** — next turn is built from the last mistake
5. **Offline proof** — cable-pull works and is visibly demonstrated

### Should-have — Do-track evidence
6. **Curriculum agent** — syllabus in, knowledge graph + course path out
7. **Course path UI** — the Duolingo-style gated progression

### Non-goals for the weekend
- Auth, accounts, payments, multi-tenant
- Large content library — the pitch is the *engine*, not content volume
- Voice, streaks, leaderboards, social

---

## Build order

Each stage ends in something demoable, so there's always a fallback if time runs out.

| # | Stage | Ends with |
|---|---|---|
| 0 | Bootstrap for a **fresh** GB10 | Clean box → warm model, one command |
| 1 | Provider client, `/health`, model discovery | Backend streams from the pin |
| 2 | Socratic tutor SSE + Expo chat | **Demoable:** live Bengali tutoring |
| 3 | Knowledge graph + mastery, injected into prompts | **Demoable:** root-cause teaching |
| 4 | Photo → error step → concept | **Demoable:** the See beat |
| 5 | Curriculum agent: syllabus → graph | **Demoable:** the Do beat |
| 6 | Course path UI | **Demoable:** the Duolingo mechanic |
| 7 | Cable-pull audit + rehearsal | The closer, proven |

---

## Cable-pull audit (do not skip)

The closing move only lands if nothing reaches for the network:
- `SENSEI_OFFLINE=1` hard-fails any non-LAN host at the HTTP client layer
- No CDN fonts/scripts in the Expo bundle; no analytics SDK
- Model already resident — a cold swap mid-demo looks identical to a crash
- SQLite local; no hosted DB
- **Rehearse with the cable actually out**, not just in theory

---

## Risks

| Risk | Severity | Mitigation |
|---|---|---|
| ~~Real handwriting harder than rendered text~~ — **RETIRED, tested.** | Low | 20/22 on synthetic handwriting incl. 7° rotation, keystone, shadow, JPEG q28, defocus, 0.30× downscale. The earlier `(20)^2` wobble did not reproduce (12/12). See `VISION_FINDINGS.md`. |
| **Bengali numerals `০১২৩৪৫৬৭৮৯` are unreadable.** 0/9, confident fabrication every time. | **CRITICAL** | Demo in **Bengali prose + Latin digits** (validated: `c16`/`c17` pass under full phone degradation). Not fixable by image quality, prompting, or model choice — see below. |
| ~~`qwen3-vl-32b` as quality fallback~~ — **DISPROVEN.** | — | It is *worse* on Latin (17/22 vs 20/22), identically broken on Bengali (0/9), and 4× slower. **Do not use.** The pin stands. |
| Cold swap mid-demo | **High** | One pin; pre-warm; never issue a second model id |
| Fresh GB10 ≠ dev box | **High** | Bootstrap script written and rehearsed on a clean machine, stage 0 |
| Curriculum agent produces a bad graph | Medium | Hand-authored fallback graph for the demo subject; agent output shown as *live generation*, not the thing the rest of the demo depends on |
| Model quality varies by language | Medium | Bengali validated. Test any second demo language before promising it on stage |
| See track expects VSS (video-shaped) | Medium | Lead Spark. Don't claim a track we aren't really entering |
| Conference wifi | None | Irrelevant by design — that's the point |

---

## ⚠️ Demo constraint: Bengali numerals

Measured, not suspected. Full evidence in [`VISION_FINDINGS.md`](./VISION_FINDINGS.md).

The pinned model reads Bengali **prose** perfectly — `সমাধানঃ`, `উত্তর : x = 1` came back verbatim
even under the full phone-degradation stack. It cannot read Bengali **digits**:

| Input | Expected | Got | Score |
|---|---|---|---|
| Printed digit chart, pristine 90px | `০১২৩৪৫৬৭৮৯` | `0627867966` | 2/10 |
| One line, printed, pristine 110px | `২x + ৭ = ১৫` | `5x + 9 = 50` | — |

~30% digit accuracy against a 10% chance baseline, on *perfect* input. This is not a
handwriting problem, an image-quality problem, or a prompting problem — the model lacks a
reliable internal representation of those glyphs.

**Why this is worse than a plain failure:** it never hedges. On two cases where the student
wrote `x = ৮ × ২ = ১৬` (multiplying instead of dividing), it transcribed `x = 11 / 2 = 5.5` —
**inverting the student's actual error**. On a fully correct Bengali page it invented a mistake
in all four variants. A tutor that confidently teaches against a problem the student never wrote
is worse than one that says "I can't read this."

**Therefore the demo writes Bengali prose with Latin digits.** `c16`/`c17` validate this path
end to end, including under phone degradation. If that is not authentic to how HSC students
actually write, the alternative is to demo the vision beat in a Latin-numeral language
(Indonesian UN, Kenyan KCSE — both already in the pitch) and keep Bangla for the tutoring beat,
which is flawless.

**Also worth adopting:** the model is not deterministic even at `temperature=0`. A preprocessing
pass (deskew → lighting flatten → autocontrast → cap 1400px) converts borderline coin-flip cases
into deterministic passes at ~70 extra prompt tokens and no latency cost. Its value is variance
reduction on stage, not headline accuracy.

**Do not adopt** the two-pass "strict" prompt — it scored *worse* (18/22) by over-analysing
correct lines. Only its crossed-out-work instruction is worth salvaging.

---

## Team split (3–5 people)

- **Inference / tutor** — provider client, Socratic loop, prompt engineering
- **Graph / memory** — knowledge graph, mastery model, root-cause traversal
- **Mobile** — Expo app, camera, chat, course path
- **Curriculum agent** — syllabus → graph pipeline
- **Demo & narrative** — bootstrap, rehearsal, cable-pull audit, the pitch

The last role is not a spare. The demo is the deliverable.
