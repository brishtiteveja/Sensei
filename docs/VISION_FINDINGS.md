# Vision findings — can the model read handwritten math?

**Date:** 2026-08-15
**Model under test:** `qwen3-vl-30b-a3b-gguf` (the pin), with `qwen3-vl-32b-instruct-gguf` tested once as the fallback candidate.
**Endpoint:** `https://spark-e257.tail803c7f.ts.net:8443/v1`, `temperature=0`, `max_tokens=1200`.
**Corpus:** 33 synthetic images, 29 "student work" + 4 isolation diagnostics. 171 inference calls total: 141 graded (4 model/prompt/preprocessing variants + a 9-image Bengali-key probe) and 30 repeatability calls.
**Reproduce:** `vision_samples/_gen_samples.py` → images, `_run_sweep.py` → responses, `_grade.py` → scores. Raw responses in `vision_runs/*.jsonl`.

---

## Verdict in three lines

1. **Latin/English handwriting: ship it.** 20/22 correct, and it survived every photo degradation we threw at it — 7° rotation, keystone, shadow, JPEG q28, 2.4px defocus, 0.30× downscale, crossed-out margin work. Photo quality is **not** the risk it was assumed to be.
2. **Bengali numerals: completely broken, and it is not a handwriting problem.** 0/9. The model reads Bengali digits at ~30% accuracy on a *pristine, printed, 90px* digit chart. Every single Bengali-numeral case produced a confident fabrication — never once did it hedge.
3. **The planned fallback does not work.** `qwen3-vl-32b-instruct-gguf` is *worse* on Latin (17/22 vs 20/22), identically broken on Bengali (0/9), and 4× slower (12.3s vs 3.0s median). PLAN.md's stated mitigation is false and should be struck.

The demo-critical consequence: **the Bangla beat cannot use Bengali numerals.** Bengali *prose* is fine — that half of the multilingual claim holds.

---

## Results — `qwen3-vl-30b-a3b-gguf`, Sensei's production prompt, raw images

"Transcription OK" = every ground-truth line recovered in order (reading `২` as `2` counts as correct).
"Hallucinated" = transcription wrong **and** the model did not flag any ambiguity — i.e. it confidently invented content.

| Image | Condition | Script | Transcription OK? | Said | Actual | Right line? | Hallucinated? |
|---|---|---|---|---|---|---|---|
| `c00_print_clean` | printed text, pristine (prior baseline) | Latin | yes | 2 | 2 | yes | no |
| `c01_hand_clean` | handwriting (Caveat), clean scan | Latin | yes | 2 | 2 | yes | no |
| `c02_hand_clean_indie` | handwriting (Indie Flower), clean scan | Latin | yes | 2 | 2 | yes | no |
| `c03_hand_rot3` | handwriting + 3° rotation | Latin | yes | 5 | 5 | yes | no |
| `c04_hand_rot7_persp` | handwriting + 7° rotation + keystone | Latin | yes | 2 | 2 | yes | no |
| `c05_hand_shadow` | handwriting + shadow/lighting gradient | Latin | yes | None | 3 | **NO** | no |
| `c06_hand_jpeg35` | handwriting + JPEG q35 | Latin | yes | 2 | 2 | yes | no |
| `c07_hand_phone_full` | full phone stack (rot+skew+shadow+blur+JPEG+downscale) | Latin | yes | 2 | 2 | yes | no |
| `c08_hand_phone_full2` | full phone stack, 2nd font/problem | Latin | yes | 5 | 5 | yes | no |
| `c09_exponent_clean` | raised exponent, clean  ← the known ^2 wobble | Latin | yes | 3 | 3 | yes | no |
| `c10_exponent_phone` | raised exponent + full phone stack | Latin | yes | 3 | 3 | yes | no |
| `c11_correct_clean` | CONTROL: correct work, clean | Latin | yes | None | None | yes | no |
| `c12_correct_phone` | CONTROL: correct work + full phone stack | Latin | yes | None | None | yes | no |
| `c13_bn_clean` | Bengali numerals, clean | Bengali numerals | **NO** | 3 | 4 | **NO** | **YES** |
| `c14_bn_hand_galada` | Bengali numerals, cursive font (Galada) | Bengali numerals | **NO** | 8 | 4 | **NO** | **YES** |
| `c15_bn_phone` | Bengali numerals + full phone stack | Bengali numerals | **NO** | 4 | 4 | yes | **YES** |
| `c16_bn_mixed_clean` | Bengali prose + Latin digits, clean | Bengali prose + Latin digits | yes | 4 | 4 | yes | no |
| `c17_bn_mixed_phone` | Bengali prose + Latin digits + phone stack | Bengali prose + Latin digits | yes | 4 | 4 | yes | no |
| `c18_bn_correct_clean` | CONTROL: correct Bengali-numeral work | Bengali numerals | **NO** | 3 | None | **NO** | **YES** |
| `c19_messy_crossout` | crossed-out work + margin scribbles + doodle | Latin | yes | 2 | 2 | yes | no |
| `c20_messy_phone` | messy + cramped + full phone stack | Latin | yes | 3 | 3 | yes | no |
| `c21_cramped` | cramped line spacing | Latin | yes | 5 | 5 | yes | no |
| `c22_pencil_faint` | faint pencil, low contrast + shadow | Latin | yes | 2 | 2 | yes | no |
| `c23_lowres` | low resolution (0.42x) + JPEG | Latin | yes | 2 | 2 | yes | no |
| `c24_scrawl_clean` | heavy scrawl warp, cramped | Latin | **NO** | 5 | 3 | **NO** | **YES** |
| `c25_scrawl_phone` | heavy scrawl warp + full phone stack | Latin | yes | 2 | 2 | yes | no |
| `c26_bn_scrawl_phone` | Bengali numerals + scrawl + phone stack | Bengali numerals | **NO** | 8 | 4 | **NO** | **YES** |
| `c27_tiny` | very small capture (0.30x) | Latin | yes | 5 | 5 | yes | no |
| `c28_heavyblur` | heavy defocus blur (r=2.4) | Latin | yes | 3 | 3 | yes | no |
| `d01_bn_chart_print` | DIAG: Bengali digit chart 0-9, PRINTED, pristine 90px | Bengali numerals | **NO** | 2 | None | **NO** | **YES** |
| `d02_bn_print_pristine` | DIAG: Bengali work, PRINTED, pristine 64px | Bengali numerals | **NO** | None | 4 | **NO** | **YES** |
| `d03_bn_oneline_huge` | DIAG: one Bengali line, PRINTED, pristine 110px | Bengali numerals | **NO** | None | None | yes | **YES** |
| `d04_bn_chart_hand` | DIAG: Bengali digit chart 0-9, handwriting, pristine | Bengali numerals | **NO** | 2 | None | **NO** | **YES** |

