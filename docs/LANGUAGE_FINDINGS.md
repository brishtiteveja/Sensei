# Language findings — which languages can we put on stage?

**Date:** 2026-08-15
**Model under test:** `qwen3-vl-30b-a3b-gguf` (the pin). No other model was touched; the pin was resident before and after (`/health` → `{"loaded":["qwen3-vl-30b-a3b-gguf"]}`).
**Endpoint:** `https://spark-e257.tail803c7f.ts.net:8443/v1`, `temperature=0`.
**Scope:** 7 languages for tutoring (English + Bengali as controls, then Hindi, Indonesian, Swahili, Spanish, Arabic); 6 languages × 4 numeral-OCR conditions, plus a decisive random-digit probe in 4 scripts.
**Volume:** 49 tutoring calls (7 languages × 7 items) + 116 vision calls.
**Reproduce:** `lang_samples/_tutor_test.py`, `lang_samples/_gen_numerals.py` → images, `lang_samples/_run_numerals.py`, `lang_samples/_grade_numerals.py`. Raw responses in `lang_runs/*.jsonl`.

---

## Verdict in five lines

1. **The Bengali digit failure generalises to Devanagari, partly to Arabic-Indic, and not at all to Latin.** On non-inferable random digits the model scores Latin 100%, Arabic-Indic 72%, Devanagari 61%, Bengali 41%. **No non-Latin numeral system is demo-safe.**
2. **Indonesian and Spanish are clean on both beats** — tutoring and vision. These are the two safe additions.
3. **Swahili tutoring is a hard fail.** It is fluent-sounding word salad with invented physics vocabulary ("the *economy* of space", "until the *factory*", "the attraction of *heat*"). It would pass unnoticed in a room where nobody reads Swahili. This is the most dangerous result in the report.
4. **Bengali multi-turn tutoring is weaker than "validated" implies** — it loops verbatim and never confirms a correct answer. Reproduced twice. See the caveat below.
5. **Recommended second demo language: Spanish.** Judge-legible, flawless on both beats, and the fastest non-English language measured.

---

## A. Socratic tutoring quality (text only)

System prompt as specified, `temperature=0`. Each language got a 6-turn physics thread (ball thrown up at 20 m/s, correct answer h = v²/2g = **20.4 m**), a standalone algebra item with a wrong student answer (`3x+7=22`, student says `x=9`), and an 8-sentence explanation item for speed.

The thread is built to test the three things that make tutoring real:
- **turn 2** — student says "I'm stuck, which formula?" → does it narrow, or hand over the answer?
- **turn 3** — student asserts **40 m**, which is wrong → does it catch and redirect?
- **turn 6** — student offers **20.4 m**, which is right → does it confirm?

| Language | In-language? | Natural? | Socratic (withholds)? | Catches wrong 40 m? | Confirms correct 20.4 m? | Verdict |
|---|---|---|---|---|---|---|
| English (control) | yes | yes | yes | yes | yes | **PASS** |
| **Spanish** | yes | yes | yes | yes | yes (implicit) | **PASS** |
| **Indonesian** | yes | yes | yes | yes | partial — see note | **PASS (with note)** |
| **Hindi** | yes | yes | yes | yes | yes | **PASS** |
| **Arabic** | yes | yes | yes | yes | yes | **PASS** |
| Bengali (control) | yes | yes | yes but loops | **no** | **no** | **WEAK — see caveat** |
| **Swahili** | yes | **no** | yes | partial | **no** | **FAIL** |

### Samples

**Spanish — PASS.** Turn 2, student stuck:
> «¿Qué tipo de movimiento describe la pelota al subir?»
> *"What kind of motion does the ball describe as it rises?"*

Turn 3, student says 40 m:
> «¿Estás seguro? ¿Puedes verificarlo usando la fórmula de la velocidad final en caída libre?»
> *"Are you sure? Can you check it using the formula for final velocity in free fall?"*

Turn 6, student says 20.4 m:
> «¿Y por qué no 40 metros como pensaste al principio? ¿Qué te llevó a esa diferencia?»
> *"And why not 40 metres as you thought at first? What led you to that difference?"*

Accepts the correct answer and turns it into reflection. Textbook Socratic. Grammatically flawless, natural register, correctly informal (`tú`).

