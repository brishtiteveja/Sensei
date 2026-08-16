# Math: the mistakes students actually make

Demo data for `/tutor/diagnose`. Three questions, one per difficulty, each in its own directory:

```
easy/   ques.png     the problem alone, no working
        good_1.png   a student who solved it correctly
        bad_1.png    a student who made one realistic mistake
        bad_2.png    a different student, a different mistake
        bad_3.png    ...
```

Only `easy/` has its full solution set so far. `medium/` and `hard/` still bundle the question and one wrong attempt into `ques.png`, and get split the same way once the easy set is signed off.

Every `bad_N` carries **exactly one** deliberate error, and every line after that error is arithmetically consistent with it. That is on purpose: with two errors in an image, a diagnosis that names the second one first is not wrong, so the sample cannot be graded.

The `good_N` images are not filler. **A tutor that finds an error in correct work is worse than one that misses an error**, because it teaches the student out of something they already had right. There is no way to catch that without a correct sample.

Text and numbers come from `scripts/render_samples.py`. Change a number there and change it here too.

**The images carry no line numbers**, because students do not number their steps and a photo of real handwriting will not either. Line numbers below are a reading aid for you, not something the model can see. Grade a diagnosis on **which line's content** it flags, not on the integer it prints.

## How these three were chosen

We did not invent plausible-looking errors. We searched what math teachers and university math departments report as the highest-frequency student mistakes, then picked the top one at each level. The strongest single source is Eric Schechter's error list from Vanderbilt, which ranks errors by how often they appear in real undergraduate work. Sources are listed at the bottom.

Two filters were applied to every candidate:

1. **Frequency.** It must appear on multiple independent "most common mistakes" lists, or in math-education research.
2. **Visible in written work.** The mistake must show up as a wrong line on paper, not just a wrong final answer.

## The most common math mistakes, ranked

| # | Mistake | Why it is so common | Used here |
|---|---|---|---|
| 1 | Sign errors, above all a negative not distributed across parentheses | The minus is read as "this number is negative" instead of "subtract everything that follows" | **Easy** |
| 2 | Linearity assumed where it does not hold: `(a+b)^2 = a^2 + b^2` | Distribution over multiplication is drilled first, then over-applied to every operation | **Medium** |
| 3 | Chain rule: outer function differentiated, inner function forgotten | The inner function is not seen as a separate thing that also changes | **Hard** |
| 4 | Only one term divided or multiplied when the whole side should be | The operation is applied to the term the student is looking at, not the equation | not used |
| 5 | Order of operations, especially `-3^2` read as `(-3)^2` | Handwriting hides which part the exponent belongs to | not used |
| 6 | Invisible parentheses lost partway through | They were never written, so there is nothing on the page to remind the student | not used |
| 7 | Negative root dropped when taking a square root | `sqrt` returns one number on a calculator, so `x^2 = 16` looks like it has one answer | not used |

Mistakes 4 to 7 are real and well documented. They are left out only because three samples is the demo budget. Note that 2, 3 and 6 are the same underlying error in different clothes: *the student applied a rule in a place where that rule is not true*.

---

## Easy: the negative was not distributed

**Directory:** `samples/math/easy/` &nbsp; **Problem:** Solve `5 - (2x - 4) = 11` &nbsp; **Correct answer:** `x = -1`

| File | Answer | First error | The mistake |
|---|---|---|---|
| `good_1.png` | **-1** | none | correct, every line clean |
| `bad_1.png` | -5 | line 1 | minus distributed to `2x` only, not to `-4` |
| `bad_2.png` | 1 | line 4 | distribution correct, then the minus on `-2x` is dropped |
| `bad_3.png` | -2 | line 5 | method fully correct, final division wrong |

The three failures sit on **three different lines** on purpose, so the set tests whether the tutor localizes the error rather than just detecting one. They also differ in kind: `bad_1` is conceptual, `bad_2` is a sign slip, `bad_3` is pure arithmetic. If the tutor answers `bad_3` by re-teaching distribution, it is pattern-matching, not diagnosing.

