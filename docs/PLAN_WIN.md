# Sensei: Winning Plan

**This file is the strategy to win the judging. `PLAN.md` stays the engineering reference. Where they conflict, this file wins until Sunday 11:00 AM.**

Deadline: **Sunday, Aug 16, 11:00 AM PT**. Submission = GitHub link + project description + 3-5 minute video. Late = rejected. Submitting takes 10-15 minutes on its own.

---

## 0. What this plan adds on top of PLAN.md

`PLAN.md` says how to build Sensei; this file says how to win with it by Sunday 11:00. Same architecture, same pillars, same one-model pin. Everything below is what is **new** here:

**New demo beats** (scoreable moments, not in PLAN.md):
- **Concurrency**: 3-4 students streaming from one box at once. "A school buys one box and it tutors the whole classroom."
- **Live stats overlay** (tok/s, unified memory, `egress: 0`) plus a DGX Dashboard shot: criterion 2 as on-screen evidence
- **Annotated photo**: a box drawn on the exact wrong line of the student's own handwriting
- **Seeded "yesterday" learner**: memory pillar visible on camera, not narrated
- **Failing-ping split screen**: the cable pull made undeniable
- **Cold-open video** structure (wow at 0:00) with subtitles for the Bangla

**New process** (how the remaining hours are spent):
- The **video is the deliverable**, recorded Saturday evening, not Sunday
- **Hard gates with kill criteria**: Sat 10:00 Expo-or-web, 12:00 feature freeze, 18:00 ambitious gate
- **Friday validation list**: real handwriting, concurrency scaling, photo coordinates, second language
- Notion video-criteria check first, mentor feedback pass Sat 14:00, **submission dry run** Sat 22:00
- **Verify-before-camera list**: no unchecked number enters the script

**New packaging** (judge-facing):
- **Scoring map**: every demo beat mapped to the 4 criteria (section 2); features with no row do not get built
- README **"judging map"** section, and a project description written one sentence per criterion

**New kit**: our own travel router, a `demo/` data kit with validated insurance photos, and a web-UI fallback that replaces Expo if it slips.

**New ambitious tier** (gated behind Saturday 18:00, section 9): teacher dashboard, four-language wall, unrehearsed second syllabus, SVG diagrams from the same pinned model.

## 1. Decode the rubric

Judges score 100 points over 4 criteria (weights unpublished; assume 25 each):

1. **Technical Execution & Completeness**: a working, complex system
2. **NVIDIA Ecosystem & Spark Utility**: leveraged the unique hardware and software provided
3. **Value & Impact**: useful in the real world
4. **Innovation & Execution**: pushed the boundaries

Their philosophy sentence is the whole game: *"not a deck or a simple API wrapper; a functioning system that ingests raw data, processes it locally using the Acer Veriton GN100, and produces a valuable result."*

Our sentence, said verbatim in the video and the description: **"Sensei ingests a raw syllabus and a photo of a student's handwriting, processes both on the GN100 with one pinned vision model, and produces a root-cause diagnosis and a personal lesson. Offline."**

In practice judges remember three things: **did it work, did it need this box, one moment they can retell**. Every hour we spend must feed one of those.

## 2. Scoring map: every demo beat pays a criterion

| Demo beat | C1 Complete | C2 Spark | C3 Value | C4 Innovation |
|---|---|---|---|---|
| Raw syllabus → knowledge graph, built live | ✅ | | ✅ | ✅ |
| Photo of handwriting → exact wrong step | ✅ | ✅ (VLM on box) | ✅ | ✅ |
| Root cause: weak concept 2 prerequisites back | ✅ | | ✅ | ✅✅ |
| Tutor recalls yesterday's specific mistake | ✅ | | ✅ | ✅ |
| Stats overlay: tok/s, unified memory, egress 0 | | ✅✅ | | |
| Concurrency: several students, one box | ✅ | ✅✅ | ✅✅ | |
| Cable pull, tutor keeps talking | ✅ | ✅ | ✅ | ✅ |

If a proposed feature has no row here, we do not build it this weekend.

## 3. Demo spine (P0: without these we do not submit)