**Indonesian — PASS, one note.** Turn 3:
> "Tidak, coba pikirkan lagi. Apakah kecepatan bola saat mencapai titik tertinggi masih 20 m/s? Atau mungkin berubah menjadi nol?"
> *"No, think again. Is the ball's speed at the highest point still 20 m/s? Or maybe it becomes zero?"*

Natural, correctly pedagogical. **The note:** at turn 4 it introduced `g = 10 m/s²` unprompted (normal in Indonesian schooling), then at turn 6 told the student their correct 20.4 m was only *"Hampir benar!"* ("almost right") and pushed a recompute with g = 10. Defensible pedagogically, but it means **the Indonesian thread does not end on a clean confirmation.** If Indonesian goes on camera, specify g in the student's question.

**Hindi — PASS.** Turn 3, catching the wrong answer:
> "अच्छा, लेकिन याद रखो, गेंद ऊपर जाते समय धीमी होती है, क्योंकि गुरुत्वाकर्षण उसे धीमा कर रहा है। तो अब बताओ, जब गेंद की गति शून्य हो जाए, तो वह कितनी ऊँचाई तक पहुँचेगी?"
> *"Okay, but remember, the ball slows as it rises because gravity is slowing it. So now tell me, when the ball's speed becomes zero, what height will it have reached?"*

Turn 6: "बिल्कुल सही!" (*"Absolutely right!"*). Correct terminology (गुरुत्वाकर्षण बल), natural informal register. Hindi tutoring is genuinely good.

**Arabic — PASS.** Turn 6:
> «نعم، جيد جدًا! هل تعرف ما الذي يمثل 20.4 متر في هذا السياق؟»
> *"Yes, very good! Do you know what 20.4 metres represents in this context?"*

Correct MSA, correct physics vocabulary (قوة الجاذبية), RTL renders fine, confirms the right answer. Tutoring in Arabic is solid.

**Swahili — FAIL.** The dialogue turns look plausible at a glance but are lexically wrong. Turn 1:
> "Kwa nini mpira hupungua baada ya kuvuka?"
> *"Why does the ball decrease after crossing?"* — "hupungua" (decreases) has no object, and "baada ya kuvuka" (after crossing) is meaningless here.

Turn 2:
> "Je, ni aina gani ya nguvu inayochanganya mpira?"
> *"What kind of force **mixes/confuses** the ball?"* — should be *inayovuta* (pulls). It never names gravity.

The 8-sentence explanation is where it collapses completely:
> "Mpira uliorushwa juu hupunguza kasi kwa sababu ya mvuto wa hewa na **uchumi wa anga**. […] mpira hupunguza kasi hadi kwa **kiwanda**, hivyo husimama. Baada ya kusimama, mpira huanza kuvuka chini kwa sababu ya **mvuto wa joto**."
> *"A ball thrown up slows because of air attraction and **the economy of the atmosphere**. […] the ball slows until **the factory**, so it stops. After stopping, the ball begins to **cross** downward because of **the attraction of heat**."*

"Uchumi wa anga" (economy of space), "kiwanda" (factory) and "mvuto wa joto" (attraction of heat) are not physics terms — they are confident nonsense. It never once says *nguvu ya uvutano* (gravity). It is also heavily repetitive.

**This is the worst possible failure mode for a demo:** it is fluent, confident, correctly-shaped Swahili that a Seattle audience cannot evaluate, and it is teaching a Kenyan student that heat pulls objects down.

### Caveat on Bengali — the "validated" language is weaker in multi-turn than the prior finding implies

VISION_FINDINGS validated Bengali *prose transcription*. Bengali *multi-turn tutoring* has a distinct problem. Run twice, identical both times (`lang_runs/tutor.jsonl`, `lang_runs/tutor_bn_repeat.jsonl`):

- Turns 2 and 3 return a **verbatim repeat** of turn 1's question: "তুমি কি জানো যে বলটি উপরে উঠার সময় কোন ত্বরণ কাজ করছে? সেটা কী হতে পারে?" (*"Do you know what acceleration acts on the ball as it rises? What could it be?"*)
- At turn 3 the student says **40 metres**, which is wrong. The model **does not notice**; it just repeats the same question.
- At turn 6 the student offers the **correct 20.4 m**. The model **does not confirm it**, deflecting to "what if g = 10?".

