# Physics: the mistakes students actually make

Demo data for `/tutor/diagnose`. Three ready-to-photograph samples, one per difficulty. Each one carries **exactly one** deliberate error, and every line after that error is arithmetically consistent with it. That is on purpose: with two errors in an image, a diagnosis that names the second one first is not wrong, so the sample cannot be graded.

Text and numbers come from `scripts/render_samples.py`. Change a number there and change it here too.

**The images carry no line numbers**, because students do not number their steps and a photo of real handwriting will not either. Line numbers below are a reading aid for you, not something the model can see. Grade a diagnosis on **which line's content** it flags, not on the integer it prints.

## How these three were chosen

We did not invent plausible-looking errors. We searched what physics teachers and physics-education researchers report as the highest-frequency student mistakes, then picked the top one at each level that a camera can actually see. Sources are listed at the bottom.

Two filters were applied to every candidate:

1. **Frequency.** It must appear on multiple independent "most common mistakes" lists, or in physics-education research.
2. **Visible in written work.** A misconception a student only holds in their head is useless to us. The mistake must show up as a wrong line on paper.

## The most common physics mistakes, ranked

| # | Mistake | Why it is so common | Used here |
|---|---|---|---|
| 1 | Unit conversion skipped (km/h left as km/h, minutes left as minutes) | The formula "works" with any number, so nothing feels wrong | **Easy** |
| 2 | Vector used whole instead of resolved into components | Students see one number in the problem and use that one number | **Medium** |
| 3 | Normal force taken as `mg` on a slope, instead of `mg cos(theta)` | "Normal" is learned as "upward" rather than "perpendicular to the surface" | **Hard** |
| 4 | Sign and direction convention flipped mid-problem | Up and down are chosen once, then forgotten | not used |
| 5 | Confusing mass with weight, speed with velocity, distance with displacement | Everyday language uses these words as synonyms | not used |
| 6 | An invented "force of motion" added to a free-body diagram | Belief that motion needs a continuing force (impetus) | not used |
| 7 | Centripetal force added as an extra force, on top of the real forces | It is taught as a formula before it is taught as a net force | not used |

Mistakes 4 to 7 are real and well documented. They are left out only because three samples is the demo budget. Items 6 and 7 need a free-body diagram to be visible, which is a harder image for the model to read reliably, so they are poor insurance samples.

---

## Easy: unit conversion skipped

**File:** `samples/physics/easy/ques.png`

**Problem:** A car moves at 72 km/h. How far does it travel in 5.0 s?

**What the student wrote:**

```
v = 72 km/h
d = v x t
d = 72 x 5.0
d = 360 m
```

**First error: line 3,** `d = 72 x 5.0`. The speed is in km/h but the time is in seconds. `72 km/h` is `20 m/s`, so line 3 should be `d = 20 x 5.0`.

**Correct answer:** 100 m. The student got 360 m, off by a factor of 3.6.

**Why students do this:** the formula accepts any number. Nothing on the page looks broken, and the answer even comes out in a believable range. Lines 1 and 2 are perfectly correct, which is what makes this a fair test: the model must not stop at the first line it sees.

**Concept:** `linear_motion`. **Root cause:** `derived_units`. The student does not have a broken idea of motion. They have a broken idea of what a unit is.

**Expected diagnosis:** the model must flag `d = 72 x 5.0`, and the WHY should mention mixed units, not arithmetic.

**Socratic opening (do not state the error):** "Look at line 3. What unit of time is hiding inside `72 km/h`, and what unit of time is `5.0 s`?"

---

## Medium: the vector was never resolved

**File:** `samples/physics/medium/ques.png`

**Problem:** A ball is launched at 20 m/s, 60 degrees above the horizontal. How long until it returns to launch height? (g = 9.8 m/s^2)

**What the student wrote:**

```
v_y = 20 m/s
t_up = v_y / g = 20 / 9.8 = 2.04 s
t_total = 2 x 2.04 = 4.08 s
```

**First error: line 1,** `v_y = 20 m/s`. `20 m/s` is the speed along the launch direction, not the vertical component. It should be `v_y = 20 sin(60) = 17.32 m/s`.

**Correct answer:** t_up = 1.77 s, t_total = 3.54 s. The student got 4.08 s.

**Why students do this:** the problem gives one speed, so the student uses that speed. The angle is read as scene-setting, not as data. Note that the method in lines 2 and 3 is completely right. This student understands projectile motion. They do not understand vectors.