| # | Item | Fallback | Done by |
|---|---|---|---|
| 1 | Full loop: photo → error step → root cause via graph → Socratic teaching → memory updated | Hand-run each stage over HTTP if UI slips | Fri night |
| 2 | Web UI on phone browser over LAN: camera upload, SSE chat, course path view | curl + a plain HTML page shown on the laptop | Sat 14:00 |
| 3 | Pre-warm + `/health` green before every run | none, this is free | always |
| 4 | Seeded learner: "yesterday's" session in SQLite so the tutor references a past slip inside a 4-minute video | Narrate it instead of showing it | Sat 12:00 |
| 5 | Demo data kit in `demo/`: insurance handwriting photos (validated), syllabus files, seed script | none | Sat 12:00 |
| 6 | Cable-pull audit rehearsed with the cable actually out | Cut the beat rather than fake it | Sat 16:00 |
| 7 | The video, recorded and edited | none. This is the submission | Sat 23:00 |

## 4. Cheap point multipliers (P1: high points per hour)

- **Stats overlay** in the UI corner: model name, live tok/s, unified memory in use, `egress: 0`. Turns criterion 2 from a claim into on-screen evidence. Also show the DGX Dashboard for a few seconds: that is "software provided", their words.
- **Concurrency beat**: 3-4 simultaneous student streams on one box, aggregate tok/s visible. One line to say: "a school buys one box and it tutors the whole classroom at once." This upgrades the story from student gadget to school infrastructure. **Validate Friday night**: the GGUF backend behind the router may not batch well. If throughput does not scale, show 2 students or drop the beat silently.
- **Annotated photo**: draw a box on the exact wrong line of the student's own handwriting. Validate coordinates Friday; fallback is quoting the wrong line as highlighted text, which is nearly as good.
- **Subtitles** added in the video edit. Judges do not read Bangla. Without captions our best beats are noise to them.
- **README judging map**: a section in the README titled "How this maps to the judging criteria", one short paragraph per criterion. Judges skim repos; hand them the scorecard.
- **Second language spot-check**: validate one more language (e.g., Hindi or Spanish) Friday. Only promise on camera what we validated, per our own rule.

## 5. The video is the product now

**First task, 15 minutes, Friday: read the demo video criteria on the Hackathon Notion and adjust this section to match it.** Also ask organizers: is there live judging beyond the video, and what exactly counts as "software provided"?

Structure (target 4:30, hard cap 5:00):

| Time | Beat |
|---|---|
| 0:00 | **Cold open**: split screen. Left: `ping 8.8.8.8` failing. Right: tutor streaming natural Bangla. "No internet. Full tutor. Sixty seconds of why." |
| 0:20 | Problem: Bloom's two-sigma, the best learning effect ever measured, priced out of reach. And students are minors: their mistakes should never leave the building. |
| 0:50 | **Do beat**: raw syllabus in a language nobody in the room reads goes in; concepts, prerequisites, and a course path build live on screen. |
| 1:50 | **See beat**: phone photographs real handwriting — **Bengali prose with Latin digits, NOT Bengali numerals** (see §5a; this is measured, not stylistic). Sensei names the exact wrong step, walks the graph back: "you did not fail projectile motion, you failed vector decomposition, two prerequisites ago." Then it teaches Socratically and the memory panel shows yesterday's slip being used. |
| 3:20 | **Spark beat**: stats overlay, 128 GB unified memory is why a 30B multimodal model fits at all, one-model pin as the answer to the router's cold-swap constraint, then the concurrency shot. |
| 4:10 | **Close**: hand pulls the cable on camera mid-sentence. The tutor finishes its question. End card: repo, one line. |

Production: script it word for word. 1080p screen capture. Phone shots on a tripod. Check audio on the first take, not the last. Export and re-watch before midnight Saturday.

## 5a. Measured facts that override earlier assumptions

Everything here is measured on the box, not estimated. Full method in
[`VISION_FINDINGS.md`](./VISION_FINDINGS.md). **These supersede any conflicting claim in this
file or `PLAN.md`.**

### 🔴 The See beat must not use Bengali numerals

The pinned model reads Bengali **prose** perfectly, and Bengali **digits** not at all.

| Input | Expected | Got |
|---|---|---|
| Printed digit chart, **pristine 90px** | `০১২৩৪৫৬৭৮৯` | `0627867966` (2/10) |
| One line, **printed, pristine 110px** | `২x + ৭ = ১৫` | `5x + 9 = 50` |

0/9 across every Bengali-numeral case, ~30% digit accuracy against a 10% chance baseline — on
*perfect printed input*. Not handwriting, not image quality, not prompting. Preprocessing and a
digit key in the prompt both fail to fix it.

**It never hedges.** On two cases where the student wrote `x = ৮ × ২ = ১৬` (multiplying instead
of dividing), it transcribed `x = 11 / 2 = 5.5` — *inverting the student's real error*. On a
fully correct page it invented a mistake in all four variants. On camera that is not a miss,
it is the tutor confidently teaching a problem the student never wrote.