So across a 6-turn Bengali thread the tutor never validates a right answer and never corrects a wrong one. Single-turn Bengali is fine (the algebra item is good: *"Check again, substitute into 3x + 7 = 22"*). **Keep the Bangla beat to one or two turns and it holds; a long unscripted Bengali thread will visibly stall.**

Note the contrast: Bengali *single-shot prose* is excellent — the 8-sentence explanation is accurate, well-termed (মাধ্যাকর্ষণ বল) and natural. The weakness is specifically multi-turn dialogue state.

---

## B. Numeral OCR

All images pristine printed/handwriting-font, white background, no rotation, noise or compression — the point is to isolate glyph perception, exactly as `d01`–`d04` did. Reading `২` as `2` counts as correct.

Three prompt conditions, because they measure different things:
- **plain** — "transcribe every character exactly". The model may answer by *copying the glyphs*.
- **tolatin** — "write them using ordinary Western numerals 0–9". This forces the **glyph → value** mapping.
- **sensei** — the production prompt from VISION_FINDINGS.

**`tolatin` is the number that matters.** Sensei must do arithmetic on the *values*; a transcription that echoes glyph shapes without knowing what they are worth is useless downstream. The distinction turned out to be decisive (see Arabic).

### The decisive test: random, non-inferable digits

The 0–9 chart and the worked solution are both **guessable**. The model can emit a memorised `0..9` run, or infer numbers from the arithmetic. So the real test is three lines of random digit groups — `47 91 26 / 30 85 19 / 72 64 53` — rendered in each script with identical content and layout. 18 digits, 3–4 repeats.

| Script | Language | plain (copy allowed) | **tolatin (glyph→value)** | Stable across reps? |
|---|---|---|---|---|
| Latin | Spanish | 100% | **100%** | yes (1 distinct read) |
| Arabic-Indic | Arabic | 100% *(copied glyphs)* | **72%** | yes (1 distinct read) |
| Devanagari | Hindi | 35% | **61%** | yes (1 distinct read) |
| Bengali | Bengali | 42% | **41%** | mostly (2 distinct reads) |

**Arabic is the interesting case and the reason the `tolatin` split was necessary.** Given `٤٧ ٩١ ٢٦ …` it echoes the Arabic-Indic glyph string back **perfectly, 4/4 reps** — which scores 100% and looks like a pass. Asked for the *values*, the same image gives `47 91 27 / 3.80 19 / 72 74 03`: it drops ٠ to a bare `.`, and misreads ٦→7 and ٥→0. Under the Sensei prompt it degrades further, rendering ٧ as the Latin letter `V` and ٤ as `E` — treating the digits as Latin lookalikes:

> `Line 1: 4V 91 26 / Line 2: 3. 80 19 / Line 3: V2 7E 03`

**The model can copy Arabic digits without knowing their values.** Copying is not reading.

### Full results by condition (`plain`, mean over 3 reps)

| Language | Script | Digit chart 0–9 | Isolated equation | Worked solution | Handwriting chart |
|---|---|---|---|---|---|
| Indonesian | Latin | 100% | 100% | 100% | 100% |
| Spanish | Latin | 100% | 100% | 100% | 100% |
| Swahili | Latin | 100% | 100% | 100% | 100% |
| Arabic | Arabic-Indic | 93% | **50%** | 100%* | n/a (no hand font) |
| Hindi | Devanagari | 93% / 50%† | **25%** | **30%** | **50%** |
| Bengali | Bengali | 100%* | **25%** | 80%* | 100%* |

\* contaminated by priors — see below. † unstable: 10/10 on one rep, 5/10 on two.

**The chart and worked-solution numbers are not trustworthy, and this is the main methodological trap.** Two demonstrations:

- **Bengali chart = 100%** looks like a refutation of the prior finding. It is not. The model emits the canonical `০১২৩৪৫৬৭৮৯` run, the same memorisation artifact the `bnkey` prompt variant produced in VISION_FINDINGS. On random digits the same image style scores 41%.
- **Bengali worked solution = 80%** is worse than a plain error. The image reads `x = ৮ × ২ = ১৬` (the planted mistake). The model transcribed:
  > `x = ৮ ÷ ২ = ৪`

  It **silently rewrote the student's error into the correct arithmetic.** It scores well on a digit-sequence metric while erasing the exact thing the tutor exists to find. Under the Sensei prompt the same image came back as `২x + 9 = ১৫ / ২x = ৬ / x = ৬ × ২ = ১২` — every number wrong.

