# Sensei — handoff, 16 Aug 2026

State of the build going into the NVIDIA Spark Hack demo, what is verified, what
is broken, and what to do next. Written to be read cold.

---

## 1. What Sensei is

A Socratic AI tutor for science and maths. It never hands over the answer: it
reads the student's actual working — typed, drawn, or photographed — finds the
step where they slipped, and asks the question that gets them to it. Multilingual
(8 locales end to end), and the tutoring model runs locally on the DGX Spark, so
a minor's handwriting and mistakes never leave the box.

Pitch order that works: **problem (Bloom's two-sigma) → it sees your work →
any language / any syllabus → stays on the box → pull the cable, keep teaching.**

---

## 2. Where everything runs

| Piece | Location | Notes |
|---|---|---|
| Web app | `https://dev.perspectivity.co/sensei/` | Vite/React build, served by nginx from `web/dist` |
| Landing page | `/sensei/welcome` | standalone, outside app shell |
| Phone handoff | `/sensei/handoff?c=<code>&m=draw\|photo` | outside app shell |
| API (SenseiClaw) | `127.0.0.1:4050`, proxied at `/sensei/api` | runs **inside the NemoClaw/OpenShell sandbox**, bridged out by a gRPC service forward |
| DGX router | `https://spark-e257.tail803c7f.ts.net:8443/v1` | one model resident at a time |
| Repos | `github.com/brishtiteveja/Sensei`, `github.com/BanglaLLM/SenseiClaw` | both pushed |

**Deploy = rebuild.** nginx aliases `/sensei/` to `web/dist/`, so:

```bash
cd /home/projects/Sensei/web
VITE_SENSEI_API_URL=/sensei/api npm run build     # prebuild stages samples + notesbank
```

`VITE_SENSEI_API_URL=/sensei/api` is **mandatory**. Without it the bundle bakes a
raw `http://IP:4050` which HTTPS blocks as mixed content, and every page shows
"Cannot reach the Sensei server". This has bitten twice.

Backend changes: edit, re-upload into the sandbox, then
`scripts/sensei-sandbox-start.sh`. See
[NEMOCLAW.md](NEMOCLAW.md).

---

## 3. What is built and verified live

Everything below was exercised in a real browser against the live deployment,
not just typechecked.

### Student surface
- **Practice** — random past-exam MCQs, *and* "Special examples" (default on):
  17 curated worked problems grouped Physics / Chemistry / Mathematics, basics
  before advanced. Each card: worksheet image, difficulty badge, **Solve**,
  **Ask why**, and an eye that reveals a real student attempt containing one
  deliberate mistake.
- **Notebook** — Notion-style blocks (text+LaTeX, sketch, uploaded image),
  reorderable, autosaving. Context-bound: each lesson and each practice question
  has its own notebook, plus free pages, all listed in a library.
- **Scratchpad** — geometry toolbox (pen, line, rect, circle, triangle, arrow,
  eraser), 6 colours, 3 widths, undo/clear, zoom, per-problem draft that survives
  an accidental close.
- **Phone handoff** — QR on every drawing/upload surface; phone draws or shoots,
  image lands on the desktop. One-shot pairing codes, 10-min TTL.
- **Tutor** — streaming Socratic chat, LaTeX rendered via bundled KaTeX,
  inserted work goes through the vision path.
- **Sensei the companion** — one owl in the shell, on every route, draggable
  (position persists) and reachable *above* open modals, so it can be asked
  about the thing you are looking at. Tapping it opens a conversation, and that
  conversation is **the same one** as the Ask Sensei page: threads live in a
  shared store keyed by problem (`lib/conversations.ts`), so a question asked of
  the owl appears on the tutor page and vice versa. "Look at my work" snapshots
  whatever surface is registered and runs the two-stage pipeline into the thread.

### Teacher surface (`/sensei/teach`)
- **Grade work** — drop photos *or PDFs* + optional rubric → scorecard: score,
  letter grade, per-question verdicts naming the specific error, strengths, next
  steps. Runs on cloud Gemini (marking 30 scripts must not take the GPU from a
  student mid-lesson).
- **NoTeS-Bank benchmark** — 39 real handwritten pages from the public ICDAR 2025
  challenge (Apache-2.0), grouped by subject, each with its published class label.
  Pick a page, Sensei reads and grades it, compare against ground truth.
  *This is the credibility exhibit: we did not write these.*
- **Add question** — teacher types or photographs a rough problem, Gemini
  finalises it (subject, level, clean statement, answer, steps, likely mistake),
  and it appears as a card in its subject section.

### Observation, replay, attempts
- Events (every stroke as geometry, block edits, picks, checks, turns) batch to
  `POST /observe` → `data/observations/<date>/<session>.jsonl`.
- **Attempts**: a recording scoped to one problem. Opens with the solve sheet,
  **resumes** on return (like a chat session), "New attempt" forks explicitly.
  Banked every 10s; appends dedupe on timestamp.
- **Replay** re-renders the canvas from stored stroke geometry — not video — so
  scrubbing is exact. Per attempt, plus a global one in the sidebar.
- **Dataset**: every event carries `ctx` (problem, attempt, attemptNo, subject),
  and each attempt ships a one-row summary to `POST /observe/attempt` →
  `attempts-<date>.jsonl` with the signals research actually wants:
  `timeToFirstActionMs` (hesitation), `undos`/`clears`/`erases` (uncertainty),
  `coachAsks` + `coachVerdicts` (help-seeking), `tutorTurns`, `outcome`.

---

## 4. The two-stage vision pipeline (the core idea)

```
stage 1   image ──▶ VISION model @0.2 ──▶ raw reading
                    "line 2: negative not distributed"
                              │
stage 2   reading ──▶ TEXT-ONLY model @0.6 ──▶ {status, hint, question, focus}
          (never sees pixels)
```

**Why split.** One prompt asking a model to read handwriting *and* teach from it
does neither: it transcribes and forgets to teach, or teaches and invents lines
that are not on the page. Split, each gets its own temperature — and stage 2,
being text-only, can run on a different model entirely.

Endpoints: `POST /tutor/coach` (both stages), `POST /tutor/see` (stage 1 only,
used by chat attachments and session replay).

**Verified timings**
| Config | Time |
|---|---|
| both local (`qwen3-vl-30b-a3b-gguf`) | 8.3 s |
| local eyes + `gemini-3.5-flash` teaching | 6.4 s |

Sample output on a real handwritten page — hint: *"Watch out for the negative
sign when you expand the parentheses."* question: *"What does the −4 inside the
parentheses become when you distribute the negative sign?"* It never states the fix.

### Session replay → VLM
Frames are **reconstructed**, not captured. `buildFrames()` picks moments that
mean something (each committed stroke, each erase, each answer); `contactSheet()`
tiles up to 9 into ONE labelled image with timestamps. The model compares panel 3
to panel 4 and says where the work first goes wrong — temporal understanding for
the cost of a single call, no screen-capture permission, KB not MB.

---

## 5. ⚠ The Spark is the main risk

**Several vllm units are dead on the box.** Confirmed inactive:

```
vllm-nemotron-lightning        failed to start (inactive)
vllm-qwen3vl-30b-thinking      failed to start (inactive)
vllm-qwen (qwen3.6-27b)        failed to start (inactive)
vllm-glm46v                    failed to start (inactive)
```

Working and used now: **`qwen3-vl-30b-a3b-gguf`** (vision, fast).

**Fix before the demo:**
```bash
journalctl -u vllm-nemotron-lightning -n 50
journalctl -u vllm-qwen3vl-30b-thinking -n 50
vllm-swap list
```

**Also:** the resident model changes under us — someone/something swapped the box
to `qwen3.8-27b-unsloth-nvfp4` (no vision) mid-session, which silently broke every
vision feature. **Pin the model and check `/health` right before demoing.**

```bash
curl -s https://spark-e257.tail803c7f.ts.net:8443/health   # which model is hot
curl -s http://127.0.0.1:4050/admin/models                 # what Sensei is set to
```

---

## 6. Nemotron Lightning — the design that actually works

The model exists (`nemotron-3.5-lightning-30b-a3b-nvidia-nvfp4`) but its unit is
inactive, so this is **unverified**.

**Do not** run stage 1 and stage 2 as two *local* models. The box keeps one model
resident, so every coaching call would cold-swap — measured 2m17s and thrashing.

**Do this instead:**

| Stage | Model | Why |
|---|---|---|
| 1 · read the page | cloud Gemini vision | leaves the GPU alone |
| 2 · every teaching turn | **Nemotron Lightning, permanently resident** | never swaps, always hot |

Nemotron then performs *every pedagogical turn in the product* — a genuinely core
role, which is what the bounty asks for. The per-stage override is already built
and proven (`reading_model` / `coaching_model` on `/tutor/coach`); once the unit
starts this is a config flip, not new code.

Reasoning models return `content: null` with the answer in `reasoning`; `_chat()`
already falls back to it, and sends `chat_template_kwargs.enable_thinking=false`
for local models so stage 2 emits clean JSON.

---

## 7. Next up

**P0 — the last demo item**
- **8 demo questions**: pick 2 per subject from the 17 curated + 2 NoTeS-Bank
  pages, run each end to end (Solve → sketch → owl → coach → replay), fix what
  breaks. This is rehearsal and judgement, not code.

**P1 — polish worth doing**
- The owl panel overlaps the modal it floats above; it is draggable, but a
  smarter default placement (dodging the dialog) would be better.
- `Give to Sensei` in the notebook and the owl's `Look at my work` now feed the
  same thread but do different things (compiled notebook vs page snapshot).
  Worth deciding whether both belong.

**P2 — logged in `docs/FUTURE_PLANS.md`**
- Mobile notebook parity (per-lesson/practice buttons; persist phone photos as
  data URIs rather than evictable `file://`).
- Dashboard-wide user sessions (needs learner identity + consent first).
- LLM router as an explicit, default-off advanced feature.
- Privacy gate before collecting across real students: consent screen,
  learner-id opt-in, retention window.

---

## 8. Gotchas worth remembering

- **Build env var** — `VITE_SENSEI_API_URL=/sensei/api`, always.
- **nginx is shared infra**; editing `/etc/nginx/sites-available/dev.perspectivity.co.conf`
  is gated. Samples and the benchmark are staged into `web/public` by a prebuild
  step instead (`web/scripts/copy-samples.mjs`), not committed there.
- **Postponed annotations**: FastAPI request models must be declared *above* the
  route that uses them, or the body binds as a query param (cost an hour).
- **`i18n/strings.ts` is a module singleton** — never hoist `t.*` into a
  module-level constant; it freezes the language at import.
- Regenerate locales after adding English keys:
  `GEMINI_API_KEY=... node scripts/gen-locales.mjs` (8 locales, missing keys only).
- Sample kit source of truth is `scripts/render_samples.py`; regenerate the
  manifest with `scripts/build_samples_manifest.py`.
- Benchmark subset: `python3 scripts/fetch_notesbank.py` (HF asset URLs expire
  within the hour, so it downloads immediately).

---

## 9. Commit trail (Sensei)

```
cb04342  owl watches the whole page, recording visible in the sheet
c263472  observation dataset made analysable (ctx + attempt summaries)
57380fd  attempts — recordings scoped to a problem, resumable
69e8972  floating owl with two-stage coaching
151bf4f  session recording and replay, contact sheet for a VLM
2280922  notebook hand-off, add-question form, landing page
80f5cb4  group practice examples by subject
f6acd36  Teacher tab — grading + NoTeS-Bank benchmark
819f6a0  phone handoff (draw / photograph)
4225ec1  insertable work, session observation, scrollable modal
4648e9f  Practice "special examples"
```

**SenseiClaw hashes changed on 16 Aug — the ones a previous handoff listed are
gone.** Its history was squashed so nothing predates the hack: the whole
pre-hackathon DikkhaClaw codebase is now one `Initial import` commit, and the
tree is byte-identical to before the rewrite. Fetch fresh rather than trusting
an old hash; a stale local clone will need `git reset --hard <remote>/main`.

SenseiClaw is now 14 commits, `8122841` (Initial import, 15 Aug) →
`4015bdc` (thinking off for local coaching, 16 Aug), and lives in **two**
remotes, both current:

| remote | URL |
|---|---|
| `origin` | `github.com/BanglaLLM/SenseiClaw` |
| `nemoclaw` | `github.com/brishtiteveja/Sensei-NemoClaw` (public) |
