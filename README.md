# Sensei

**Every student's personal tutor, in every language.** Running entirely on an NVIDIA DGX Spark (GB10).

One-on-one tutoring produces the largest learning effect ever measured — Bloom's two-sigma: a
tutored student outperforms 98% of classroom peers. It has also only ever been available to
families who can afford it. Sensei is that tutor for everyone else.

It teaches **Socratically** — never handing over the answer, always guiding the reasoning — and
**personally**: it remembers you're solid on mechanics, shaky on organic chemistry, three weeks
from your entrance exam, and builds today's lesson from yesterday's mistake.

A student photographs their handwritten work; the model reads the script and notation and finds
the exact step where they slipped. The tutor picks up from there.

**And it all runs on the box.** Pull the network cable — it keeps teaching.

---

## Why the Spark

Small models are fine for English chat. They fall apart at multilingual math tutoring — a 7B
model produces stilted, error-prone explanations in Bangla, Hindi, or Swahili. The GB10's 128 GB
of unified memory lets us run a 30B multimodal model locally, which is the difference between a
toy and a tutor.

And because students are minors, keeping their handwriting, mistakes, and weak spots on-device
isn't privacy theater — it's a requirement most edtech quietly violates.

## Validated on hardware

Both halves of the design were tested against a real GB10 before any code was written:

- **Socratic tutoring in Bengali** — refused to give the answer, asked two guiding questions, in
  natural Bangla.
- **Reading written work** — given a worked solution containing a sign error, it identified the
  exact line and explained the conceptual mistake.

Both from **one** model at 72 tok/s. That matters — see below.

## The constraint that shapes the architecture

The vllm router keeps **exactly one model resident**. Requesting a different model triggers a
cold swap of **1–5 minutes**, served on the same HTTP call.

So a design with "a vision model for handwriting plus a separate tutor model" would swap on every
single interaction. Sensei instead pins **one vision-capable multilingual model** that does both
jobs. Everything in `config.py` and `bootstrap_spark.sh` exists to keep that pin honest.

## Layout

```
backend/sensei/
  config.py    model pin + the offline guard that makes the cable-pull real
  llm.py       vllm router client (streaming, vision, cold-swap-aware timeouts)
  learner.py   per-student memory in SQLite -- the two-sigma differentiator
  tutor.py     Socratic prompts + written-work diagnosis
  server.py    FastAPI: /tutor/stream, /tutor/diagnose, /learner/*
scripts/
  bootstrap_spark.sh   clean GB10 -> demo-ready, one command
docs/
  PLAN.md      build order, risks, team split
```

## Running

```bash
./scripts/bootstrap_spark.sh          # deps, reachability, catalog check, pre-warm
cd backend
uv run uvicorn sensei.server:app --host 0.0.0.0 --port 8080
```

`GET /health` reports whether the pinned model is actually resident — check it before demoing.
`warm: false` means the next request eats a cold swap.

### Configuration

| Env | Default | Notes |
|---|---|---|
| `SENSEI_BASE_URL` | `http://localhost:8010/v1` | Router base URL |
| `SENSEI_API_KEY` | — | Bearer token, if the router requires one |
| `SENSEI_MODEL` | `qwen3-vl-30b-a3b-gguf` | The pin. Changing it is an architectural decision. |
| `SENSEI_TIMEOUT` | `900` | Must exceed worst-case cold swap |
| `SENSEI_OFFLINE` | `1` | Hard-fails any off-box request. Set `0` only for remote dev. |

---

Built for the NVIDIA Spark Hack Series, Seattle. Lead track: **Spark**.