`bad_2` and `bad_3` share their first three lines with `good_1`. That is deliberate: identical correct openings, three different verdicts.

### `good_1.png` (correct)

```
5 - 2x + 4 = 11
9 - 2x = 11
-2x = 11 - 9
-2x = 2
x = -1
```

**Expected diagnosis:** `FIRST_ERROR: NONE`. Anything else is a false positive, and this is the single most important image in the directory.

**Expected tutor opening:** confirm the work and move them forward. It must not invent a correction, and it must not ask them to re-check a line that is right.

### `bad_1.png` (answer -5)

```
5 - 2x - 4 = 11
1 - 2x = 11
-2x = 10
x = -5
```

**First error: line 1,** `5 - 2x - 4 = 11`. The minus applies to both terms in the parentheses. `- (2x - 4)` is `- 2x + 4`, not `- 2x - 4`. Line 1 should read `5 - 2x + 4 = 11`.

**Why students do this:** the minus is distributed to the first term and then quietly forgotten for the second. Lines 2, 3 and 4 are all correct algebra performed on a wrong line 1, which is the normal shape of a sign error: one bad character, then three flawless steps. This is the single most reported mistake in school algebra.

**Root cause:** distributing over subtraction.

**Expected diagnosis:** the model must flag `5 - 2x - 4 = 11`, and the WHY should mention the sign of the `4`.

**Socratic opening (do not state the error):** "Your last three lines are clean. Go back to the first: the minus in front of the bracket has to reach both things inside. What does it do to the `-4`?"

### `bad_2.png` (answer 1)

```
5 - 2x + 4 = 11
9 - 2x = 11
-2x = 11 - 9
2x = 2
x = 1
```

**First error: line 4,** `2x = 2`. The previous line says `-2x = 2`. The minus was dropped rather than divided out, so the sign of the answer flips.

**Why students do this:** the student treats "get rid of the minus" as a tidying step instead of a division by `-2`. The distribution on line 1 is correct, which is what makes this different from `bad_1`: same subject, later failure, and the tutor must not send them back to re-learn distribution.

**Root cause:** dividing both sides by a negative coefficient.

**Expected diagnosis:** the model must flag `2x = 2`, and the WHY should say the negative sign was dropped instead of divided.

**Socratic opening:** "You got all the way to `-2x = 2` correctly. To get `x` alone from `-2x`, what exactly do you divide both sides by?"

### `bad_3.png` (answer -2)

```
5 - 2x + 4 = 11
9 - 2x = 11
-2x = 11 - 9
-2x = 2
x = -2
```

**First error: line 5,** `x = -2`. Every line above is right. `2` divided by `-2` is `-1`, not `-2`.

**Why students do this:** the `2` gets carried down with a sign attached instead of being divided. This is a computation slip, not a broken concept, and that is exactly what it is here to test. The tutor should correct the arithmetic and leave the method alone. If it starts re-teaching brackets or signs-across-the-equals, it is responding to the topic rather than to this student.

**Root cause:** none upstream. Do not walk the graph on this one.

**Expected diagnosis:** the model must flag `x = -2`, and the WHY should point at the division, not at the method.

**Socratic opening:** "Your whole method is right, so let us just check the last step. What is `2` divided by `-2`?"

---

## Medium: squaring a sum term by term

**File:** `samples/math/medium/ques.png`

**Problem:** Solve `(x + 3)^2 = 25`

**What the student wrote:**

```
x^2 + 9 = 25
x^2 = 16
x = 4   or   x = -4
```

**First error: line 1,** `x^2 + 9 = 25`. `(x + 3)^2` is `x^2 + 6x + 9`, not `x^2 + 9`. The middle term is missing.

**Correct answer:** x = 2 or x = -8. The student got x = 4 or x = -4.

**Why students do this:** squaring is treated as something that happens to each term separately, the way multiplying by a constant does. `3(x + 3)` really is `3x + 9`, so the habit works once and then keeps getting applied. Schechter calls this class of error "everything is additive", and lists it near the top: the same instinct produces `sqrt(x+y) = sqrt(x) + sqrt(y)` and `1/(x+y) = 1/x + 1/y`.