### Failure rate by condition

Each image is counted in exactly one group (groups sum to 33).

| Condition group | Images | n | Genuine passes | Failure rate |
|---|---|---|---|---|
| Latin, clean handwriting baseline | c00, c01, c02, c09, c11 | 5 | 5 | **0%** |
| Latin, rotation & perspective (3°, 7°+keystone) | c03, c04 | 2 | 2 | **0%** |
| Latin, uneven lighting / shadow | c05, c22 | 2 | 1 | **50%** (unstable — see below) |
| Latin, compression / low-res / defocus | c06, c23, c27, c28 | 4 | 4 | **0%** |
| Latin, full phone stack (rot+skew+shadow+blur+JPEG+downscale) | c07, c08, c10, c12, c20, c25 | 6 | 6 | **0%** |
| Latin, messy layout / crossed-out / cramped | c19, c21 | 2 | 2 | **0%** |
| Latin, heavy scrawl warp | c24 | 1 | 0 | **100%** |
| Bengali prose + Latin digits | c16, c17 | 2 | 2 | **0%** |
| **Bengali numerals** | **c13–c15, c18, c26, d01–d04** | **9** | **0** | **100%** |

(The scrawl warp also appears in `c25`, on top of the full phone stack, and *passed* there — so `c24` is one hard glyph rather than a reliable scrawl failure. See the `c24` note below.)

**What actually breaks it, in order of severity:**

1. **Bengali numerals — total failure, independent of image quality.** This is the headline.
2. **Genuinely ambiguous glyphs (c24).** The scrawl warp turned a `1` into something a human would also read as `7`. Fair enough — but the model did not say "ambiguous", it asserted `x = 7` and then invented a matching explanation ("divided 5 by 5 to get 7"). It also stopped looking for the *real* error two lines earlier. One bad glyph poisoned the whole diagnosis.
3. **Uneven lighting (c05) — a reasoning wobble, not a vision one.** Transcription was perfect all four times; the model just failed to notice the sign error and answered `NONE`. Preprocessing fixed it (below).
4. **Not a factor at all:** rotation, keystone, JPEG artifacts, paper texture, defocus, resolution down to 0.30×, cramped lines, crossed-out work, margin scribbles.

### The `(20)^2` wobble did not reproduce

