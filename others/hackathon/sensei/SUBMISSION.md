# Spark Hackathon — submission answers

Copy-paste ready. Three fields need a decision from you first; they are marked
**⚠ DECIDE** and explained at the bottom.

---

## Project Name

```
Sensei
```

## Team Name

```
Sensei to Gakusei
```

## Team Member Names & Email Addresses

```
Abdullah Khan Zehady (azehady@perspectivity.co)
Shubhashish Roy Dipta (iamdipta@gmail.com)
```

## Submission Track

```
🧨 Spark
```

---

## Submission Description

```
Sensei is every student's personal tutor, in every language. One-on-one tutoring
produces the largest learning effect ever measured — Bloom's two-sigma — and has
only ever been available to families who can afford it. Sensei runs that tutor
on a desk, on-device, in eight languages.

It teaches Socratically: it never hands over the answer. A student photographs
or draws their handwritten working and Sensei reads the script and the notation,
finds the exact line where the reasoning slipped, and asks the question that gets
them to it. That runs as two stages — a vision model reads the page at low
temperature, then a text-only model teaches from that reading and never sees the
pixels. One prompt asked to do both does neither: it transcribes and forgets to
teach, or teaches and invents lines that are not on the page.

Students learn maths, physics, chemistry and biology, or generate a course from a
regional admissions syllabus. Memory works at two scopes. Per-student: mastery is
recency-weighted, and a prerequisite knowledge graph does root-cause diagnosis —
on a wrong answer it names the upstream concept actually missing, so the tutor
teaches the cause rather than the symptom. Agent-wide: a Hermes agent accumulates
teaching craft across students — which explanation lands, which misconception
recurs — folded into every turn, with the rule that if a stored note contradicts
the student in front of it, the student wins. Teachers get a second surface — grade a stack of photos or PDFs
against a rubric, and a benchmark tab that runs Sensei against 39 real handwritten
pages from the public ICDAR 2025 NoTeS-Bank challenge with their published labels,
so its reading can be checked against ground truth we did not write.

A 30B multilingual vision-language model runs locally on the DGX Spark. Because
students are minors, that is a requirement rather than a feature — and we enforce
it: the entire tutor backend runs inside a NemoClaw / OpenShell sandbox whose only
permitted network destination is the local Spark. A request to github.com from
inside it fails closed, live, in one command. In the demo we build a multilingual
course, diagnose a handwritten solution, continue the Socratic lesson, then pull
the network cable and keep teaching.
```

---

## Demo Video URL

**⚠ DECIDE — still blank.** Up to 5 minutes, YouTube or Loom.

Suggested 5-minute order, which follows the strongest-claim-first rule:

1. **0:00** Problem — two-sigma, and who it is currently for.
2. **0:30** Socratic refusal in Bangla or Hindi. Show it declining to answer.
3. **1:30** Photograph handwritten working with a real sign error → it names the line.
4. **2:45** Teacher tab → NoTeS-Bank benchmark against published labels.
5. **3:30** `nemoclaw sensei exec -- curl https://github.com` → fails closed.
6. **4:15** Pull the cable. Keep teaching.

---

## GitHub Repo

```
https://github.com/brishtiteveja/Sensei
```

Backend harness (also public):
`https://github.com/brishtiteveja/Sensei-NemoClaw`

> Worth adding the second link if the form allows it — the sandbox work that
> supports the NemoClaw bounty lives there.

---

## AI Models Used

