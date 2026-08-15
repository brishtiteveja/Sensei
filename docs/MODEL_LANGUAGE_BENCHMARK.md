# Multilingual harness benchmark

Tested through SenseiClaw's **real** `/tutor/stream` path — system prompt, language
override and all — not raw model calls. So this measures the harness, not just the model.

Same prompt in five languages: *"I don't understand projectile motion, help me."*

Harness: `/tmp/lang_harness.py`. Each model required a 1–5 min cold swap.

---

## Verdict: keep `qwen3-vl-30b-a3b-gguf`

Nothing tested beats it where it matters, and the alternatives lose vision entirely.

| | qwen3-vl-30b **(pin)** | kimi-linear-48b | qwen3.8-27b |
|---|---|---|---|
| **Vision** | ✅ | ❌ text-only | ❌ not exercised |
| Speed | **2–8s** | 4–5s | 10–18s |
| Spanish | ✅ | ⚠️ grammar error | ✅✅ best |
| **Bengali** (primary) | ✅ | ✅ | ❌ **invents vocabulary** |
| Hindi | ✅ lectures first | ❌ **script contamination** | ✅✅ best |
| Swahili | ❌ **echoes input** | ❌ **wrong physics** | ⚠️ evasive |
| Indonesian | ✅ | ✅ | ✅ |

---

## Why the alternatives lose

### `kimi-linear-48b-a3b-gguf` — text-only, and contaminates scripts

Cannot be the pin at all: no vision, so it can't read handwriting. Under the
one-model-resident rule that makes it a non-starter unless we accept a cold swap per
photo.

Worse, its **Hindi reply switched into Bengali script mid-answer**:

> आइए बुनियादी सवालों के जवाब देते हैं:
> - **তোমার যদি কোন বস্তু $u$ velocities দিয়ে ছুটে বেরোয়…**

Its Swahili was also factually wrong — it claimed projectile motion is constant
velocity with no other force acting, which is precisely backwards, and then invoked
Newton's first law unprompted. Spanish had a grammar error ("cuando tú disparamos").

### `qwen3.8-27b-unsloth-nvfp4` — better Hindi/Spanish, **regresses on Bengali**

Genuinely the best Spanish and Hindi of the three: clean, concise, properly Socratic
(it asks *"how do you understand projectile motion in your own words?"* rather than
lecturing first).

But it **invents Bengali physics vocabulary** — the exact failure mode that made
Swahili unusable. It offered **আলো** ("light") for *horizontal* and **উলো** (not a
word) for *vertical*, and misspelled প্রক্ষেপ গতি as "প্রকষ্প গতিনি".

That is disqualifying. Bengali is the primary language and this failure is invisible
to anyone who doesn't read Bangla — fluent, confident, and wrong.

It is also **2–3× slower** (10–18s vs 2–8s), which is the difference between a tutor
that feels live and one that feels like it's thinking.

---

## Swahili is broken on every model

Three different failure modes, zero successes:

| Model | Failure |
|---|---|
| qwen3-vl-30b | Echoed the student's message back verbatim |
| kimi-linear-48b | Fluent but factually inverted physics |
| qwen3.8-27b | Fluent, ignored the question, generic greeting |

This corroborates [`LANGUAGE_FINDINGS.md`](./LANGUAGE_FINDINGS.md), which found Swahili
producing confident invented physics vocabulary. **Do not demo Swahili.** KCSE is
examined in English anyway — demo Kenya in English.

---

## Safe to demo

- **Tutoring:** Spanish, Indonesian, Hindi, Bengali (single-turn)
- **Vision / handwriting:** Latin digits only — see [`VISION_FINDINGS.md`](./VISION_FINDINGS.md)
- **Avoid:** Swahili entirely; non-Latin numerals in any language

---

## Bug this surfaced

The Swahili reply from qwen3.8 opened with *"Ni Dikkha, mwalimu wako"* — **the system
prompt still identifies the tutor as Dikkha**. The mobile rebrand covered the app's
strings but not SenseiClaw's `prompts/dikkha.py`, so the model introduces itself under
the old name in any language. Worth fixing before recording.