The previously observed `(20)^2` → `(20)×2` misread **did not recur once** — the three exponent images (`c09` clean, `c10` full phone stack, `c28` heavy defocus) passed in all four model/prompt/preprocessing variants, 12/12. The exponent was drawn as a genuinely raised smaller digit, the way a student writes it, not as a typographic `²` glyph. It read `A = (4)²` correctly and flagged the doubling error every time. Treat that earlier observation as a one-off, not a systematic weakness.

---

## The Bengali numeral failure, in detail

This is the finding that matters, so here is the evidence chain.

**It is not the handwriting.** `d04` is a handwriting-font digit chart; `d01` is the same chart in *printed* Noto Serif Bengali at 90px on a pristine white background with no rotation, no noise, no compression. Both fail:

| Diagnostic | Ground truth | Model read | Correct |
|---|---|---|---|
| `d01` printed chart, pristine 90px | `০১২৩৪৫৬৭৮৯` | `0627867966` | **2/10** |
| `d04` handwriting chart, pristine | `০১২৩৪৫৬৭৮৯` | `0123803961` | **4/10** |
| `d03` one line, printed, **110px** | `২x + ৭ = ১৫` | `5x + 9 = 50` | **0/3 digits** |

~30% digit accuracy against a 10% chance baseline. Preprocessing moves it to 35%. The 32b model gets 1/10 on the printed chart and emits *letters* for digits (`0 s s 6 8 / c u q b s`). **The model does not have a reliable internal representation of Bengali digit glyphs.** No amount of image quality, prompting, or preprocessing addresses that.

**It is not the Bengali script either.** Bengali *prose* transcribes perfectly — `সমাধানঃ` and `উত্তর : x = 1` came back verbatim in both `c16` and `c17`, including under the full phone-degradation stack, and the error line was correct both times. The failure is specific to `০১২৩৪৫৬৭৮৯`.

**Supplying a digit key does not fix it.** A prompt variant (`bnkey`) containing an explicit `০=0 ১=1 …` table plus confusable-pair warnings still misread every real problem (`১৫`→`৫৫`, `৩`→`৭`). It scored 9/10 on the *handwriting chart* purely by echoing the key it had just been given — a memorisation artifact, not perception. On `d02` it still read `১৫` as `৫৫` and then declared the work correct.

**Why this is dangerous, not merely wrong.** In `c15` and `c26` the student wrote `x = ৮ × ২ = ১৬` — multiplying when they should have divided. The model transcribed it as `x = 11 / 2 = 5.5`, i.e. it **inverted the actual mistake**, and would have coached the student on a division error they never made. In `c18` the Bengali work was *entirely correct* and the model flagged line 3 as wrong in all four variants — a false accusation against a student who did nothing wrong. And on `d01`/`d04`, handed a digit chart with no arithmetic in it at all, it invented a "FIRST_ERROR" anyway.

Across 9 Bengali-numeral cases the model hedged **zero** times. The failure mode is exactly the one flagged as worst: silent, confident, and fluent.

---

## What preprocessing bought

Pipeline (`_run_sweep.py:preprocess`): projection-profile deskew → grayscale → divide by heavily-blurred copy to flatten lighting → autocontrast → unsharp mask → cap long edge at 1400px, JPEG q92.

| | Latin genuine | Bengali genuine | Median latency | Median prompt tokens |
|---|---|---|---|---|
| raw | 20/22 | 0/9 | 3.0s | 758 |
| **+preprocessing** | **21/22** | 0/9 | 3.1s | 830 |

The headline gain is small but the **stability** gain is real. Repeating the borderline cases four times each:

| Image | GT | Raw ×4 | Preprocessed ×4 |
|---|---|---|---|
| `c05_hand_shadow` | 3 | `None, 3, 3, None` — **2/4** | `3, 3, 3, 3` — **4/4** |
| `c20_messy_phone` | 3 | `3, 1, 3, 3` — **3/4** | `3, 3, 3, 3` — **4/4** |
| `c24_scrawl_clean` | 3 | `5, 5, 5, 5` — 0/4 | `5, 5, 5, 5` — 0/4 |

Lighting flattening converts the coin-flip cases into deterministic passes. It does **not** rescue a genuinely ambiguous glyph (`c24`), and it does **not** touch Bengali.

**Note: the model is not deterministic at `temperature=0`.** `c05` and `c20` gave different answers on identical inputs. Any single-shot demo result should be treated as a sample, not a guarantee — which is the strongest practical argument for the preprocessing step, since its value is variance reduction.

---

## Prompt variants

A two-pass "transcribe first, then check, NONE is expected, mark struck-out work, flag uncertain digits as `{a|b}`" prompt was tested on all 33 images.