```
Sensei is model-agnostic by design. It exposes 22 local models on the DGX Spark
plus 3 cloud models, switchable at runtime from the admin surface and overridable
per pipeline stage on a single request (reading_model / coaching_model), so the
vision stage and the teaching stage can run on different models in the same call.

PRIMARY (the pin, what the demo runs on)
  qwen3-vl-30b-a3b-gguf — one resident vision-language model doing both
  multilingual Socratic tutoring and handwritten-work diagnosis, ~72 tok/s.

NVIDIA MODELS ON THE BOX, selectable at runtime
  nemotron-3.5-lightning-30b-a3b-nvidia-nvfp4  Nemotron 3.5 Lightning
  nemotron-ocr-v2                              NVIDIA OCR — handwriting reading
  cosmos-reason2-32b / cosmos-reason2-8b       NVIDIA Cosmos Reason
  locateanything-3b                            NVIDIA LocateAnything (grounding)
  qwen3-next-80b-instruct-nvidia-nvfp4         NVFP4, 80B
  qwen3.6-35b-a3b-nvidia-nvfp4                 NVFP4
  qwen3.6-27b-nvidia-nvfp4                     NVFP4, vision-capable
  gemma-4-31b-it-nvidia-nvfp4                  NVFP4
  gemma-4-26b-a4b-nvidia-nvfp4                 NVFP4

  Seven of these are NVIDIA NVFP4 builds — the 4-bit format the GB10 is built
  for — which is what makes a 30B-to-80B roster fit in 128 GB of unified memory
  and stay swappable on one desk-side device.

OTHER LOCAL MODELS
  qwen3-vl-32b-instruct-gguf, qwen3-vl-30b-a3b-thinking, glm-4.6v-awq-4bit,
  internvl3-78b-gguf (all vision) · qwen3.6-35b-a3b-qwen-fp8,
  qwen3-next-80b-thinking-cyankiwi-awq, kimi-linear-48b-a3b-gguf,
  laguna-s-2.1-poolside-nvfp4, gemma-4-26b-a4b-unsloth-nvfp4,
  qwen3.8-27b-unsloth-nvfp4, muse-glimmer-30b-gguf

CLOUD, teacher surface only
  gemini-3.5-flash-lite / gemini-3.6-flash / gemini-3.7-flash — batch grading of
  submitted scripts and finalising a teacher-authored question. Deliberately
  off-device so marking thirty papers never takes the GPU from a student
  mid-lesson. No student handwriting from the Socratic path is sent to it.
```

> **Two accuracy notes before you paste.**
>
> 1. The router keeps **one** model resident, so "switch at runtime" costs a
>    1–5 min cold swap, and several vLLM units on the box are currently dead.
>    The wording above says *selectable* and *exposed*, which is exactly true and
>    survives scrutiny. Avoid "we run all of these" — a judge can check `/health`
>    and see one loaded model.
> 2. `qwen3-vl-30b-a3b-thinking` is listed separately from the GGUF pin; your
>    original draft merged them into "GGUF / thinking variant". They are two
>    different entries and the demo uses the GGUF one.

---

## Tools Used

```
NVIDIA DGX Spark (GB10) · DGX Spark vLLM router with an OpenAI-compatible local
endpoint, driving a 22-model roster with runtime and per-stage model selection ·
NVFP4 quantised builds for the GB10.

NemoClaw 0.0.103 + OpenShell 0.0.85 — Landlock, seccomp and a network namespace
with an OPA egress policy. The entire tutor backend runs inside the sandbox and is
bridged out by an OpenShell gRPC service forward, so nothing is published from the
container. The policy permits exactly two destinations: the local Spark, and
Gemini (POST only, /v1beta/**) for teacher grading. Everything else fails closed.

Hermes Agent (Nous Research) — a NemoClaw runtime, used for the memory job it is
actually built for. The split is by scope: Sensei's own SQLite store holds what a
*student* knows, and Hermes holds how to *teach* — accumulated craft about which
explanation lands and which misconception recurs. Hermes and SenseiClaw run on the
same box, so they integrate over a file rather than a socket: each turn folds the
tail of ~/.hermes/MEMORY.md into the prompt, with the rule that if a stored note
contradicts the student in front of it, the student wins. GET /teaching/notes
exposes exactly what is being drawn on, so the claim is inspectable rather than
asserted, and absent or empty memory simply renders no section — the tutor
degrades silently rather than breaking if Hermes has never run.

FastAPI · React + TypeScript + Vite, 8 locales · SQLite for per-student mastery
(recency-weighted) and the prerequisite knowledge graph used for root-cause
diagnosis · KaTeX bundled locally · ICDAR 2025 NoTeS-Bank (Apache-2.0) as an
external handwriting benchmark.
```

---

## Bounty checkboxes

### ☐ Nemotron Lightning — **⚠ DECIDE: recommend leaving unchecked**

`nemotron-3.5-lightning-30b-a3b-nvidia-nvfp4` is in the router's catalogue, but
its vLLM unit is not running, and nothing in the product has executed a single
token through it. The design that would use it is written up and the per-stage
override it needs (`coaching_model`) is already built and proven — but built is
not the same as used.

Checking this box asserts the model is in the project. A judge can list models
and ask for a trace. If you want it honestly:

