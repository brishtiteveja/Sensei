# Chemistry: the mistakes students actually make

Demo data for `/tutor/diagnose`. Three ready-to-photograph samples, one per difficulty. Each one carries **exactly one** deliberate error, and every line after that error is arithmetically consistent with it. That is on purpose: with two errors in an image, a diagnosis that names the second one first is not wrong, so the sample cannot be graded.

Text and numbers come from `scripts/render_samples.py`. Change a number there and change it here too.

**The images carry no line numbers**, because students do not number their steps and a photo of real handwriting will not either. Line numbers below are a reading aid for you, not something the model can see. Grade a diagnosis on **which line's content** it flags, not on the integer it prints.

## How these three were chosen

We did not invent plausible-looking errors. We searched what chemistry teachers and chemistry-education researchers report as the highest-frequency student mistakes, then picked the top one at each level. Sources are listed at the bottom.

Two filters were applied to every candidate:

1. **Frequency.** It must appear on multiple independent "most common mistakes" lists, or in chemistry-education research.
2. **Visible in written work.** The mistake must show up as a wrong line on paper, not just a wrong final answer.

## The most common chemistry mistakes, ranked

| # | Mistake | Why it is so common | Used here |
|---|---|---|---|
| 1 | Balancing by changing a subscript instead of a coefficient | The atom count really does come out equal, so the check passes | **Easy** |
| 2 | Limiting reagent picked by raw amount, without dividing by the coefficient | "Which do I have less of" is an obvious question and an almost-right one | **Medium** |
| 3 | Celsius used in a gas law instead of Kelvin | The number is right there in the problem and looks ready to use | **Hard** |
| 4 | Grams used directly in a mole ratio, with no conversion to moles | Coefficients look like they could apply to any quantity | not used |
| 5 | Atomic mass used where the molecule is diatomic (O = 16 instead of O2 = 32) | The element symbol and the molecule share a name in speech | not used |
| 6 | Rounding after every step instead of once at the end | Each step looks tidy, and the error only shows up in the final digit | not used |
| 7 | The wrong value of R for the pressure units in use | R has several values and they differ by orders of magnitude | not used |

Mistakes 4 to 7 are real and well documented. They are left out only because three samples is the demo budget. Research on stoichiometry consistently names the same cluster: the mole concept, balancing, picking the limiting reagent, and theoretical yield.

---

## Easy: balanced by changing a subscript

**File:** `samples/chemistry/easy/ques.png`

**Problem:** Balance `H2 + O2 -> H2O`

**What the student wrote:**

```
H2 + O2  ->  H2O2
Check:   H: 2 = 2,   O: 2 = 2
Balanced.
```

**First error: line 1,** `H2 + O2  ->  H2O2`. The subscript was changed, not the coefficient. That does not balance water. It replaces water with hydrogen peroxide, a different substance.

**Correct answer:** `2 H2 + O2 -> 2 H2O`.

**Why students do this:** **line 2 is true.** H2O2 really does have 2 hydrogen and 2 oxygen, so the student's own check confirms the answer. This is the best example in the whole kit, because the mistake survives the test the student was taught to run. Education research reports it directly: students do not distinguish a coefficient (how many molecules) from a subscript (what the molecule is).

This sample also tests something specific about the model. The error is chemical, not arithmetic. A diagnosis that only checks the numbers will pass this image as correct.

**Concept:** balancing chemical equations. **Root cause:** what a chemical formula means.

**Expected diagnosis:** the model must flag `H2 + O2  ->  H2O2`, and the WHY must say the substance changed, not that the count is wrong.

**Socratic opening (do not state the error):** "Your count on line 2 is correct. So let me ask a different question: on line 1 you wrote H2O2. Is that still water?"

---

## Medium: limiting reagent chosen by raw moles

**File:** `samples/chemistry/medium/ques.png`

**Problem:** `2 H2 + O2 -> 2 H2O`. 6.0 g of H2 reacts with 64 g of O2. What mass of water forms?

**What the student wrote:**

```
n(H2) = 6.0 / 2.0 = 3.0 mol
n(O2) = 64 / 32 = 2.0 mol
O2 is limiting (fewer moles)
n(H2O) = 2 x 2.0 = 4.0 mol
m = 4.0 x 18 = 72 g
```

**First error: line 3,** `O2 is limiting (fewer moles)`. Moles cannot be compared directly, because the equation does not use them 1 to 1. Divide each by its coefficient first: H2 gives `3.0 / 2 = 1.5`, O2 gives `2.0 / 1 = 2.0`. The smaller one is H2, so **H2 is limiting**.

**Correct answer:** 54 g of water. The student got 72 g.

**Why students do this:** lines 1 and 2 are correct, and after that "fewer moles" feels like a complete argument. It is right whenever the coefficients happen to be equal, which covers a lot of textbook practice, so the habit gets reinforced before it gets tested. Research lists identifying the limiting reagent among the core stoichiometry difficulties, alongside the mole concept itself.

