# Persistent memory + knowledge graph — handoff

For the session managing the sandboxed SenseiClaw. Written 16 Aug 2026.

---

## 1. The design, in one line each

Two memories, different scopes. Getting this split right is the whole idea:

| Memory | Scope | Where it lives | State |
|---|---|---|---|
| What **a student** knows | per-learner | SQLite + concept graph, in SenseiClaw | ✅ built, verified |
| **How to teach** well | agent-wide | Hermes `MEMORY.md`, read by SenseiClaw | ✅ built, ⚠ not live in sandbox |

**Why not Hermes for students.** Hermes memory is single-user and agent-scoped —
`MEMORY.md`/`USER.md` plus one provider — and `memory-graph` renders the
*agent's* skills. It has no notion of many students. Using it per-learner would
be a claim a judge could dismantle. See `NEMOCLAW.md` §6.

---

## 2. What is built (SenseiClaw commits `2daa9dc`, `f28efeb`)

**`src/clawpy/progress/`** — ported from `backend/sensei`, which had them
unwired:

- `learner.py` — per-student SQLite. Mastery is **recency-weighted** (each older
  attempt decays ×0.7), so a student is not held to their first three wrong
  answers. `profile()` derives strengths / weaknesses / recent specific
  mistakes; `as_prompt_context()` renders it terse on purpose, because a long
  profile crowds out the lesson.
- `graph.py` + `graph.json` — concepts as nodes, prerequisites as edges;
  cycle-safe traversal, **root-cause diagnosis**, mastery-gated topological walk.

**Endpoints**

| route | does |
|---|---|
| `POST /learner/{id}` | create / update the profile |
| `GET  /learner/{id}` | profile, mastery, unlocked, next concept |
| `POST /learner/{id}/observation` | record one graded moment; on a wrong answer asks the graph for the **root cause** — the upstream concept actually missing |
| `GET  /learner/{id}/path` | mastery-gated course path |
| `GET  /teaching/notes` | what Hermes craft the tutor is drawing on |

**The bit that makes it memory, not a database.** `/tutor/stream` looks up
`context_data.learner_id`, renders the profile, and injects it as a prompt
section that says to *teach as though it remembers*, not to recite the profile
back. Lookup failure is non-fatal — a tutor that has forgotten you beats one
that will not answer.

**Hermes bridge.** Every turn also folds the tail of `~/.hermes/MEMORY.md` into
a "what you have learned about teaching" section, with the instruction that if a
note contradicts the student in front of it, the student wins. The channel is
the file, not HTTP, because that is what Hermes curates itself and both run on
this box. Override with `SENSEI_HERMES_MEMORY`. Absent/empty reads as no
section, so nothing depends on Hermes having run.

**Frontend** (Sensei `4f912d7`): every tutor turn sends `learner_id` (generated
locally — no sign-in wall for a minor); each checked practice answer posts an
observation.

---

## 3. Verified

```
created Ana (BUET, exam 2026-09-10)
  3× vectors correct, 2× projectile wrong
  notes: "used sin instead of cos for the horizontal component",
         "forgot g is negative going up"

GET /learner/ana  →  strengths:[vectors] weaknesses:[projectile]
                     mastery {vectors: 1.0, projectile: 0.0}

"What should I focus on before my exam?"
  → "Focus on projectile motion — especially signs of acceleration due to
     gravity and component breakdown. You've already got vectors down, so use
     that strength… What's the horizontal component of velocity?"
```

It recalled the weakness, **both** specific slips, leaned on the known strength,
and still ended Socratically. Frontend verified: browser minted
`l_msw1api4_26of`, the turn carried it, the server created that learner.

---

## 4. ⚠ The one gap — for you

The sandboxed SenseiClaw serves a build from **just before `f28efeb`**. Probed
through nginx (422 = exists, 405 = wrong method, 404 = missing):

```
/observe  /observe/attempt  /tutor/see  /tutor/coach  /grade
/samples/custom  /handoff/*  /learner/*  /learner/*/path      all present
/teaching/notes                                               404  ← missing
```

The sandbox runs its own copy:

```
/sandbox/senseiclaw/.venv/bin/uvicorn clawpy.server:app --host 127.0.0.1 --port 4050
```

So `/sandbox/senseiclaw` needs `f28efeb` (and `02147fb`) synced in, then the
uvicorn restarted. **The sandbox has no egress to github** — the policy blocks
it deliberately — so `git pull` inside will not work; the code has to be copied
in from the host.

Two files carry the change:
`src/clawpy/server.py` (teaching_notes(), `/teaching/notes`, prompt injection)
and `src/clawpy/prompts/dikkha.py` (`_TEACHING_NOTES` section).

**Not urgent.** The bridge fails soft: with the route missing the tutor just
omits that prompt section. Per-student memory is unaffected and already live.

---

## 5. Gotchas

- **Port 4050 has one owner.** `openshell forward` and pm2 `senseiclaw` both
  binding it took the live site down once today (pm2 crash-looped 16×, API
  404). pm2 `senseiclaw` is now stopped and `sensei-fwd` owns it — keep it that
  way.
- `learners.db` lives under `SENSEI_DATA_DIR` (default `SenseiClaw/data/`). The
  sandbox has its own filesystem, so **sandbox learners are a different DB** to
  anything recorded pre-migration.
- `graph.json` ships inside the package at `clawpy/progress/graph.json`; it is
  loaded lazily and a missing file degrades to "no graph" rather than erroring.
- Hermes' `MEMORY.md` did not exist until seeded by hand. Real content should
  come from Hermes' own curation, not us writing it.

---

## 6. Honest next steps

1. Sync + restart the sandbox (above).
2. Close the loop: nothing yet *writes* teaching craft back to Hermes. The
   intended shape is that after a coaching turn SenseiClaw hands Hermes the
   outcome and lets its learning loop curate — read side is done, write side is
   not.
3. Practice observations use the **subject** as the topic, because practice
   questions carry no concept tags. That is coarse: mastery moves per subject,
   not per concept, so the graph's root-cause diagnosis is blunter than it could
   be. Tagging questions with concept ids is the upgrade.