```bash
# WARNING: evicts the demo model; 1–5 min cold swap. Do this AFTER the demo.
curl -s https://spark-e257.tail803c7f.ts.net:8443/v1/chat/completions \
  -H "Authorization: Bearer $DGX_API_KEY" -H 'Content-Type: application/json' \
  --max-time 900 -d '{"model":"nemotron-3.5-lightning-30b-a3b-nvidia-nvfp4",
  "messages":[{"role":"user","content":"hi"}],"max_tokens":16}'
```

If that returns text, flip `coaching_model` to it, run one real coaching turn,
and check the box with a clear conscience. If it 503s, leave it.

### ☑ NemoClaw / OpenShell — **check this one**

This is your strongest bounty claim and your current description does not mention
it at all. Verified today:

| check | result |
|---|---|
| tutor backend runs inside the OpenShell sandbox | yes — serves the live site |
| `inference.local` (the Spark) | 200, real `owned_by: "dgx-spark"` catalogue |
| `github.com`, `pypi.org`, `huggingface.co`, `clawhub.ai` | fail closed |
| Gemini, POST, `/v1beta/**` only | reachable — teacher grading only |
| real `/tutor/query` through the public URL | correct answer, ~14 s |

The sandbox permits exactly two destinations. Everything else is denied by policy.

---

## GB10 Experience — which capabilities were most valuable

```
The 128 GB of unified memory was the decision that shaped the architecture. It let
us keep a 30B vision-language model resident and use that one model for both
multilingual Socratic tutoring and handwritten-work diagnosis.

That mattered because the router keeps exactly one model resident, and asking for
a different one triggers a cold swap of one to five minutes served on the same
HTTP call. The obvious design — a vision model for handwriting plus a separate
tutor model, both local — cold-swaps on every single interaction; we measured
2m17s and thrashing. So we pinned one vision-capable multilingual model and, where
we wanted a genuinely different second brain, put that stage in the cloud instead.
Both stages local measured 8.3 s end to end on a real handwritten page; local eyes
with cloud teaching measured 6.4 s.

On hardware the model tutored naturally in Bangla and located the exact sign error
in a worked solution, at roughly 72 tok/s. Because the students are minors, we did
not just keep inference local — we made it enforceable. The whole backend runs
inside a NemoClaw / OpenShell sandbox and its only permitted network destination is
the Spark, which we can demonstrate failing closed in one command rather than
asserting on a slide.
```

## Recommend GB10 to other developers (1–10)

```
9
```

```
GB10 turns privacy-first multimodal AI into a practical desk-side deployment
target. The unified memory and local throughput made a 30B vision-language tutor
genuinely usable in a live, offline interaction — a category of product that is
simply not buildable on a cloud-first stack when the users are children. The main
friction was operational visibility: when the router cold-swaps, there is little
feedback about what is happening or how long it will take, and a model can be
swapped out from under a running application without any signal to it.
```

## Local inference vs previous environments (1–10)

```
9
```

```
Compared with cloud-first development we got predictable privacy, no per-token
dependency, and a demo we can do with the cable pulled. Once warm, latency was
comfortably inside interactive tutoring range. The costs are real but tolerable:
model setup, warm-up and resident-model management are hands-on in a way managed
APIs are not, and several vLLM units on the box failed to start with little
diagnostic signal. Knowing which model is actually resident became something we
had to check before every demo.
```

## What would have made GB10 more effective

```
Faster cold starts, and a way to pin a model so another process cannot evict it —
we were silently swapped onto a non-vision model mid-session, which broke every
vision feature with no error. Clearer resident-model and unified-memory telemetry,
and better failure diagnostics when a vLLM unit refuses to start. Simpler
one-command model packaging and quantisation. Stronger turnkey multimodal examples
for image plus streaming chat. And time-to-first-token profiling that works
offline, since that is the number that decides whether a local tutor feels alive.
```

---

## Three decisions before you submit

1. **Demo video URL is blank.** Nothing else matters if this is missing.
2. **Nemotron Lightning box.** Recommend unchecked unless you run the probe
   above. It is the one claim in the form that is currently unverifiable.
3. **The on-device claim needs its one caveat kept.** Student handwriting on the
   Socratic path never leaves the box, and that is enforced. Teacher-side grading
   deliberately uses cloud Gemini. Saying so plainly is stronger than a blanket
   "everything is on-device" that a judge can puncture by reading the policy file
   — and the reason (never take the GPU from a student mid-lesson) is a good one.