**Concept:** `projectile_motion`. **Root cause:** `vector_resolution`.

**This is the demo sample.** It is the one that produces the line in the video script: *"You did not fail projectile motion. You failed vector decomposition, two prerequisites back."* The graph walk from `projectile_motion` to `vector_resolution` is real, and it is visible in `backend/fixtures/hsc_physics_bn.json`.

**Expected diagnosis:** the model must flag `v_y = 20 m/s`, and the WHY should say the vertical component was not taken.

**Socratic opening:** "Your method in lines 2 and 3 is exactly right. Go back to line 1: the ball is moving at 20 m/s, but is all of that motion upward?"

---

## Hard: normal force on a slope

**File:** `samples/physics/hard/ques.png`

**Problem:** A 5.0 kg block slides down a 30 degree incline. The coefficient of kinetic friction is 0.20. Find the friction force. (g = 9.8 m/s^2)

**What the student wrote:**

```
N = mg = 5.0 x 9.8 = 49 N
f = 0.20 x N = 0.20 x 49
f = 9.8 N
```

**First error: line 1,** `N = mg = 5.0 x 9.8 = 49 N`. On a slope the normal force is perpendicular to the surface, not vertical. It should be `N = mg cos(30) = 42.4 N`.

**Correct answer:** 8.5 N. The student got 9.8 N. Only about 15% off, which is exactly what makes it dangerous: the answer looks reasonable, so the student never rechecks it.

**Why students do this:** "normal force" gets learned on flat tables, where `N = mg` is true. The word "normal" means perpendicular to the surface, but almost every early example makes perpendicular and vertical the same thing. When the surface tilts, the habit survives and the physics does not. Research on free-body diagrams reports the same thing: students draw the normal force straight up even when the surface is angled.

**Concept:** `friction`. **Root cause:** `vector_resolution`.

**Note this on purpose:** the medium and hard samples come from different chapters and have the *same* root cause. That is the strongest thing the knowledge graph can show. Run both photos for one learner and the tutor stops treating them as two bad days and starts treating them as one broken prerequisite.

**Expected diagnosis:** the model must flag `N = mg = 5.0 x 9.8 = 49 N`, and the WHY should mention the tilt of the surface.

**Socratic opening:** "Line 1 says the surface pushes with 49 N. Which direction does a ramp push a block, straight up or straight out of the ramp?"

---

## Running them

Paths below are relative to the repo root, so run these from there.

```bash
curl -s -F learner_id=demo \
     -F "problem=A car moves at 72 km/h. How far in 5.0 s?" \
     -F image=@samples/physics/easy/ques.png \
     http://localhost:8080/tutor/diagnose | jq
```

Passing `problem=` is optional but makes the transcription noticeably steadier, because the model can check what it reads against what was asked. Use it on camera.

## Sources

- [K12 Tutoring: The Most Common Physics Mistakes High School Students Make](https://tutoring.k12.com/resources/tutoring-help/science-tutoring-help/physics/the-most-common-physics-mistakes-high-school-students-make/)
- [Matrix Education: 6 Common Mistakes HSC Physics Students Make in Exams](https://www.matrix.edu.au/6-common-mistakes-hsc-physics-students-make-in-exams/)
- [IOP Spark: Many students are unable to identify correctly the forces acting on each object](https://spark.iop.org/many-students-are-unable-identify-correctly-forces-acting-each-object-situation-where-two-or-more)
- [IOP Spark: Many students think the downward motion of a projectile will be affected by its horizontal motion](https://spark.iop.org/many-students-think-downward-motion-projectile-will-be-affected-its-horizontal-motion)
- [Free body diagrams, friction and normal force (College Physics, eCampusOntario)](https://ecampusontario.pressbooks.pub/physicsfundamentals/chapter/7-1-concepts-force-of-friction-and-normal-force-free-body-diagrams/)
- [Centripetal Acceleration: Often Forgotten or Misinterpreted (arXiv)](https://arxiv.org/pdf/1602.06361)
- [Central distractors in Force Concept Inventory data (Phys. Rev. Phys. Educ. Res.)](https://link.aps.org/doi/10.1103/PhysRevPhysEducRes.14.010106)
- [Prescott: Student Misconceptions about Projectile Motion (UTS)](https://opus.lib.uts.edu.au/bitstream/10453/7474/1/2005002166.pdf)