| Variant | Latin genuine | Bengali-numeral genuine | Bengali-prose genuine | Median latency |
|---|---|---|---|---|
| Sensei production prompt | **20/22** | 0/9 | **2/2** | 3.0s |
| Two-pass strict prompt | 18/22 | 0/9 | 1/2 | 2.8s |

**The strict prompt made things worse — do not adopt it.** It fixed `c05` but broke three kinematics cases (`c03`, `c21`, `c27`): the extra "check each line follows from the one above" framing pushed the model into over-analysing `v = 20 + (-9.8)(3)` → `v = 20 - 29.4` and either flagging that correct line or giving up with `NONE`. It also degraded one Bengali-prose case.

It did produce one genuinely better behaviour worth salvaging: on `c19` it marked the crossed-out attempt `[illegible] x = 20/3` instead of silently folding it into the working, whereas the production prompt transcribed struck-out content as if it were live work. **Recommended minimal change to the production prompt: add a single line about crossed-out work, and nothing else.** The rest of the strict prompt is a net negative.

The Bengali digit-key variant is covered above — no benefit.

---

## Is the 32b fallback worth its swap cost?

**No. Recommend striking it from PLAN.md.**

| Variant | Latin genuine | Bengali-numeral genuine | Bengali-prose genuine | Hallucinated (all) | Median latency |
|---|---|---|---|---|---|
| 30b, Sensei prompt, raw image | 20/22 | 0/9 | 2/2 | 10/33 | 3.0s |
| 30b + preprocessing | 21/22 | 0/9 | 2/2 | 10/33 | 3.1s |
| 30b + two-pass strict prompt | 18/22 | 0/9 | 1/2 | 11/33 | 2.8s |
| 32b, Sensei prompt, raw image | 17/22 | 0/9 | 1/2 | 10/33 | 12.3s |

The 32b model is worse on Latin (it accepted `20 - 29.4 = 9.4` as correct in `c03`, `c08`, `c21`, `c27` — four kinematics misses the 30b caught), no better on Bengali numerals (0/9, and worse on the digit chart), and 4× slower at 12.3s median vs 3.0s. It cost one cold swap to learn this. PLAN.md's risk table currently claims it is "better" — that is unsupported and should be corrected.

The 30b pin was restored to resident after the test (`/health` → `{"loaded":["qwen3-vl-30b-a3b-gguf"]}`).

---

## Recommendations

**Ship the demo on `qwen3-vl-30b-a3b-gguf`, in English/Latin, with preprocessing on.**

1. **Keep the pin.** 30b beats 32b on quality *and* speed. Delete the 32b fallback row from the PLAN risk table.
2. **Add the client-side preprocessing step** (deskew → lighting flatten → autocontrast → cap 1400px). Cost is ~70 extra prompt tokens and no measurable latency; benefit is turning unstable cases deterministic. Capping the long edge also bounds token cost on high-megapixel phone captures.
3. **Do not put Bengali numerals on stage.** Options, in order of preference:
   - Demo the Bangla beat with **Bengali prose + Latin digits** (`c16`/`c17` are proven-good samples). This is realistic — Bangladeshi maths teaching commonly uses Western digits — and it preserves the "teaches in Bangla" claim honestly.
   - If Bengali numerals are non-negotiable, put a **deterministic Bengali-digit OCR pass in front of the VLM** (a 10-class classifier is trivial to train) and feed the model transliterated text. Do not ask the VLM to read the glyphs.
   - Do not attempt to fix this with prompting. It was tried and it does not work.
4. **Add an abstention gate before the tutor speaks.** The single worst behaviour observed is confident fabrication with zero hedging (9/9 Bengali cases, plus `c24`). Cheap mitigation: run the transcription twice and, if the two transcriptions disagree, ask the student to confirm the reading rather than teaching against it. The non-determinism at `temperature=0` makes this a genuinely effective detector — it would have caught `c05` and `c20`, and Bengali disagreement rates are high.
5. **Never let the tutor teach from an unverified transcription.** Surface the transcription to the student first ("I read your work as… is that right?"). This converts the catastrophic failure (teaching against a problem the student never wrote) into a recoverable one.
6. **Demo insurance:** `c07_hand_phone_full`, `c08_hand_phone_full2`, `c20_messy_phone`, `c19_messy_crossout` and `c10_exponent_phone` all pass reliably and *look* hard — heavy shadow, rotation, crossed-out work, compression. `c16_bn_mixed_clean` / `c17_bn_mixed_phone` are the safe Bangla samples. All are in `docs/vision_samples/`.