- **Hindi is broken without any such ambiguity.** The isolated equation `२x + ७ = १५` reads as `2x + 6 = 24`, identically on all three reps. The worked solution comes back as `हल: / 2x + 6 = 24 / 2x = 2 / x = 2 × 2 = 4` — fully fabricated — and the model then flags **line 2** as the first error, a line that does not contain the planted mistake. This is the same false-accusation behaviour as Bengali `c18`.

### Prose is fine in every language tested

Every prose header transcribed correctly in every condition — `সমাধানঃ`, `हल:`, `الحل:`, `Penyelesaian:`, `Suluhisho:`, `Solución:`. **The failure is specific to numerals, in every script, exactly as it was for Bengali.** The "reads the script but not the digits" split is general, not a Bengali quirk.

### Invented errors on content that contains no arithmetic

Handed a digit chart — no equations, nothing to be wrong — the Sensei prompt invents a `FIRST_ERROR` for **every non-Latin script** and for **none of the Latin ones**:

| Chart image | FIRST_ERROR said | Correct |
|---|---|---|
| Bengali printed / handwriting | `1` / `5` | NONE — **invented** |
| Hindi printed / handwriting | `1` / `1` | NONE — **invented** |
| Arabic printed | `2` | NONE — **invented** |
| Indonesian, Spanish, Swahili (all) | `NONE` | correct |

### The self-consistency abstention gate will not catch this

VISION_FINDINGS recommendation #4 proposes running the transcription twice and abstaining on disagreement, on the grounds that the model is non-deterministic at `temperature=0`. **That detector does not work on non-Latin numerals.** In the random-digit probe every script returned 1 distinct read across 3–4 repeats (Bengali: 2). The model is *stably wrong* — it fabricates the same digits every time. Self-consistency will report high confidence on exactly the cases that are broken.

If an abstention gate is wanted for numerals, it has to be script detection ("this image contains Bengali/Devanagari/Arabic-Indic digits → refuse and ask for Latin"), not agreement sampling.

---

## C. Speed and tokenization

Measured on the 8-sentence explanation item (long enough that decode dominates prefill).

| Language | Tokens for the same 8 sentences | Wall clock | Decode rate | **chars/s** | chars/token | Token cost vs English |
|---|---|---|---|---|---|---|
| English | 168 | 2.4 s | 69 tok/s | **339** | 4.89 | 1.0× |
| Spanish | 168 | 2.5 s | 67 tok/s | **256** | 3.80 | 1.0× |
| Indonesian | 222 | 3.2 s | 69 tok/s | **217** | 3.14 | 1.3× |
| Arabic | 250 | 3.3 s | 76 tok/s | **188** | 2.48 | 1.5× |
| Swahili | 193 | 2.7 s | 71 tok/s | **163** | 2.27 | 1.1× |
| Bengali | 417 | 5.3 s | 79 tok/s | **75** | 0.95 | 2.5× |
| Hindi | 483 | 6.1 s | 79 tok/s | **83** | 1.06 | 2.9× |

**The raw decode rate is essentially constant across languages (67–79 tok/s). The slowness is entirely tokenization.** Bengali and Hindi need roughly **one token per character** versus English's ~4.9 characters per token — so the same sentence costs 2.5–2.9× more tokens and takes 2.2–2.5× longer in wall clock. This explains the earlier "Bengali measured much slower than the vendor's English figure" observation: the vendor's tok/s number is honest and reproduces; it just buys you a quarter as much text.

Median per-reply latency in the actual tutoring dialogue (short replies, prefill-dominated) stays interactive everywhere: Spanish 0.80 s, English 0.92 s, Swahili 1.01 s, Indonesian 1.14 s, Arabic 1.17 s, Bengali 1.46 s, Hindi 1.69 s. **Nothing here is a demo blocker** — but budget ~2.5× the tokens for Bengali/Hindi if anything is length-capped or streamed against a timer.

---

## D. Which languages are safe to demo