Note the trap in the numbers: H2 has *more* moles but is still the limiting reagent. That is only visible after dividing by the coefficient.

**Concept:** limiting reagent. **Root cause:** what a coefficient means as a mole ratio.

**Expected diagnosis:** the model must flag `O2 is limiting (fewer moles)`, and the WHY should mention the 2 to 1 ratio.

**Socratic opening:** "Lines 1 and 2 are exactly right. Line 3: the equation needs 2 H2 for every 1 O2. With 2.0 mol of O2, how much H2 does the reaction actually want?"

---

## Hard: Celsius used in the gas law

**File:** `samples/chemistry/hard/ques.png`

**Problem:** `CaCO3 -> CaO + CO2`. 25.0 g of CaCO3 decomposes completely. Find the volume of CO2 at 25 C and 1.00 atm. R = 0.0821 L atm / mol K.

**What the student wrote:**

```
M(CaCO3) = 40.1 + 12.0 + 3(16.0) = 100.1 g/mol
n(CaCO3) = 25.0 / 100.1 = 0.250 mol
n(CO2) = 0.250 mol      (1 : 1)
V = nRT / P = (0.250)(0.0821)(25) / 1.00
V = 0.513 L
```

**First error: line 4,** `V = nRT / P = (0.250)(0.0821)(25) / 1.00`. T must be in Kelvin. `25 C` is `298 K`, so line 4 should read `(0.250)(0.0821)(298) / 1.00`.

**Correct answer:** 6.12 L. The student got 0.513 L, about 12 times too small.

**Why students do this:** the temperature is printed in the problem as `25`, and `25` is what gets copied. The units of R say `mol K` right there on the page and still get skipped. Multiple sources call this the single most common gas-law error.

**This is the hard sample for a specific reason.** Lines 1, 2 and 3 are all correct, including a molar mass built from four atoms and a mole ratio. The model must verify three good lines before it reaches the bad one. A diagnosis that reports an error in lines 1 to 3 is a false positive, and that is the failure mode worth catching before the camera is on: a tutor that invents an error teaches the student out of something they already had right.

**Concept:** ideal gas law. **Root cause:** absolute temperature scale.

**Expected diagnosis:** the model must flag `V = nRT / P = (0.250)(0.0821)(25) / 1.00`, and the WHY should say Celsius was used where Kelvin is required.

**Socratic opening:** "Everything through line 3 is right. On line 4, look at the units of R that you wrote at the top. What unit does the K at the end demand for your temperature?"

---

## Running them

Paths below are relative to the repo root, so run these from there.

```bash
curl -s -F learner_id=demo \
     -F "problem=Balance H2 + O2 -> H2O" \
     -F image=@samples/chemistry/easy/ques.png \
     http://localhost:8080/tutor/diagnose | jq
```

Passing `problem=` is optional but makes the transcription noticeably steadier, because the model can check what it reads against what was asked. Use it on camera.

## A note on the knowledge graph

`backend/fixtures/hsc_physics_bn.json` gives physics real concept ids, so the root-cause walk in `graph.py` runs for the physics samples today. There is no chemistry graph in the repo yet. To make the root-cause beat work for these three, feed a chemistry syllabus to `POST /curriculum/build` and use the ids it produces. The concepts named above are what that graph needs to contain.

This is also the cheapest place to stage the unrehearsed-syllabus stunt in `PLAN_WIN.md` section 9: chemistry is the subject we have samples for and no graph for, so building the graph live is a real build, not a replay.

## Sources

- [RSC Education: Students' difficulties with stoichiometry](https://edu.rsc.org/resources/students-difficulties-with-stoichiometry-beyond-appearances/4017805.article)
- [Students' misconceptions in stoichiometry (Academia.edu)](https://www.academia.edu/693170/STUDENTS_MISCONCEPTIONS_IN_STOICHIOMETRY)
- [Mind Matters Pedagogy: 4 mistakes students make when learning to balance equations](https://www.mindmatterspedagogy.com/post/4-mistakes-students-make-when-learning-to-balance-equations-and-how-you-can-address-them)
- [Challenges and Misconceptions in Applying Stoichiometry](https://www.solubilityofthings.com/challenges-and-misconceptions-applying-stoichiometry/)
- [RevisionDojo: IB Chemistry stoichiometry common mistakes](https://www.revisiondojo.com/blog/ib-chemistry-stoichiometry-common-mistakes)
- [Albert.io: Ideal Gas Law AP Chemistry review](https://www.albert.io/blog/ideal-gas-law-ap-chemistry-review/)
- [Chemistry LibreTexts: The Ideal Gas Law](https://chem.libretexts.org/Bookshelves/Physical_and_Theoretical_Chemistry_Textbook_Maps/Supplemental_Modules_(Physical_and_Theoretical_Chemistry)/Physical_Properties_of_Matter/States_of_Matter/Properties_of_Gases/Gas_Laws/The_Ideal_Gas_Law)