---

## Honest caveats on this test

- **These are synthetic images, not photographs of real handwriting.** They use handwriting TTFs (Caveat, Indie Flower, Patrick Hand, Kalam; Atma/Galada/Hind Siliguri for Bengali) with per-glyph rotation, size and baseline jitter plus an elastic warp — plus real photo degradations. That is a fair proxy for **neat student handwriting**, and an optimistic one for genuine scrawl, connected cursive, or a tired 14-year-old's homework. The Latin pass rate should be read as an **upper bound**.
- The Bengali finding does **not** carry that caveat, and is the more robust of the two: it fails on pristine printed type, so no amount of handwriting realism could make it better.
- Ground-truth grading is automated (`_grade.py`) with normalisation for Bengali→Latin digits, `²`→`^2`, `×`/`÷`, and list markers. Every Latin case and every Bengali case in the baseline run was also read by hand and agreed with the grader.
- Single sample per condition for most cells; only the borderline cases were repeated. Given the observed non-determinism, cells marked pass on one sample carry roughly the confidence of one coin flip landing the way you wanted — the aggregate pattern is trustworthy, individual cells less so.
- All conditions were varied together in the "full phone stack" cases rather than fully factorially, so the test isolates *which factors break it* rather than measuring every interaction.

---

## Appendix — per-image variant comparison

| Image | GT | 30b raw | 30b +preproc | 30b +strict prompt | 32b raw |
|---|---|---|---|---|---|
| `c00_print_clean` | 2 | 2 (OK) | 2 (OK) | 2 (OK) | 2 (OK) |
| `c01_hand_clean` | 2 | 2 (OK) | 2 (OK) | 2 (OK) | 2 (OK) |
| `c02_hand_clean_indie` | 2 | 2 (OK) | 2 (OK) | 2 (OK) | 2 (OK) |
| `c03_hand_rot3` | 5 | 5 (OK) | 5 (OK) | None (wrong) | None (wrong) |
| `c04_hand_rot7_persp` | 2 | 2 (OK) | 2 (OK) | 2 (OK) | 2 (OK) |
| `c05_hand_shadow` | 3 | None (wrong) | 3 (OK) | 3 (OK) | 3 (OK) |
| `c06_hand_jpeg35` | 2 | 2 (OK) | 2 (OK) | 2 (OK) | 2 (OK) |
| `c07_hand_phone_full` | 2 | 2 (OK) | 2 (OK) | 2 (OK) | 2 (OK) |
| `c08_hand_phone_full2` | 5 | 5 (OK) | 5 (OK) | 5 (OK) | None (wrong) |
| `c09_exponent_clean` | 3 | 3 (OK) | 3 (OK) | 3 (OK) | 3 (OK) |
| `c10_exponent_phone` | 3 | 3 (OK) | 3 (OK) | 3 (OK) | 3 (OK) |
| `c11_correct_clean` | None | None (OK) | None (OK) | None (OK) | None (OK) |
| `c12_correct_phone` | None | None (OK) | None (OK) | None (OK) | None (OK) |
| `c13_bn_clean` | 4 | 3 (HALLUC) | 4 (HALLUC) | None (HALLUC) | 4 (HALLUC) |
| `c14_bn_hand_galada` | 4 | 8 (HALLUC) | 4 (HALLUC) | 4 (HALLUC) | 4 (HALLUC) |
| `c15_bn_phone` | 4 | 4 (HALLUC) | 4 (HALLUC) | 4 (HALLUC) | 4 (HALLUC) |
| `c16_bn_mixed_clean` | 4 | 4 (OK) | 4 (OK) | 4 (HALLUC) | 4 (OK) |
| `c17_bn_mixed_phone` | 4 | 4 (OK) | 4 (OK) | 4 (OK) | 8 (wrong) |
| `c18_bn_correct_clean` | None | 3 (HALLUC) | 3 (HALLUC) | 3 (HALLUC) | 3 (HALLUC) |
| `c19_messy_crossout` | 2 | 2 (OK) | 2 (OK) | 2 (OK) | 2 (OK) |
| `c20_messy_phone` | 3 | 3 (OK) | 3 (OK) | 3 (OK) | 3 (OK) |
| `c21_cramped` | 5 | 5 (OK) | 5 (OK) | 4 (wrong) | None (wrong) |
| `c22_pencil_faint` | 2 | 2 (OK) | 2 (OK) | 2 (OK) | 2 (OK) |
| `c23_lowres` | 2 | 2 (OK) | 2 (OK) | 2 (OK) | 2 (OK) |
| `c24_scrawl_clean` | 3 | 5 (HALLUC) | 5 (HALLUC) | 5 (HALLUC) | 5 (HALLUC) |
| `c25_scrawl_phone` | 2 | 2 (OK) | 2 (OK) | 2 (OK) | 2 (OK) |
| `c26_bn_scrawl_phone` | 4 | 8 (HALLUC) | None (HALLUC) | 4 (HALLUC) | 4 (HALLUC) |
| `c27_tiny` | 5 | 5 (OK) | 5 (OK) | 4 (wrong) | None (wrong) |
| `c28_heavyblur` | 3 | 3 (OK) | 3 (OK) | 3 (OK) | 3 (OK) |
| `d01_bn_chart_print` | None | 2 (HALLUC) | 2 (HALLUC) | None (HALLUC) | 1 (HALLUC) |
| `d02_bn_print_pristine` | 4 | None (HALLUC) | 4 (HALLUC) | 4 (HALLUC) | 3 (HALLUC) |
| `d03_bn_oneline_huge` | None | None (HALLUC) | None (HALLUC) | None (HALLUC) | None (HALLUC) |
| `d04_bn_chart_hand` | None | 2 (HALLUC) | 2 (HALLUC) | None (HALLUC) | None (HALLUC) |