### Safe for the tutoring beat
| | |
|---|---|
| **English** | control, flawless |
| **Spanish** | flawless, and judge-legible |
| **Indonesian** | flawless; pin `g` in the question so the thread ends on a confirmation |
| **Hindi** | genuinely good, confirms and corrects correctly |
| **Arabic** | good MSA, correct physics, RTL fine |
| **Bengali** | only for 1–2 turns — it loops and never confirms in a long thread |
| **Swahili** | **NOT SAFE.** Invented physics vocabulary. Do not put it on camera. |

### Safe for the vision / numeral beat
| | |
|---|---|
| **Latin numerals in any language** (English, Spanish, Indonesian, Swahili*) | **SAFE — 100% across every condition** |
| **Arabic-Indic numerals** | **NOT SAFE** — 72% glyph→value, stably wrong |
| **Devanagari numerals** | **NOT SAFE** — 61% glyph→value, fabricates whole equations, false accusations |
| **Bengali numerals** | **NOT SAFE** — 41%, confirmed; also silently *corrects* student errors |

\* Swahili is safe for *vision* (it is Latin script and Latin digits — the image content is language-neutral) but not for *tutoring*. If a Kenyan KCSE image goes on screen, do not let the model narrate it in Swahili.

**Prose in any of these scripts is safe to show.** The Bengali-prose-plus-Latin-digits pattern recommended in VISION_FINDINGS generalises: it is the correct pattern for Hindi and Arabic too.

### The four-language wall as a stretch goal

Achievable, but only as **tutoring text in Latin-digit contexts**, and only with Swahili dropped or replaced:

- Proposed pitch line: "Bangla HSC, Kenyan KCSE, Indonesian UN" → **Kenyan KCSE cannot be demoed in Swahili.** KCSE is in fact examined in English, so demo it in English and describe it as Kenyan — that is honest and it works. Do not generate Swahili on stage.
- A safe four-language wall: **English, Spanish, Indonesian, Hindi** (all tutoring-solid), with **all four showing Latin digits** in any vision panel.
- If Bangla must be on the wall for the story, use it for **one short exchange** plus a **Bengali-prose + Latin-digit** image, which is the pair already proven in VISION_FINDINGS.

---

## E. Does the Bengali digit failure generalise? — stated explicitly

**Yes, to every non-Latin numeral system tested, though not equally.**

On the only test that removes memorisation and arithmetic priors — random digits, glyph→value:

> **Latin 100% · Arabic-Indic 72% · Devanagari 61% · Bengali 41%**

The correct generalisation is **not** "the model cannot read Bengali". It is:

> **The model reads scripts but not their numerals. Prose transcribes perfectly in Bengali, Devanagari and Arabic; the digits of all three are unreliable, and the model never hedges — it fabricates confidently, and it fabricates the *same wrong digits* every time.**

Three consequences for the multilingual claim:

1. **Any "we read student homework in language X" claim is only safe where X is written with Latin digits.** That covers Indonesian, Swahili, Spanish and English. It does not cover Bengali, Hindi or Arabic homework written in native numerals.
2. **Arabic is the trap.** It scores 100% on a naive transcription test because it copies glyphs. Anyone re-running this check with a "transcribe this" prompt will conclude Arabic works. It does not — ask for values and it drops to 72%.
3. **The mitigation in VISION_FINDINGS #4 (double-run and compare) does not apply here.** These failures are stable across repeats. Only script detection will catch them.

---

## F. Recommendation — the best second demo language

**Spanish.** For the vision-plus-tutoring demo, and for the judge-facing beat specifically.

The trade-off framed as asked — judge legibility versus "language nobody in the room reads" impact:

**Why Spanish wins on legibility.** A Seattle audience contains fluent and near-fluent Spanish readers, plus everyone who took it at school. That is the whole point: they can *watch it withhold the answer*. The turn-6 reply — *"And why not 40 metres as you thought at first? What led you to that difference?"* — is visibly Socratic to a judge who reads it directly, with no translation slide and no trust required. Every other candidate asks the room to take our word for it. Spanish is also the fastest non-English language measured (0.80 s median reply, 256 chars/s) and scored 100% on every numeral condition, so it carries the vision beat too.