Give the student credit for line 3: they kept both roots, which is itself a commonly dropped step.

**Concept:** quadratic equations. **Root cause:** expanding a binomial square.

**Expected diagnosis:** the model must flag `x^2 + 9 = 25`, and the WHY should say the middle term `6x` is missing.

**Socratic opening:** "You remembered both roots on line 3, good. Now check line 1 by writing `(x + 3)^2` as `(x + 3)(x + 3)` and multiplying it out. How many terms do you get?"

---

## Hard: chain rule, inner derivative forgotten

**File:** `samples/math/hard/ques.png`

**Problem:** Differentiate `y = sin(3x^2)` and find `dy/dx` at `x = 1`.

**What the student wrote:**

```
dy/dx = cos(3x^2)
At x = 1:   dy/dx = cos(3)
= -0.99
```

**First error: line 1,** `dy/dx = cos(3x^2)`. The derivative of the inside is missing. It should be `dy/dx = cos(3x^2) * 6x`.

**Correct answer:** `dy/dx = 6x cos(3x^2)`, which at x = 1 is `6 cos(3) = -5.94`. The student got -0.99, exactly 6 times too small.

**Why students do this:** `sin(3x^2)` is read as "sine, of some stuff". The student differentiates the sine and treats the inside as a label rather than as a function that is also changing. Lines 2 and 3 are then executed perfectly, including the evaluation of `cos(3)` in radians, which many students get wrong. This is a strong student with one missing rule, and the diagnosis should say so.

**Concept:** differentiation of composite functions. **Root cause:** chain rule.

**Expected diagnosis:** the model must flag `dy/dx = cos(3x^2)`, and the WHY should mention the derivative of the inner function `3x^2`.

**Socratic opening:** "Your evaluation in lines 2 and 3 is right, including the radians. Line 1: when `x` moves a little, `sin` is not the only thing that changes. What else does?"

---

## Running them

Paths below are relative to the repo root, so run these from there. Send a `good_N` or `bad_N` image, never `ques.png`, which has no working to diagnose.

```bash
curl -s -F learner_id=demo \
     -F "problem=Solve 5 - (2x - 4) = 11" \
     -F image=@samples/math/easy/bad_1.png \
     http://localhost:8080/tutor/diagnose | jq
```

Run `good_1.png` through the same command before every demo. It is the fastest check that the tutor is not inventing errors.

Passing `problem=` is optional but makes the transcription noticeably steadier, because the model can check what it reads against what was asked. Use it on camera.

## A note on the knowledge graph

`backend/fixtures/hsc_physics_bn.json` gives physics real concept ids, so the root-cause walk in `graph.py` runs for the physics samples today. There is no math graph in the repo yet. To make the root-cause beat work for these three, feed a math syllabus to `POST /curriculum/build` and use the ids it produces. The concepts named above are what that graph needs to contain.

## Sources

- [Schechter (Vanderbilt): The most common errors in undergraduate mathematics](https://math.vanderbilt.edu/schectex/commerrs/)
- [LibreTexts: Common Mistakes in Algebra](https://math.libretexts.org/Courses/Northern_Illinois_University/Conceptual_Mathematics_in_Society/04:_Algebra/4.08:_Common_Mistakes_in_Algebra)
- [Mathnasium: 5 Most Common Algebra Test Mistakes](https://www.mathnasium.com/math-centers/lakewoodco/news/common-algebra-mistakes)
- [eTutorWorld: Top 10 Algebra Mistakes Students Make](https://www.etutorworld.com/blog/top-10-algebra-mistakes-students-make-and-how-to-avoid-them/)
- [Students' common errors in quadratic equations (Infinity, journal PDF)](https://www.e-journal.stkipsiliwangi.ac.id/index.php/infinity/article/download/3843/1909)
- [Khan Academy: Examining common chain rule misunderstandings](https://www.khanacademy.org/math/ap-calculus-ab/ab-differentiation-2-new/ab-3-1a/v/common-chain-rule-misunderstandings)
- [Paul's Online Notes: Chain Rule](https://tutorial.math.lamar.edu/classes/calci/chainrule.aspx)