### Files

| Path | Contents |
|---|---|
| `docs/vision_samples/*.png,*.jpg` | 33 test images |
| `docs/vision_samples/manifest.json` | ground truth: lines + planted error line per image |
| `docs/vision_samples/_gen_samples.py` | image generator (handwriting sim, photo degradation) |
| `docs/vision_samples/_run_sweep.py` | inference harness + the 3 system-prompt variants + preprocessing |
| `docs/vision_samples/_grade.py` | automated grader |
| `docs/vision_samples/_fonts/` | handwriting + Bengali TTFs (OFL/Apache) |
| `docs/vision_samples/_preproc/` | preprocessed versions of every image |
| `docs/vision_runs/*.jsonl` | every raw model response, one JSON object per call |

---
---

# Annotated-photo coordinates (P1 beat validation)

**Date:** 2026-08-15 (second sweep, same day)
**Question:** the sweep above validated error *detection*. This one asks a different
question — can the model tell us **where on the image** the wrong line is, precisely
enough to draw a red box on it?
**Model:** `qwen3-vl-30b-a3b-gguf` only (the pin; never swapped, `/health` confirmed
resident before and after). `temperature=0`, `max_tokens=700`.
**Corpus:** 11 of the existing Latin samples, chosen for spread — clean ×3, 7° rotation
+ keystone, lighting gradient, full phone stack ×2, cramped spacing, crossed-out margin
work, messy+cramped+phone, and the correct-work control. **220 calls**: 165 for the
four coordinate formats + a production-prompt control (3 repeats each), 55 for the
recommended pipeline (5 repeats each).
**Reproduce:** `vision_samples/_run_coords.py` → `vision_runs/coords_30b.jsonl` and
`coords_pipeline_30b.jsonl`; `vision_samples/_grade_coords.py` grades them.
Line-segmentation code is `demo/annotate.py`.

---

## Verdict

**NO-GO on asking the model for a bounding box. GO on approach #3** — the model returns
a line *index*, we segment the image and draw the box ourselves. That path scored
**50/50 correct line, 5/5 correct abstentions on the control, and 11/11 stable across
five repeats**, and the segmenter found the right number of lines on **22/22** Latin
images in the full corpus.

Three reasons the direct-box route fails, in order of how badly they bite:

1. **The model ignores the coordinate system you ask for.** It emitted a 0–1000
   normalised scale on **93 of the 96** boxes it produced (the other three were the
   correct-work control returning `[0,0,0,0]`, i.e. no box), whether the prompt asked for
   fractions of 0–1, for absolute pixels (with the exact width and height supplied), or
   for Qwen's own `<|box_start|>` grounding format. Taking the instruction at its word
   puts the box **0% / 7%** on the right line. This is the trap that would have put a
   red rectangle in the corner of the page on stage.
2. **Detection gets worse when you ask for a box.** Every coordinate prompt scored
   70–80% on the line index; the unchanged production prompt scored **97%** on the same
   images in the same session. Asking for coordinates costs ~20 points of the thing that
   actually matters.
3. **A box can only be as right as the line the model named.** Once the coordinate
   convention is decoded, the *grounding itself is good* — the box lands on the line the
   model named 84/90 times and the median y-IoU is ~0.80 — but it faithfully boxes the
   wrong line whenever the model names the wrong line. Good grounding on a bad diagnosis
   is exactly the failure the beat cannot survive.