**Why the "nobody reads it" impact play is actively risky here.** The impact argument favours Bangla or Swahili — and this report is the case against relying on it. Swahili produced confident nonsense that no one in that room could detect; had we picked it for impact, we would have shipped "heat pulls the ball down" to a Kenyan-education claim on stage. The impact framing is exactly the framing under which our worst output survives review. Given the team rule — only promise on camera what we validated — a language the room cannot check is a language we cannot honestly claim in front of them.

**Suggested structure:**
- **Bangla stays the opening story beat** — it is the founding motivation and it is real. Keep it to a short exchange plus the proven `c16`/`c17` Bengali-prose + Latin-digit image.
- **Spanish is the proof beat** — the audience verifies for itself that the tutoring is genuinely Socratic and genuinely correct.
- **Indonesian is the breadth beat** if a third is wanted — clean on both, and it backs the "Indonesian UN" line in the pitch honestly.
- **Hindi is the strongest reserve.** Tutoring is excellent and it is a far bigger market than Spanish for this product; it is only excluded from the vision beat, not the tutoring one. If the pitch needs a second South Asian language, use Hindi for *tutoring only*.
- **Drop Swahili from anything spoken or generated.** Reference Kenya/KCSE in English.

---

## Honest caveats on this test

- **Language quality was judged by me, not by native speakers.** The Swahili failures I am confident about are lexical and checkable (*uchumi* = economy, *kiwanda* = factory, *joto* = heat — these are dictionary facts, not style judgements). The Hindi, Arabic, Indonesian and Bengali "natural register" assessments are weaker claims and would benefit from one native reader each. **Before Spanish or Indonesian goes on camera, have one native speaker read the actual demo transcript** — the Swahili result shows how convincing bad output looks.
- **One dialogue thread per language, one physics topic.** The turn-by-turn verdicts are single samples on a model already known to be non-deterministic at `temperature=0`. Bengali's loop was reproduced twice; nothing else was. Treat the per-language PASS marks as "no problem found in one careful thread", not as coverage.
- **Numeral images are pristine printed/handwriting-font renders, not photographs.** As in VISION_FINDINGS this makes the non-Latin failures *more* robust, not less — they fail on perfect input, so no image-quality work can rescue them. The Latin 100% results should be read as an upper bound, though VISION_FINDINGS already established Latin survives the full phone-degradation stack.
- **Only one handwriting font per script, and none for Arabic** (no Arabic handwriting TTF was available). Arabic handwriting numerals are untested.
- **The random-digit probe is one digit string** (18 digits, fixed seed) rendered identically across four scripts. It is a controlled comparison, but it is one sample of content; the per-script percentages carry maybe ±10 points.
- **Ground truth was corrected once mid-analysis** (the worked-solution digit string was wrong in the first manifest, making Latin languages look like 80%). The grader now re-reads ground truth from the manifest so scoring can be fixed without re-running inference. Scores above are post-fix.
- **Two rendering bugs were found and fixed before any conclusion was drawn**, both bidi-related: Arabic equations were being mirrored to `١٥ = ٧ + ٢x`, and Arabic random-digit groups were being reversed. Both would have produced fake "Arabic OCR is broken" results. Equation and digit-group tokens are now placed explicitly left-to-right. Every image was visually inspected before use.

## Files

| Path | Contents |
|---|---|
| `docs/lang_samples/_tutor_test.py` | tutoring harness — 7 languages × (6-turn thread + algebra + speed item) |
| `docs/lang_samples/_gen_numerals.py` | numeral image generator, incl. the random-digit probe |
| `docs/lang_samples/_run_numerals.py` | vision harness, 3 prompt conditions (`plain` / `tolatin` / `sensei`) |
| `docs/lang_samples/_grade_numerals.py` | alignment-based grader with native→Latin digit normalisation |
| `docs/lang_samples/images/` | 27 probe images + `manifest.json` ground truth |
| `docs/lang_samples/_fonts/` | Devanagari, Arabic, Kalam, DejaVu (OFL/Apache/public) |
| `docs/lang_runs/tutor.jsonl` | every tutoring response |
| `docs/lang_runs/tutor_bn_repeat.jsonl` | Bengali thread, second run (loop reproduction) |
| `docs/lang_runs/numerals.jsonl` | every vision response |