**Demo path:** Bengali prose + Latin digits. Validated end to end under the full phone
degradation stack (`c16`, `c17`). If that is not authentic to how HSC students actually write,
run the See beat in a Latin-numeral language (Indonesian UN / Kenyan KCSE, both already in the
pitch) and keep Bangla for the tutoring beat, which is flawless.

### ✅ Handwriting risk retired
20/22 on synthetic handwriting including 7° rotation, keystone, shadow gradient, JPEG q28,
2.4px defocus, 0.30× downscale, cramped lines, crossed-out margin work. Zero failures in the
full phone-stack group. Photo quality was never the risk.

Validated insurance photos, already in `docs/vision_samples/`: **`c07`, `c08`, `c19`, `c20`,
`c10`** (Latin, hard-looking, pass reliably) and **`c16`, `c17`** (the safe Bangla samples).
§3 item 5's data kit can be built from these today rather than shot from scratch.

### ✅ Concurrency scales — the beat is on

| Streams | Aggregate | Per-stream | TTFT | Success |
|---|---|---|---|---|
| 1 | 33.6 tok/s | 33.6 | 1.16s | 1/1 |
| 2 | 63.1 tok/s | 31.6 | 0.59s | 2/2 |
| 4 | **82.2 tok/s** | 20.5 | 1.15s | **4/4** |

2.45× aggregate throughput at 4 concurrent, no errors, sub-1.2s TTFT throughout. The GGUF
backend *does* batch — §11's "may not scale" risk is retired. Per-stream 20.5 tok/s still
outpaces reading speed. **Say four students, show four.**

### ❌ The 32b fallback is disproven
`qwen3-vl-32b-instruct-gguf` is *worse* on Latin (17/22 vs 20/22), identically broken on
Bengali (0/9), and 4× slower (12.3s vs 3.0s median). Struck from `PLAN.md`. The pin stands.

### ⚠️ Two cautions for the script
- **Do not say "72 tok/s".** That figure is from vendor docs. Measured Bengali generation is
  **33.6 tok/s** single-stream — Bengali tokenizes less efficiently than English. Quote the
  aggregate concurrency number instead; it is both verified and a better story.
- **The model is nondeterministic even at `temperature=0`.** Identical inputs gave different
  answers across runs. Rehearsing a beat once proves nothing; run each camera beat several
  times. The preprocessing pass (deskew → flatten → autocontrast → cap 1400px) converts
  borderline cases into deterministic passes and is worth adopting purely for variance control.

### 🔍 Still unvalidated (§4's annotated photo)
Coordinate extraction from the VLM was **not** tested. VLMs are generally unreliable at precise
bounding boxes, and a box drawn on the *wrong* line is worse than no box. Treat §4's fallback —
quoting the wrong line as highlighted text — as the default, and only upgrade if coordinates
verify cleanly today.

---

## 6. Offline staging (make the cable pull undeniable)

- Bring **our own travel router**: box + phone on our AP, no dependence on venue wifi. The cable we pull is the AP's upstream WAN cable.
- Split screen: failing `ping 8.8.8.8` beside the streaming tutor. Visible proof, not narration.
- `SENSEI_OFFLINE=1` stays on; it hard-fails any off-LAN request at the client layer.
- Model resident before any take (`/health` shows `warm: true`); a cold swap on camera looks identical to a crash.
- Rehearse the whole flow with the cable out, twice.

## 7. Schedule with hard gates

**Friday (tonight)**
- Read Notion video criteria; question to organizers about live judging and provided software
- Real-handwriting test session: multiple pens, papers, lighting; pick 2 insurance photos that work
- Validate: concurrency scaling, annotated-photo coordinates, any second language
- Finish the P0 loop end to end; seed the "yesterday" learner

**Saturday**
- 10:00 gate: Expo working? If not, web UI, no debate
- 12:00 gate: feature freeze for P0 and P1; anything not working gets its fallback
- 14:00: show the demo to a mentor or organizer; adjust to their reaction
- 16:00: cable-pull rehearsal ×2, full run under 4:30
- 17:00-21:00: record takes, edit, subtitles
- 22:00: **submission dry run**: upload the video, walk the form to the last screen
- 18:00 gate for the ambitious tier (section 9). Not done with P0+P1 by then means the tier is dead, no exceptions

**Sunday**
- 08:00: fresh-eyes watch of the video, fix only errors
- **10:00: submit. One hour early, by design**
- Then prep the live pitch with the same beats, if live judging exists