---

## Results — four ways of asking

30 error cases per format (10 images × 3 repeats) plus 3 control calls. "box on GT line"
= box centre-y falls inside the true error line's band. Boxes are graded under the
0–1000 convention the model actually used, which is the **generous** reading.

| Format asked for | Line index correct | Box on **GT** line | Box on the line the model **named** | median y-IoU (named line) | Control answered NONE |
|---|---|---|---|---|---|
| 1. Normalised bbox, "0–1" | 21/30 (70%) | 21/30 (70%) | **30/30 (100%)** | 0.83 | **0/3** |
| 2. Pixel bbox, dims supplied | 24/30 (80%) | 21/30 (70%) | 27/30 (90%) | 0.80 | 3/3 |
| 3. Line index only | 24/30 (80%) | — (we draw it) | — | — | 3/3 |
| 4. Qwen `<\|box_start\|>` grounding | 24/30 (80%) | 21/30 (70%) | 27/30 (90%) | 0.77 | 3/3 |
| — control: **unchanged production prompt** | **29/30 (97%)** | — | — | — | 3/3 |
| — **recommended: production prompt + TOTAL_LINES** (5 repeats) | **50/50 (100%)** | — | — | — | **5/5** |

### The coordinate convention, which is the whole story

| Interpretation applied to the returned numbers | Box on GT line (n=90) |
|---|---|
| **0–1000 normalised** (what the model actually uses) | 63/90 (70%) |
| 0–1 fractions (what prompt #1 asked for) | **0/90 (0%)** |
| absolute pixels (what prompt #2 asked for, dims given) | 6/90 (7%) |

93 of the 96 emitted boxes used the 0–1000 scale. The three "0–1 looking" responses were
the control image answering `[0,0,0,0]`, i.e. no box at all. Prompt #4 did **not** produce
literal `<|box_start|>` tokens — it printed the four numbers in the same 0–1000 scale.
There is no configuration in which the model honours the requested units.

### Grounding quality, once decoded

| Format | n (model named the right line) | Box on that line | median y-IoU |
|---|---|---|---|
| norm_bbox | 21 | **21/21** | 0.88 |
| pixel_bbox | 24 | 21/24 | 0.79 |
| qwen_ground | 24 | 21/24 | 0.78 |

The 6 misses are all `c20_messy_phone`, where residual page tilt makes even the
ground-truth bands overlap each other vertically; the box sits between two lines. So the
honest read is: **the model's vertical grounding is genuinely good on a straight page and
degrades on a tilted one.** Horizontal extent is looser — on `c19` it stretched the box
from the working across to the crossed-out margin scribble, 800/1000 of the page width
for a line that occupies 375/1000.

### Variance across repeats

| Format | Same line index on all repeats | Byte-identical box | Max drift of box centre-y |
|---|---|---|---|
| norm_bbox | 11/11 | 11/11 | 0 px |
| pixel_bbox | 11/11 | 8/11 | 1 px |
| qwen_ground | 11/11 | 6/11 | 3 px |
| line_index | 11/11 | — | — |
| production prompt (control) | 10/11 | — | — |
| **recommended pipeline (5 repeats)** | **11/11** | — | — |

Coordinates are effectively deterministic here — the wobble is ≤3 px, far smaller than a
line's height. **The nondeterminism noted in the first sweep did not reappear except
once** (`c05_hand_shadow` under the production prompt gave `3, 3, None`), and it went
away entirely once the image went through `prepare()`. Do not read this as "the model is
deterministic now" — it is one 220-call session on 11 images — but the variance is not
what kills the bbox idea. The coordinate convention and the detection drop are.

---

## Approach #3 in detail — this is the one to ship

Pipeline, all of it in `demo/annotate.py` except the one model call:

```
photo ──prepare()──> frame ──> model (production prompt + TOTAL_LINES) ──> line index
                       │                                                      │
                       └──find_line_bands()──> bands ──────> annotate(frame, idx) ──> red box
```

`prepare()` is the single most important step and it is **not** the `_run_sweep.py`
preprocessing from the first sweep. It whitens the off-page border, deskews, crops to the
sheet and caps the long edge at 1400 px. The frame it produces is the image sent to the
model **and** the image the box is drawn on — one coordinate frame, so nothing has to be
mapped between spaces.

**Segmentation accuracy: 22/22.** Run over every Latin image in the corpus (not just the
11 tested with the model), `find_line_bands()` returns exactly the ground-truth number of
lines on all 22, including 7° rotation + keystone, the full phone stack, heavy defocus,
0.30× downscale, cramped spacing, and the messy page where it correctly excludes the
crossed-out margin attempt, the `?? check` scribble, the red `ans` and the doodle. Every
one of the 11 test frames was also checked by eye: the box is on the intended line in
11/11.

**Cross-check gate, free.** Asking the model for `TOTAL_LINES` alongside `FIRST_ERROR`
cost nothing and agreed with the segmenter's line count on **88/88** calls across both
runs. Use it as the go/no-go for drawing: if the counts disagree, or the index is outside
the band list, **do not draw** — fall back to quoting the line as highlighted text. That
turns "box on the wrong line" into "no box", which is the failure we can live with.

**Cost:** segmentation is ~0.75 s per image (pure Pillow + numpy + one `scipy.ndimage.label`),
model call 2.7 s median, 774 prompt tokens median. No extra inference call.

### Known limits of the segmenter — read these before the demo

- **Residual skew is the weak point.** On `c20_messy_phone` the deskew estimate lands
  ~3° off, the bands end up overlapping, and the axis-aligned box clips the right-hand
  end of the line. It is still unambiguously on the correct line, but it looks sloppy. If
  the demo photo is visibly rotated, the box will be visibly imperfect.
- It assumes **one column of working**. It finds the densest column and refuses to absorb
  anything further away than 3 glyph-heights, which is what saves it on `c19`/`c20` — but
  a genuinely two-column page would break it.
- It assumes lines are **horizontal after deskew**. Keystone survives at k=0.06; heavier
  perspective would smear lines together.
- It was tuned on these 22 synthetic images. Every threshold in it is a number I chose by
  looking at these pages.

---

## Recommendation

**GO for the P1 beat, via approach #3 only.**

1. **Do not ask the model for coordinates.** Not normalised, not pixels, not the
   grounding format. All three routes cap at 70% on-the-right-line, and all three drag
   detection down from 97% to 70–80%.
2. **Keep the production prompt exactly as it is**, plus one extra field: `TOTAL_LINES`.
   That is the only change, and it bought 100% line-index accuracy over 50 graded calls
   with zero false accusations on the control.
3. **Run `prepare()` on the phone capture, send that frame, draw on that frame.** Never
   let the model's image and the annotated image be different pixels.
4. **Gate the drawing.** Draw only if `TOTAL_LINES == len(bands)` and
   `1 <= FIRST_ERROR <= len(bands)`. Otherwise fall back to the accepted text-quote
   fallback. `annotate()` already returns `band=None` in that case rather than guessing.
5. **Demo insurance:** `c07_hand_phone_full`, `c08_hand_phone_full2`, `c19_messy_crossout`
   and `c20_messy_phone` all produce a correct red box and *look* hard on camera —
   rotation, shadow, crossed-out work, compression. `c11_correct_clean` is the one to
   show for "no error found, no box drawn".

### What this test does not tell you

- **11 images, Latin only, synthetic handwriting.** Nine of the eleven already passed the
  first sweep, so the 100% on the recommended pipeline is on a friendly sample and should
  be read as "no new failure mode", not as a 100% base rate. The first sweep's honest
  number over 22 Latin images is 20/22; `c24_scrawl_clean` (the genuinely ambiguous
  glyph) was deliberately not in this set and would still fail — it would produce a
  confident red box around line 5 when the error is on line 3.
- Nothing here changes the Bengali-numeral finding. Bengali numerals are still 0/9 and
  still must not go on stage.
- Segmentation ground truth is my own algorithm's output, validated by matching the known
  line count on 22/22 images and by eyeballing all 11 test frames. It is not
  hand-annotated pixel ground truth, so the y-IoU figures carry the segmenter's own error.

### Files added

| Path | Contents |
|---|---|
| `demo/annotate.py` | `prepare()`, `find_line_bands()`, `annotate()`, CLI. The demo code. |
| `docs/vision_samples/_run_coords.py` | the 6 prompt formats + frame builder |
| `docs/vision_samples/_grade_coords.py` | box parser, coordinate-convention grader |
| `docs/vision_samples/_frames/` | the prepared frames + `frames.json` (bands, GT) |
| `docs/vision_runs/coords_30b.jsonl` | 165 raw responses, four formats + control |
| `docs/vision_runs/coords_pipeline_30b.jsonl` | 55 raw responses, recommended pipeline |

```bash
# segment and box line 2 of a photo
python3 demo/annotate.py photo.jpg --line 2 --out boxed.png --frame-out frame.png
# see what the segmenter found
python3 demo/annotate.py photo.jpg --all --out debug.png
```