## 8. Submission checklist

- GitHub repo public, MIT license, no secrets or keys in history
- README top: one-liner, **video link**, architecture diagram, judging-criteria map, 60-second quickstart
- Project description: ~200 words, one sentence per criterion, containing our philosophy sentence from section 1
- Video: within 3-5 minutes, criteria from Notion satisfied, audible, captioned
- Dry run done Saturday 22:00; real submission Sunday 10:00

## 9. Ambitious tier (gate: P0 + P1 done by Saturday 18:00)

Ordered by points per hour. Take from the top, stop when time runs out.

1. **Teacher dashboard**: one HTML page from SQLite showing a class mastery heatmap: "8 of 30 students are weak on vector decomposition." This completes the classroom economics story and doubles the Value score of the concurrency beat. Seed synthetic learners for the visual.
2. **Four-language wall**: four chat panes streaming at once in four languages on one box. Only languages validated Friday get a pane.
3. **Live second syllabus**: mid-video, drop in a syllabus we never rehearsed (e.g., Kenyan KCSE chemistry) and let it build. Turns "any syllabus" from a claim into a stunt. Keep the rehearsed one as the primary; this is a bonus shot.
4. **The tutor draws**: the pinned VLM emits an SVG diagram (projectile trajectory, force arrows) rendered in the UI. Same model, no swap, works offline. Validate quality first; drop silently if wobbly.
5. **Mid-chat language switch**: "explain that again in English." One prompt line, small flex, zero risk.

## 10. Do not do

- **No second model id at runtime, for anything**: video generation, voice, a "better" OCR. A cold swap is 1-5 minutes and it kills the exact moment the demo depends on. If a garnish requires a swap, it is not a garnish, it is a grenade.
- No new features Sunday. Sunday is submit and rehearse.
- No number said on camera that we did not verify (section 12).
- No leading with "open-source Khanmigo"; lead with "Khanmigo cannot run here" and pat the box.
- No venue-wifi dependence anywhere in the demo path.

## 11. Win risks (delta from PLAN.md's table)

| Risk | Mitigation |
|---|---|
| Video recorded too late, submission window missed | Hard gates Sat 17:00 record, Sat 22:00 dry run, Sun 10:00 submit |
| ~~Real handwriting fails on camera~~ — **retired**, 20/22 | Insurance photos already validated and in `docs/vision_samples/` (§5a) |
| ~~Concurrency does not scale on GGUF~~ — **retired**, 4/4 at 82.2 tok/s | Measured (§5a). Say four students, show four |
| **Bengali numerals fabricate confidently on camera** | **Bengali prose + Latin digits only.** Not a tuning problem — see §5a |
| Annotated-photo coordinates land on the wrong line | Untested. Default to the highlighted-text fallback unless verified today |
| Judges stop watching at minute 1 | Cold open puts the wow at 0:00, not 4:00 |
| Venue network surprises | Own travel router; nothing in the demo path touches upstream |
| Demo overruns 5:00 | Script to 4:30; the edit enforces it |

## 12. Verify before saying on camera

Numbers move judges, wrong numbers sink us. Verify each before it enters the script, else cut it:

- ~~Koji exists and is cloud/subscription~~ — **verified**. Brilliant.org's AI tutor, Socratic
  ("without ever just giving you the answer"), foundational math and coding, free tier is a
  limited preview then Premium. Safe to say: cloud, subscription-gated, English.
- Khanmigo current pricing (still unchecked)
- Count of students taking Bangla HSC (or any national-exam figure we cite)
- GN100 street price for the cost-per-student math
- ~~Our own tok/s and concurrency throughput~~ — **measured**, §5a. Use **33.6 tok/s**
  single-stream Bengali and **82.2 tok/s aggregate across 4 students**. Do *not* use the
  vendor's 72 tok/s figure; we did not reproduce it in Bengali.
- Load time and memory footprint (still unmeasured — cut from the script unless verified)

## 13. Team lanes (3-5 people)

| Lane | Owns |
|---|---|
| Loop | P0 #1: diagnose → root cause → teach → memory, prompts |
| Frontend | Web UI, stats overlay, course path, (ambitious: dashboard, language wall) |
| Demo ops | Data kit, seeding, network staging, cable audit, rehearsal clock |
| Curriculum | Syllabus → graph live build, second-syllabus stunt |
| Narrative | Video script, recording, edit, subtitles, README, description, submission |

With 3 people: Narrative merges with Demo ops, Curriculum merges with Loop. **The Narrative lane is not a spare; the video is the deliverable.**
