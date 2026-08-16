# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow>=10.0"]
# ///
"""Render the demo work samples into samples/<subject>/<topic>/.

Run: uv run scripts/render_samples.py

Per question directory:
  ques.png     the problem alone, in a printed font -- this is the worksheet
  good_N.png   a student who solved it correctly, in handwriting
  bad_N.png    a student who made one realistic mistake, in handwriting

The good_N images are not filler. A tutor that finds an error in correct work is worse
than one that misses an error, because it teaches the student out of something they
already had right. There is no way to catch that without a correct sample.

Handwriting is faked with a handwriting font plus per-character rotation, offset and
spacing jitter. It is a proxy for a real photo, not a replacement -- but it is far closer
to the real task than a clean print font, and it is deterministic, which a photo is not.
Each student gets a different hand so the tutor cannot be tuned to one.

The jitter is seeded per image, so re-running produces byte-identical files. Do not make
the seed depend on the clock; every render would then dirty the whole repo.

This file is the source of truth for the sample text. Each samples/<subject>/README.md
quotes it; if you change a number here, change it there too.

Every bad_N sample carries exactly ONE deliberate error, and every line after it is
arithmetically consistent with that error. That is deliberate: a diagnosis that reports
the second error first is not wrong, so a two-error sample cannot be graded.

Work lines are NOT numbered. Students do not number their steps, and a photo of real
handwriting will not either. Grade a diagnosis on which line's *content* it flags, not on
the integer it prints -- DIAGNOSIS_SYSTEM transcribes before it counts.
"""

import math
import random
from functools import partial
import zlib
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "samples"
FONT_DIR = ROOT / "assets" / "fonts"

# ASCII only. Students write x squared and subscript 2, but a glyph the font is missing
# renders as a box, and the model then transcribes a box. Not worth the risk on camera.
EXAMPLES = [
    # ================================================================= math
    {
        "subject": "math",
        "level": "easy",
        "slug": "distribute_negative",
        "problem": ["Solve:   5 - (2x - 4) = 11"],
        # Correct answer: x = -1. The three wrong paths fail on three different lines,
        # so the set tests whether the tutor localises the error, not just detects one.
        "solutions": [
            {
                # Textbook-clean. If the tutor invents an error here, nothing else in
                # the kit matters.
                "name": "good_1",
                "work": [
                    "5 - 2x + 4 = 11",
                    "9 - 2x = 11",
                    "-2x = 11 - 9",
                    "-2x = 2",
                    "x = -1",
                ],
            },
            {
                # Minus distributed to the first term only. The most reported school
                # algebra error. Wrong from line 1, then three clean steps.
                "name": "bad_1",
                "work": [
                    "5 - 2x - 4 = 11",
                    "1 - 2x = 11",
                    "-2x = 10",
                    "x = -5",
                ],
            },
            {
                # Distribution correct. Negative on -2x dropped while isolating x.
                "name": "bad_2",
                "work": [
                    "5 - 2x + 4 = 11",
                    "9 - 2x = 11",
                    "-2x = 11 - 9",
                    "2x = 2",
                    "x = 1",
                ],
            },
            {
                # Method entirely correct. Last line divides wrong: 2 / -2 read as -2.
                # Tests arithmetic slip vs concept error -- the tutor should not
                # re-teach distribution here.
                "name": "bad_3",
                "work": [
                    "5 - 2x + 4 = 11",
                    "9 - 2x = 11",
                    "-2x = 11 - 9",
                    "-2x = 2",
                    "x = -2",
                ],
            },
        ],
    },
    {
        "subject": "math",
        "level": "medium",
        "slug": "square_of_sum",
        "problem": ["Solve:   (x + 3)^2 = 25"],
        "solutions": [
            {
                "name": "bad_1",
                "work": [
                    "x^2 + 9 = 25",
                    "x^2 = 16",
                    "x = 4   or   x = -4",
                ],
            },
        ],
    },
    {
        "subject": "math",
        "level": "hard",
        "slug": "chain_rule",
        "problem": [
            "Differentiate  y = sin(3x^2)",
            "and find dy/dx at x = 1.",
        ],
        "solutions": [
            {
                "name": "bad_1",
                "work": [
                    "dy/dx = cos(3x^2)",
                    "At x = 1:   dy/dx = cos(3)",
                    "= -0.99",
                ],
            },
        ],
    },
    # ---------------------------------------------- math, advanced (by topic)
    {
        "subject": "math",
        "level": "area_between_curves",
        "slug": "area_between_curves",
        "problem": [
            "The curves  y = x^2 - 4x + 3  and  y = x - 1",
            "intersect at two points.",
            "Find the exact area enclosed between the two curves.",
        ],
        # Correct answer: 9/2.
        "solutions": [
            {
                "name": "good_1",
                "work": [
                    "x^2 - 4x + 3 = x - 1",
                    "x^2 - 5x + 4 = 0",
                    "(x - 1)(x - 4) = 0   ->   x = 1, x = 4",
                    "At x = 2:  line = 1, curve = -1, so line is above",
                    "A = int_1^4 [(x - 1) - (x^2 - 4x + 3)] dx",
                    "A = int_1^4 (-x^2 + 5x - 4) dx",
                    "A = [-x^3/3 + 5x^2/2 - 4x] from 1 to 4",
                    "A = (8/3) - (-11/6)",
                    "A = 9/2",
                ],
            },
            {
                # Subtracted the wrong way round. Reports a negative area and does not
                # notice that an area cannot be negative.
                "name": "bad_1",
                "work": [
                    "x^2 - 4x + 3 = x - 1",
                    "x^2 - 5x + 4 = 0",
                    "(x - 1)(x - 4) = 0   ->   x = 1, x = 4",
                    "A = int_1^4 [(x^2 - 4x + 3) - (x - 1)] dx",
                    "A = int_1^4 (x^2 - 5x + 4) dx",
                    "A = [x^3/3 - 5x^2/2 + 4x] from 1 to 4",
                    "A = (-8/3) - (11/6)",
                    "A = -9/2",
                ],
            },
            {
                # Found where the PARABOLA meets the x-axis instead of where the two
                # curves meet. Limits 1 and 3 instead of 1 and 4.
                "name": "bad_2",
                "work": [
                    "x^2 - 4x + 3 = 0",
                    "(x - 1)(x - 3) = 0   ->   x = 1, x = 3",
                    "A = int_1^3 [(x - 1) - (x^2 - 4x + 3)] dx",
                    "A = int_1^3 (-x^2 + 5x - 4) dx",
                    "A = [-x^3/3 + 5x^2/2 - 4x] from 1 to 3",
                    "A = (3/2) - (-11/6)",
                    "A = 10/3",
                ],
            },
            {
                # Six correct lines, then subtracts a negative as if it were positive.
                # F(1) = -11/6, written as +11/6.
                "name": "bad_3",
                "work": [
                    "x^2 - 4x + 3 = x - 1",
                    "x^2 - 5x + 4 = 0",
                    "(x - 1)(x - 4) = 0   ->   x = 1, x = 4",
                    "A = int_1^4 [(x - 1) - (x^2 - 4x + 3)] dx",
                    "A = int_1^4 (-x^2 + 5x - 4) dx",
                    "A = [-x^3/3 + 5x^2/2 - 4x] from 1 to 4",
                    "A = (8/3) - (11/6)",
                    "A = 5/6",
                ],
            },
        ],
    },
    {
        "subject": "math",
        "level": "optimization",
        "slug": "optimization",
        "problem": [
            "A rectangular sheet of cardboard measures 30 cm x 20 cm.",
            "Squares of side x are cut from each corner and the sides",
            "are folded up to form an open box.",
            "Find the value of x that maximizes the volume.",
        ],
        # Correct answer: x = (25 - 5 sqrt7)/3 = 3.92 cm, V = 1056.3 cm^3.
        "solutions": [
            {
                "name": "good_1",
                "work": [
                    "V = x(30 - 2x)(20 - 2x)",
                    "V = 4x^3 - 100x^2 + 600x",
                    "dV/dx = 12x^2 - 200x + 600 = 0",
                    "3x^2 - 50x + 150 = 0",
                    "x = [50 +- sqrt(2500 - 1800)] / 6",
                    "x = (50 +- sqrt700) / 6  ->  x = 3.92 or x = 12.74",
                    "Need 0 < x < 10, so reject x = 12.74",
                    "d2V/dx2 = 24(3.92) - 200 = -105.9 < 0, so maximum",
                    "x = 3.92 cm",
                ],
            },
            {
                # Forgot the square is cut from BOTH ends of each side. The calculus
                # that follows is flawless, so the root cause is modelling.
                "name": "bad_1",
                "work": [
                    "V = x(30 - x)(20 - x)",
                    "V = x^3 - 50x^2 + 600x",
                    "dV/dx = 3x^2 - 100x + 600 = 0",
                    "x = [100 +- sqrt(10000 - 7200)] / 6",
                    "x = (100 +- sqrt2800) / 6  ->  x = 7.85 or x = 25.49",
                    "x = 7.85 cm",
                ],
            },
            {
                # Every number correct. Keeps the root outside the domain, so the box
                # has a side of 20 - 2(12.74) = -5.49 cm. Tests sanity checking.
                "name": "bad_2",
                "work": [
                    "V = x(30 - 2x)(20 - 2x)",
                    "V = 4x^3 - 100x^2 + 600x",
                    "dV/dx = 12x^2 - 200x + 600 = 0",
                    "3x^2 - 50x + 150 = 0",
                    "x = (50 +- sqrt700) / 6",
                    "x = 3.92 or x = 12.74",
                    "A bigger cut gives a bigger box, so x = 12.74 cm",
                ],
            },
            {
                # Lost the (-2x)(-2x) = 4x^2 term while expanding. Gives a clean,
                # believable x = 3.
                "name": "bad_3",
                "work": [
                    "V = x(30 - 2x)(20 - 2x)",
                    "(30 - 2x)(20 - 2x) = 600 - 60x - 40x = 600 - 100x",
                    "V = 600x - 100x^2",
                    "dV/dx = 600 - 200x = 0",
                    "x = 3 cm",
                ],
            },
        ],
    },
    {
        "subject": "math",
        "level": "trig_equation",
        "slug": "trig_equation",
        "problem": [
            "Solve for all x in 0 <= x <= 360 degrees:",
            "2 sin^2 x - 3 sin x cos x - cos^2 x = 0",
        ],
        # Correct: x = 60.68, 164.32, 240.68, 344.32 degrees.
        "solutions": [
            {
                "name": "good_1",
                "work": [
                    "If cos x = 0 then 2(1) - 0 - 0 = 2, not 0. So cos x =/= 0.",
                    "Divide by cos^2 x:",
                    "2 tan^2 x - 3 tan x - 1 = 0",
                    "tan x = [3 +- sqrt(9 + 8)] / 4",
                    "tan x = 1.7808   or   tan x = -0.2808",
                    "tan x = 1.7808  ->  x = 60.68, 240.68",
                    "tan x = -0.2808  ->  x = 164.32, 344.32",
                    "x = 60.68, 164.32, 240.68, 344.32 degrees",
                ],
            },
            {
                # EVERY LINE IS TRUE. Only the second branch of each tangent is
                # missing. A prompt that hunts for a wrong line will pass this.
                "name": "bad_1",
                "work": [
                    "Divide by cos^2 x:",
                    "2 tan^2 x - 3 tan x - 1 = 0",
                    "tan x = [3 +- sqrt(9 + 8)] / 4",
                    "tan x = 1.7808   or   tan x = -0.2808",
                    "arctan(1.7808) = 60.68",
                    "arctan(-0.2808) = -15.68, so x = 180 - 15.68 = 164.32",
                    "x = 60.68 and 164.32 degrees",
                ],
            },
            {
                # Discriminant: -4ac with c = -1 adds, it does not subtract.
                # 9 - 8 = 1 instead of 9 + 8 = 17. Both branches taken correctly.
                "name": "bad_2",
                "work": [
                    "Divide by cos^2 x:",
                    "2 tan^2 x - 3 tan x - 1 = 0",
                    "tan x = [3 +- sqrt(9 - 8)] / 4",
                    "tan x = (3 + 1)/4 = 1   or   (3 - 1)/4 = 0.5",
                    "tan x = 1  ->  x = 45, 225",
                    "tan x = 0.5  ->  x = 26.57, 206.57",
                    "x = 26.57, 45, 206.57, 225 degrees",
                ],
            },
            {
                # Guess-factored. (2sinx + cosx)(sinx - cosx) expands to a middle
                # term of -1 sin x cos x, not -3. Everything after is flawless.
                "name": "bad_3",
                "work": [
                    "2 sin^2 x - 3 sin x cos x - cos^2 x = 0",
                    "(2 sin x + cos x)(sin x - cos x) = 0",
                    "2 sin x + cos x = 0  ->  tan x = -0.5",
                    "sin x - cos x = 0  ->  tan x = 1",
                    "tan x = -0.5  ->  x = 153.43, 333.43",
                    "tan x = 1  ->  x = 45, 225",
                    "x = 45, 153.43, 225, 333.43 degrees",
                ],
            },
        ],
    },
    # -------------------------------------------- math, geometry (with figures)
    {
        "subject": "math",
        "level": "circle_geometry",
        "slug": "circle_chord",
        "figure": "circle_chord",
        "problem": [
            "A circle has centre O and radius 10 cm.",
            "A chord AB has length 16 cm.",
            "Draw a labelled diagram, then find:",
            "(i)  the perpendicular distance from O to AB,",
            "(ii) the angle AOB subtended at the centre.",
        ],
        # Correct: d = 6 cm, angle AOB = 106.26 degrees.
        # In right triangle OMA the right angle is at M, so the angle AT O has
        # OM adjacent and AM opposite: sin(AOM) = 8/10, NOT cos. Using cos with 8/10
        # returns 36.87, which is the angle at A. No sample uses that trap yet.
        "solutions": [
            {
                "name": "good_1",
                "work": [
                    "The perpendicular from O bisects AB",
                    "AM = MB = 16/2 = 8 cm",
                    "In right triangle OMA:",
                    "OA^2 = OM^2 + AM^2",
                    "10^2 = d^2 + 8^2",
                    "100 = d^2 + 64",
                    "d^2 = 36,   d = 6 cm",
                    "sin(AOM) = AM/OA = 8/10 = 0.8",
                    "AOM = 53.13 deg",
                    "AOB = 2 x 53.13 = 106.26 deg",
                ],
            },
            {
                # Pythagoras applied in the wrong direction: added instead of
                # subtracted. Gives d = 12.8 cm, which is FURTHER than the radius --
                # impossible. The angle work below is untouched and stays correct.
                "name": "bad_1",
                "work": [
                    "AM = MB = 16/2 = 8 cm",
                    "In right triangle OMA:",
                    "OM^2 = OA^2 + AM^2",
                    "d^2 = 10^2 + 8^2 = 164",
                    "d = 12.8 cm",
                    "sin(AOM) = AM/OA = 8/10 = 0.8",
                    "AOM = 53.13 deg",
                    "AOB = 2 x 53.13 = 106.26 deg",
                ],
            },
            {
                # Answered the half-angle. Everything above is right; the student
                # simply forgot the chord subtends TWICE the angle AOM.
                "name": "bad_2",
                "work": [
                    "AM = MB = 16/2 = 8 cm",
                    "OA^2 = OM^2 + AM^2",
                    "100 = d^2 + 64",
                    "d^2 = 36,   d = 6 cm",
                    "sin(AOM) = AM/OA = 8/10 = 0.8",
                    "AOM = 53.13 deg",
                    "AOB = 53.13 deg",
                ],
            },
            {
                # Pure arithmetic slip: 100 - 64 read as 34. Method entirely correct,
                # so the tutor should fix the subtraction, not re-teach the circle.
                "name": "bad_3",
                "work": [
                    "AM = MB = 16/2 = 8 cm",
                    "OA^2 = OM^2 + AM^2",
                    "10^2 = d^2 + 8^2",
                    "100 = d^2 + 64",
                    "d^2 = 34",
                    "d = 5.83 cm",
                ],
            },
        ],
    },
    {
        "subject": "math",
        "level": "cone",
        "slug": "cone",
        "figure": "cone",
        "problem": [
            "A right circular cone has radius 6 cm",
            "and slant height 10 cm.",
            "Draw a labelled diagram, then find:",
            "(i) the vertical height,  (ii) the total surface area,",
            "(iii) the volume.",
        ],
        # Correct: h = 8 cm, total surface area 96 pi cm^2, volume 96 pi cm^3.
        # The two 96 pi are a genuine coincidence of these numbers, not a typo.
        "solutions": [
            {
                "name": "good_1",
                "work": [
                    "In right triangle POA:",
                    "PA^2 = PO^2 + OA^2",
                    "10^2 = h^2 + 6^2",
                    "h^2 = 100 - 36 = 64,   h = 8 cm",
                    "Curved area = pi r l = pi(6)(10) = 60 pi",
                    "Base area = pi r^2 = pi(6)^2 = 36 pi",
                    "Total = 60 pi + 36 pi = 96 pi cm^2",
                    "V = (1/3) pi r^2 h = (1/3) pi (36)(8)",
                    "V = 96 pi cm^3",
                ],
            },
            {
                # "Total" surface area given as the curved area only. The base is
                # missing. Height and volume either side of it are correct.
                "name": "bad_1",
                "work": [
                    "10^2 = h^2 + 6^2",
                    "h^2 = 100 - 36 = 64,   h = 8 cm",
                    "Total surface area = pi r l",
                    "= pi(6)(10) = 60 pi cm^2",
                    "V = (1/3) pi r^2 h = (1/3) pi (36)(8)",
                    "V = 96 pi cm^3",
                ],
            },
            {
                # Slant height used in the volume instead of the vertical height.
                # Very common: both are "the 10" on the diagram.
                "name": "bad_2",
                "work": [
                    "10^2 = h^2 + 6^2",
                    "h^2 = 100 - 36 = 64,   h = 8 cm",
                    "Curved area = pi r l = pi(6)(10) = 60 pi",
                    "Base area = pi r^2 = 36 pi",
                    "Total = 96 pi cm^2",
                    "V = (1/3) pi r^2 l = (1/3) pi (36)(10)",
                    "V = 120 pi cm^3",
                ],
            },
            {
                # Pythagoras in the wrong direction on the very first line: the slant
                # height is the hypotenuse, so it cannot be a leg.
                "name": "bad_3",
                "work": [
                    "h^2 = 10^2 + 6^2 = 136",
                    "h = 11.66 cm",
                    "Curved area = pi r l = pi(6)(10) = 60 pi",
                    "Base area = pi r^2 = 36 pi",
                    "Total = 96 pi cm^2",
                    "V = (1/3) pi (36)(11.66)",
                    "V = 139.9 pi cm^3",
                ],
            },
        ],
    },
    # ============================================================== physics
    {
        "subject": "physics",
        "level": "easy",
        "slug": "unit_conversion",
        "problem": [
            "A car moves at 72 km/h.",
            "How far does it travel in 5.0 s?",
        ],
        "solutions": [
            {
                "name": "good_1",
                "work": [
                    "v = 72 km/h",
                    "= 72 x 1000 / 3600 = 20 m/s",
                    "d = v x t",
                    "d = 20 x 5.0",
                    "d = 100 m",
                ],
            },
            {
                "name": "bad_1",
                "work": [
                    "v = 72 km/h",
                    "d = v x t",
                    "d = 72 x 5.0",
                    "d = 360 m",
                ],
            },
        ],
    },
    {
        "subject": "physics",
        "level": "medium",
        "slug": "projectile_component",
        "problem": [
            "A ball is launched at 20 m/s, 60 degrees above the horizontal.",
            "How long until it returns to launch height?  (g = 9.8 m/s^2)",
        ],
        "solutions": [
            {
                "name": "good_1",
                "work": [
                    "v_y = 20 sin60 = 17.32 m/s",
                    "t_up = v_y / g = 17.32 / 9.8 = 1.77 s",
                    "t_total = 2 x 1.77 = 3.54 s",
                ],
            },
            {
                "name": "bad_1",
                "work": [
                    "v_y = 20 m/s",
                    "t_up = v_y / g = 20 / 9.8 = 2.04 s",
                    "t_total = 2 x 2.04 = 4.08 s",
                ],
            },
        ],
    },
    {
        "subject": "physics",
        "level": "hard",
        "slug": "incline_normal_force",
        "problem": [
            "A 5.0 kg block slides down a 30 degree incline.",
            "The coefficient of kinetic friction is 0.20.",
            "Find the friction force.  (g = 9.8 m/s^2)",
        ],
        "solutions": [
            {
                "name": "good_1",
                "work": [
                    "The slope tilts the normal force off vertical",
                    "N = mg cos30 = 5.0 x 9.8 x cos30",
                    "N = 42.4 N",
                    "f = 0.20 x N = 0.20 x 42.4",
                    "f = 8.5 N",
                ],
            },
            {
                "name": "bad_1",
                "work": [
                    "N = mg = 5.0 x 9.8 = 49 N",
                    "f = 0.20 x N = 0.20 x 49",
                    "f = 9.8 N",
                ],
            },
        ],
    },
    # ------------------------------------------- physics, advanced (with figures)
    {
        "subject": "physics",
        "level": "projectile_cliff",
        "slug": "projectile_cliff",
        "figure": "projectile_cliff",
        "problem": [
            "A ball is launched from the top of a 20 m cliff at 25 m/s,",
            "35 degrees above the horizontal.  g = 9.8 m/s^2.  Find:",
            "(i) the components of the initial velocity,",
            "(ii) the maximum height above the ground,",
            "(iii) the total time of flight,  (iv) the horizontal range.",
            "Draw a diagram of the trajectory with the components marked.",
        ],
        # Correct: v0x = 20.48, v0y = 14.34, H = 30.49 m, t = 3.96 s, R = 81.0 m.
        "solutions": [
            {
                "name": "good_1",
                "work": [
                    "v0x = 25 cos35 = 20.48 m/s",
                    "v0y = 25 sin35 = 14.34 m/s",
                    "At the top v_y = 0:  v_y^2 = v0y^2 - 2gh",
                    "h = 14.34^2 / (2 x 9.8) = 10.49 m",
                    "Max height above ground = 20 + 10.49 = 30.49 m",
                    "Landing:  0 = 20 + 14.34t - 4.9t^2",
                    "4.9t^2 - 14.34t - 20 = 0",
                    "t = [14.34 + sqrt(597.64)] / 9.8 = 3.96 s",
                    "R = v0x t = 20.48 x 3.96 = 81.1 m",
                ],
            },
            {
                # sin and cos swapped on the very first line. Everything after is
                # correct method on the wrong two numbers.
                "name": "bad_1",
                "work": [
                    "v0x = 25 sin35 = 14.34 m/s",
                    "v0y = 25 cos35 = 20.48 m/s",
                    "h = 20.48^2 / (2 x 9.8) = 21.40 m",
                    "Max height above ground = 20 + 21.40 = 41.40 m",
                    "4.9t^2 - 20.48t - 20 = 0",
                    "t = [20.48 + sqrt(811.4)] / 9.8 = 5.00 s",
                    "R = 14.34 x 5.00 = 71.7 m",
                ],
            },
            {
                # Used the symmetric range formula, which assumes the ball lands at
                # launch height. It lands 20 m lower, so the flight is longer.
                "name": "bad_2",
                "work": [
                    "v0x = 25 cos35 = 20.48 m/s",
                    "v0y = 25 sin35 = 14.34 m/s",
                    "h = 14.34^2 / (2 x 9.8) = 10.49 m",
                    "Max height above ground = 20 + 10.49 = 30.49 m",
                    "t = 2 v0y / g = 2 x 14.34 / 9.8 = 2.93 s",
                    "R = 20.48 x 2.93 = 60.0 m",
                ],
            },
            {
                # Answered "height above the launch point" when the question asks for
                # height above the GROUND. The 20 m cliff is never added back.
                "name": "bad_3",
                "work": [
                    "v0x = 25 cos35 = 20.48 m/s",
                    "v0y = 25 sin35 = 14.34 m/s",
                    "h = 14.34^2 / (2 x 9.8) = 10.49 m",
                    "Max height above ground = 10.49 m",
                    "4.9t^2 - 14.34t - 20 = 0",
                    "t = [14.34 + sqrt(597.64)] / 9.8 = 3.96 s",
                    "R = 20.48 x 3.96 = 81.1 m",
                ],
            },
        ],
    },
    {
        "subject": "physics",
        "level": "gravitation",
        "slug": "gravitation",
        "figure": "gravitation",
        "problem": [
            "An 800 kg satellite lies on the line between Earth and Moon,",
            "3.0 x 10^8 m from Earth's centre. Earth-Moon centres are",
            "3.84 x 10^8 m apart.  M_E = 5.97 x 10^24 kg,",
            "M_M = 7.35 x 10^22 kg,  G = 6.67 x 10^-11.  Find each force",
            "on the satellite and the net force.",
            "Draw a diagram showing both force vectors.",
        ],
        # Correct: F_E = 3.54 N, F_M = 0.556 N, net = 2.98 N toward Earth.
        # Rounding the numerator to 3.18e17 before dividing gives 3.53 and a net of
        # 2.97 -- both wrong in the last digit. Round once, at the end.
        "solutions": [
            {
                "name": "good_1",
                "work": [
                    "r_E = 3.0 x 10^8 m",
                    "r_M = 3.84 x 10^8 - 3.0 x 10^8 = 0.84 x 10^8 m",
                    "F_E = G M_E m / r_E^2",
                    "= (6.67e-11)(5.97e24)(800) / (3.0e8)^2 = 3.54 N",
                    "F_M = G M_M m / r_M^2",
                    "= (6.67e-11)(7.35e22)(800) / (0.84e8)^2 = 0.556 N",
                    "The two pull in opposite directions, so subtract:",
                    "F_net = 3.54 - 0.556 = 2.98 N toward Earth",
                ],
            },
            {
                # Used the full Earth-Moon separation for the Moon term instead of the
                # satellite-to-Moon gap. The Moon's pull comes out 20x too small.
                "name": "bad_1",
                "work": [
                    "r_E = 3.0 x 10^8 m",
                    "r_M = 3.84 x 10^8 m",
                    "F_E = (6.67e-11)(5.97e24)(800) / (3.0e8)^2 = 3.54 N",
                    "F_M = (6.67e-11)(7.35e22)(800) / (3.84e8)^2",
                    "F_M = 0.0266 N",
                    "F_net = 3.54 - 0.0266 = 3.51 N toward Earth",
                ],
            },
            {
                # Added two antiparallel forces. Earth pulls one way, the Moon the
                # other, so they must subtract.
                "name": "bad_2",
                "work": [
                    "r_E = 3.0 x 10^8 m,   r_M = 0.84 x 10^8 m",
                    "F_E = (6.67e-11)(5.97e24)(800) / (3.0e8)^2 = 3.54 N",
                    "F_M = (6.67e-11)(7.35e22)(800) / (0.84e8)^2 = 0.556 N",
                    "F_net = F_E + F_M",
                    "F_net = 3.54 + 0.556 = 4.10 N toward Earth",
                ],
            },
            {
                # Forgot to square the distance in the Earth term. A 800 kg satellite
                # feeling 10^9 N is not physically possible.
                "name": "bad_3",
                "work": [
                    "r_E = 3.0 x 10^8 m,   r_M = 0.84 x 10^8 m",
                    "F_E = G M_E m / r_E",
                    "= (6.67e-11)(5.97e24)(800) / (3.0e8) = 1.06 x 10^9 N",
                    "F_M = (6.67e-11)(7.35e22)(800) / (0.84e8)^2 = 0.556 N",
                    "F_net = 1.06 x 10^9 - 0.556",
                    "F_net = 1.06 x 10^9 N toward Earth",
                ],
            },
        ],
    },
    # ============================================================ chemistry
    {
        "subject": "chemistry",
        "level": "easy",
        "slug": "balance_subscript",
        "problem": ["Balance:   H2 + O2  ->  H2O"],
        "solutions": [
            {
                "name": "good_1",
                "work": [
                    "2 H2 + O2  ->  2 H2O",
                    "Check:   H: 4 = 4,   O: 2 = 2",
                    "Balanced by changing coefficients, not subscripts.",
                ],
            },
            {
                "name": "bad_1",
                "work": [
                    "H2 + O2  ->  H2O2",
                    "Check:   H: 2 = 2,   O: 2 = 2",
                    "Balanced.",
                ],
            },
        ],
    },
    {
        "subject": "chemistry",
        "level": "medium",
        "slug": "limiting_reagent",
        "problem": [
            "2 H2 + O2  ->  2 H2O",
            "6.0 g of H2 reacts with 64 g of O2.",
            "What mass of water forms?",
        ],
        "solutions": [
            {
                "name": "good_1",
                "work": [
                    "n(H2) = 6.0 / 2.0 = 3.0 mol",
                    "n(O2) = 64 / 32 = 2.0 mol",
                    "Divide each by its coefficient:",
                    "H2: 3.0 / 2 = 1.5    O2: 2.0 / 1 = 2.0",
                    "H2 is limiting (smaller ratio)",
                    "n(H2O) = n(H2) = 3.0 mol",
                    "m = 3.0 x 18 = 54 g",
                ],
            },
            {
                "name": "bad_1",
                "work": [
                    "n(H2) = 6.0 / 2.0 = 3.0 mol",
                    "n(O2) = 64 / 32 = 2.0 mol",
                    "O2 is limiting (fewer moles)",
                    "n(H2O) = 2 x 2.0 = 4.0 mol",
                    "m = 4.0 x 18 = 72 g",
                ],
            },
        ],
    },
    {
        "subject": "chemistry",
        "level": "hard",
        "slug": "gas_law_kelvin",
        "problem": [
            "CaCO3  ->  CaO + CO2",
            "25.0 g of CaCO3 decomposes completely.",
            "Find the volume of CO2 at 25 C and 1.00 atm.",
            "R = 0.0821 L atm / mol K",
        ],
        "solutions": [
            {
                "name": "good_1",
                "work": [
                    "M(CaCO3) = 40.1 + 12.0 + 3(16.0) = 100.1 g/mol",
                    "n(CaCO3) = 25.0 / 100.1 = 0.250 mol",
                    "n(CO2) = 0.250 mol      (1 : 1)",
                    "T = 25 + 273 = 298 K",
                    "V = nRT / P = (0.250)(0.0821)(298) / 1.00",
                    "V = 6.12 L",
                ],
            },
            {
                "name": "bad_1",
                "work": [
                    "M(CaCO3) = 40.1 + 12.0 + 3(16.0) = 100.1 g/mol",
                    "n(CaCO3) = 25.0 / 100.1 = 0.250 mol",
                    "n(CO2) = 0.250 mol      (1 : 1)",
                    "V = nRT / P = (0.250)(0.0821)(25) / 1.00",
                    "V = 0.513 L",
                ],
            },
        ],
    },
    # ----------------------------------------- chemistry, advanced (with figures)
    {
        "subject": "chemistry",
        "level": "redox_magnesium",
        "slug": "redox_magnesium",
        "figure": "particle_ionic",
        "problem": [
            "Magnesium reacts with hydrochloric acid to give magnesium",
            "chloride and hydrogen gas.  Write the balanced equation, the",
            "oxidation and reduction half-equations, and find the moles of",
            "H2 produced when 4.8 g of Mg reacts with excess HCl.",
            "Draw a particle diagram of the beaker before and after.",
            "M(Mg) = 24.0 g/mol",
        ],
        # Correct: Mg + 2HCl -> MgCl2 + H2;  n(Mg) = 0.20 mol;  n(H2) = 0.20 mol.
        # The 2 in 2HCl is a trap: the Mg to H2 ratio is still 1 : 1.
        "solutions": [
            {
                "name": "good_1",
                "work": [
                    "Unbalanced:  Mg + HCl -> MgCl2 + H2",
                    "Mg + 2HCl -> MgCl2 + H2     (balanced)",
                    "Oxidation:  Mg -> Mg2+ + 2e-",
                    "Reduction:  2H+ + 2e- -> H2",
                    "n(Mg) = 4.8 / 24.0 = 0.20 mol",
                    "Mg : H2 is 1 : 1",
                    "n(H2) = 0.20 mol",
                ],
            },
            {
                # Mg goes to Mg2+, so it must lose TWO electrons. With one electron the
                # charges do not balance: 0 on the left, +1 on the right.
                "name": "bad_1",
                "work": [
                    "Mg + 2HCl -> MgCl2 + H2",
                    "Oxidation:  Mg -> Mg2+ + e-",
                    "Reduction:  2H+ + 2e- -> H2",
                    "n(Mg) = 4.8 / 24.0 = 0.20 mol",
                    "n(H2) = 0.20 mol",
                ],
            },
            {
                # Read the 2 from 2HCl as the hydrogen ratio. It is the HCl coefficient,
                # not the H2 one -- Mg to H2 stays 1 : 1.
                "name": "bad_2",
                "work": [
                    "Mg + 2HCl -> MgCl2 + H2",
                    "Oxidation:  Mg -> Mg2+ + 2e-",
                    "Reduction:  2H+ + 2e- -> H2",
                    "n(Mg) = 4.8 / 24.0 = 0.20 mol",
                    "The equation has 2 in front, so Mg : H2 is 1 : 2",
                    "n(H2) = 2 x 0.20 = 0.40 mol",
                ],
            },
            {
                # Multiplied by the molar mass instead of dividing. 115 mol of gas from
                # 4.8 g of metal is not physically possible.
                "name": "bad_3",
                "work": [
                    "Mg + 2HCl -> MgCl2 + H2",
                    "Oxidation:  Mg -> Mg2+ + 2e-",
                    "Reduction:  2H+ + 2e- -> H2",
                    "n(Mg) = 4.8 x 24.0 = 115.2 mol",
                    "n(H2) = 115.2 mol",
                ],
            },
        ],
    },
    {
        "subject": "chemistry",
        "level": "oxidation_ethanol",
        "slug": "oxidation_ethanol",
        "figure": "organic_chain",
        "problem": [
            "Ethanol is oxidised first to ethanal, then to ethanoic acid.",
            "Name the functional group in each molecule and write the two",
            "oxidation equations.  Draw the displayed structural formulas.",
        ],
        # Correct: -OH hydroxyl, -CHO aldehyde, -COOH carboxylic acid.
        # CH3CH2OH + [O] -> CH3CHO + H2O   (water IS produced)
        # CH3CHO   + [O] -> CH3COOH        (no water)
        "solutions": [
            {
                "name": "good_1",
                "work": [
                    "Ethanol: -OH, hydroxyl",
                    "Ethanal: -CHO, aldehyde",
                    "Ethanoic acid: -COOH, carboxylic acid",
                    "CH3CH2OH + [O] -> CH3CHO + H2O",
                    "CH3CHO + [O] -> CH3COOH",
                    "Each step adds bonds to oxygen, so each is an oxidation",
                ],
            },
            {
                # -CHO on the end of a chain is an aldehyde. A ketone has the C=O in
                # the middle, between two carbons, which needs at least three carbons.
                "name": "bad_1",
                "work": [
                    "Ethanol: -OH, hydroxyl",
                    "Ethanal: -CHO, ketone",
                    "Ethanoic acid: -COOH, carboxylic acid",
                    "CH3CH2OH + [O] -> CH3CHO + H2O",
                    "CH3CHO + [O] -> CH3COOH",
                ],
            },
            {
                # Water dropped from the first step. Count the hydrogens: six on the
                # left, four on the right.
                "name": "bad_2",
                "work": [
                    "Ethanol: -OH, hydroxyl",
                    "Ethanal: -CHO, aldehyde",
                    "Ethanoic acid: -COOH, carboxylic acid",
                    "CH3CH2OH + [O] -> CH3CHO",
                    "CH3CHO + [O] -> CH3COOH",
                ],
            },
            {
                # Water added to the second step by symmetry with the first. The
                # aldehyde has no hydrogen to spare, so no water comes off.
                "name": "bad_3",
                "work": [
                    "Ethanol: -OH, hydroxyl",
                    "Ethanal: -CHO, aldehyde",
                    "Ethanoic acid: -COOH, carboxylic acid",
                    "CH3CH2OH + [O] -> CH3CHO + H2O",
                    "CH3CHO + [O] -> CH3COOH + H2O",
                ],
            },
        ],
    },
]

# A student draws their own diagram, so the drawing is part of their work and can be
# wrong on its own. Every figure-bearing question gets one extra variant whose WORKING
# is copied verbatim from good_1 -- provably correct text, wrong picture. Generated
# rather than hand-written so the two can never drift apart.
for _ex in EXAMPLES:
    _fig = _ex.get("figure")
    _good = next((s for s in _ex["solutions"] if s["name"] == "good_1"), None)
    if _fig and _good:
        for _suffix in ("_wrong", "_wrong2"):
            _ex["solutions"].append({
                "name": f"bad_{sum(s['name'].startswith('bad_') for s in _ex['solutions']) + 1}",
                "figure": f"{_fig}{_suffix}",
                "work": list(_good["work"]),
            })

MIN_WIDTH = 1200
PAD = 64
PROBLEM_SIZE = 34
WORK_SIZE = 46
GAP = 44  # between the problem block and the working

PAPER = (253, 252, 248)
PRINT_INK = (70, 70, 70)
PEN_INK = (26, 42, 94)  # dark blue ballpoint

PRINT_FONTS = [
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/TTF/DejaVuSans.ttf",
]

# One hand per student, vendored in assets/fonts so this renders offline and on any OS.
# Kalam, Architects Daughter, Nanum Pen, Schoolbell and macOS Noteworthy were all
# rejected: they draw "1" as a bare vertical stroke, so "11" reads as "||". See
# assets/fonts/README.md. (filename, size scale) -- scale evens out apparent size.
HAND_FONTS = [
    ("PatrickHand-Regular.ttf", 1.00),
    ("Caveat-Regular.ttf", 1.18),
    ("ComingSoon-Regular.ttf", 0.98),
]


def load_print(size: int) -> ImageFont.FreeTypeFont:
    for path in PRINT_FONTS:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    raise SystemExit(f"no usable print font, tried: {PRINT_FONTS}")


def load_hand(index: int, size: int) -> ImageFont.FreeTypeFont:
    """Handwriting font for student `index`, cycling through the vendored hands."""
    name, scale = HAND_FONTS[index % len(HAND_FONTS)]
    path = FONT_DIR / name
    if not path.exists():
        raise SystemExit(f"missing vendored font {path}. See assets/fonts/README.md")
    return ImageFont.truetype(str(path), int(size * scale))


def draw_hand_line(img, xy, text, font, rng, ink):
    """Draw one line char by char with small random rotation, offset and spacing.

    Per-character tiles are the only way to rotate individual glyphs in PIL. Slow, but
    this runs once per release of the sample kit, not per request.
    """
    x, y = xy
    x0 = x
    drift = rng.uniform(-0.010, 0.010)  # the whole line tilts slightly off horizontal
    for ch in text:
        width = font.getlength(ch)
        if ch == " ":
            x += width
            continue
        pad = 20
        tile = Image.new("RGBA", (int(width) + 2 * pad, int(font.size * 2.2) + 2 * pad), (0, 0, 0, 0))
        ImageDraw.Draw(tile).text((pad, pad), ch, font=font, fill=ink)
        tile = tile.rotate(
            rng.uniform(-3.0, 3.0),
            resample=Image.BICUBIC,
            center=(pad + width / 2, pad + font.size / 2),
        )
        dy = rng.uniform(-2.5, 2.5) + drift * (x - x0)
        img.paste(tile, (int(x) - pad, int(y) - pad + int(dy)), tile)
        x += width + rng.uniform(-0.8, 1.6)


# ------------------------------------------------------------------ figures
# Geometry problems are unreadable without the figure, and a sample the student
# could not have solved is not a sample. These are drawn from the real geometry
# (the chord really does sit at 0.6r, the cone really is 6-8-10), so a model that
# measures the picture instead of reading the numbers still gets the right answer.


def hand_seg(draw, p0, p1, rng, ink, width=3, jitter=1.6, steps=None):
    """A straight line, drawn as a slightly wobbly polyline."""
    (x0, y0), (x1, y1) = p0, p1
    span = math.hypot(x1 - x0, y1 - y0)
    steps = steps or max(2, int(span / 22))
    pts = []
    for i in range(steps + 1):
        t = i / steps
        # taper the wobble to zero at both ends so joins stay tight
        amp = jitter * math.sin(math.pi * t)
        pts.append((x0 + (x1 - x0) * t + rng.uniform(-amp, amp),
                    y0 + (y1 - y0) * t + rng.uniform(-amp, amp)))
    draw.line(pts, fill=ink, width=width, joint="curve")


def hand_arc(draw, cx, cy, rx, ry, rng, ink, width=3, a0=0.0, a1=2 * math.pi, jitter=1.8):
    """An ellipse or part of one, with the radius breathing slightly."""
    steps = max(24, int(abs(a1 - a0) * 26))
    pts = []
    for i in range(steps + 1):
        a = a0 + (a1 - a0) * i / steps
        w = rng.uniform(-jitter, jitter)
        pts.append((cx + (rx + w) * math.cos(a), cy + (ry + w) * math.sin(a)))
    draw.line(pts, fill=ink, width=width, joint="curve")


def dashed_seg(draw, p0, p1, ink, width=2, dash=11, gap=8):
    (x0, y0), (x1, y1) = p0, p1
    span = math.hypot(x1 - x0, y1 - y0)
    n, d = 0, 0.0
    while d < span:
        t0, t1 = d / span, min((d + dash) / span, 1.0)
        draw.line([(x0 + (x1 - x0) * t0, y0 + (y1 - y0) * t0),
                   (x0 + (x1 - x0) * t1, y0 + (y1 - y0) * t1)], fill=ink, width=width)
        d += dash + gap
        n += 1


def fig_circle_chord(img, ox, oy, rng, hand: int, wrong: int = 0):
    """Circle, centre O, chord AB. Drawn to scale: r = 10, half-chord 8, so d = 6."""
    draw = ImageDraw.Draw(img)
    f = load_hand(hand, 30)
    R = 120.0
    cx, cy = ox + 190, oy + 145
    my = cy + R * 0.6          # d = 6 when r = 10
    hx = R * 0.8               # half chord = 8
    # wrong == 2: chord drawn tilted, so the "perpendicular" from O plainly is not one,
    # yet the right-angle tick is still marked.
    tilt = 20 if wrong == 2 else 0
    A, B = (cx - hx, my + tilt), (cx + hx, my - tilt)
    # WRONG: the foot of the perpendicular drawn well off the midpoint, so AM != MB.
    # The working below still says AM = MB = 8, so the picture contradicts the text.
    M = (cx + hx * 0.45, my) if wrong == 1 else (cx, my)

    hand_arc(draw, cx, cy, R, R, rng, PEN_INK, width=3)
    hand_seg(draw, A, B, rng, PEN_INK, width=3)      # the chord
    hand_seg(draw, (cx, cy), A, rng, PEN_INK, width=2)
    hand_seg(draw, (cx, cy), B, rng, PEN_INK, width=2)
    dashed_seg(draw, (cx, cy), M, PEN_INK, width=2)  # the perpendicular
    draw.line([(M[0] + 3, my - 15), (M[0] + 15, my - 15), (M[0] + 15, my - 3)],
              fill=PEN_INK, width=2)                 # right-angle tick at M

    # "10 cm" sits beside O at the circle's widest row, right-anchored. Level with the
    # centre the gap between arc and OA is the full radius; 24 px lower it narrows to
    # 47 px, less than the label, so there it had to cut one or the other.
    # bad_4 (wrong == 1): the foot sits where the arc closes in on the chord, so its M
    # goes left of the foot rather than under it.
    m_pos = (M[0] - 27, my + 2) if wrong == 1 else (M[0] - 10, my + 10)
    for text, pos in ((("O"), (cx - 8, cy - 42)), ("A", (A[0] - 30, my - 6)), ("B", (B[0] + 12, my - 6)),
                      ("M", m_pos), ("10 cm", (cx - 38 - f.getlength("10 cm"), cy - 18)),
                      ("d", (cx + 12, cy + 16)), ("16 cm", (cx - 42, my + 52))):
        draw_hand_line(img, pos, text, f, rng, PEN_INK)
    return 330


def dashed_arc(draw, cx, cy, rx, ry, ink, a0, a1, width=2, on=5, off=4):
    """The hidden half of a rim, drawn dashed the way a textbook does it."""
    steps = max(30, int(abs(a1 - a0) * 30))
    for i in range(steps):
        if (i // on) % 2 and (i % (on + off)) >= on:
            continue
        if (i % (on + off)) >= on:
            continue
        t0, t1 = a0 + (a1 - a0) * i / steps, a0 + (a1 - a0) * (i + 1) / steps
        draw.line([(cx + rx * math.cos(t0), cy + ry * math.sin(t0)),
                   (cx + rx * math.cos(t1), cy + ry * math.sin(t1))], fill=ink, width=width)


def fig_cone(img, ox, oy, rng, hand: int, wrong: int = 0):
    """Right circular cone, r = 6, l = 10, so h = 8. Drawn to that ratio."""
    draw = ImageDraw.Draw(img)
    f = load_hand(hand, 30)
    rx, ry = 130.0, 34.0
    h = rx * (8 / 6)           # keep the 6-8-10 triangle honest
    cx = ox + 230
    by = oy + 34 + h           # base centre
    P, O, A = (cx, oy + 34), (cx, by), (cx + rx, by)

    hand_arc(draw, cx, by, rx, ry, rng, PEN_INK, width=3, a0=0, a1=math.pi)  # front rim
    dashed_arc(draw, cx, by, rx, ry, PEN_INK, math.pi, 2 * math.pi)          # hidden rim
    hand_seg(draw, P, (cx - rx, by), rng, PEN_INK, width=3)
    hand_seg(draw, P, A, rng, PEN_INK, width=3)
    dashed_seg(draw, P, O, PEN_INK, width=2)   # vertical height
    # WRONG: the 6 cm marked right across the base, i.e. as the diameter, not the radius.
    dashed_seg(draw, (cx - rx, by) if wrong == 1 else O, A, PEN_INK, width=2)
    if wrong == 1:                       # end ticks, so the span being measured is explicit
        for tx in (cx - rx, cx + rx):
            draw.line([(tx, by - 9), (tx, by + 9)], fill=PEN_INK, width=2)
    if wrong == 2:
        # the right angle marked at the APEX, where the true angle is arctan(6/8) = 36.9
        # deg. Legs run ALONG PO and PA so it reads as a right-angle symbol, and it is
        # drawn large: a small axis-aligned tick here merges with the slant stroke.
        s = 34.0
        ax, ay = A[0] - P[0], A[1] - P[1]
        L = math.hypot(ax, ay)
        ux, uy = ax / L, ay / L                       # unit vector along PA
        d1 = (P[0], P[1] + s)                         # along the axis PO
        d2 = (P[0] + ux * s, P[1] + uy * s)           # along the slant PA
        corner = (d1[0] + ux * s, d1[1] + uy * s)
        # closed, so it reads as a deliberate right-angle symbol rather than a stray
        # pen stroke. It comes out squashed because the real angle is only 36.9 deg --
        # which is exactly the point: the student marked a right angle that is not one.
        draw.line([P, d1, corner, d2, P], fill=PEN_INK, width=3, joint="curve")
    else:
        # right-angle tick where the height meets the base
        draw.line([(cx + 4, by - 16), (cx + 16, by - 16), (cx + 16, by - 4)],
                  fill=PEN_INK, width=2)

    for text, pos in (("P", (cx - 9, oy - 2)),
                      ("O", (cx - 24, by + 40)),
                      ("A", (A[0] + 14, by - 6)),
                      ("h", (cx - 40, by - h / 2)),
                      ("10 cm", (cx + rx / 2 + 30, by - h / 2 - 12)),
                      # wrong == 1 spans the whole base, so the label must sit at the centre of that
                      # span or nothing forces the "this measures the diameter" reading
                      ("6 cm", (cx - 28, by + 82) if wrong == 1
                               else (cx + rx / 2 - 28, by + 40))):
        draw_hand_line(img, pos, text, f, rng, PEN_INK)
    return int(h + 110)


def hand_arrow(draw, p0, p1, rng, ink, width=3, head=13):
    """A segment with an arrowhead, for velocity and force vectors."""
    hand_seg(draw, p0, p1, rng, ink, width=width, jitter=1.0)
    ang = math.atan2(p1[1] - p0[1], p1[0] - p0[0])
    for s in (+1, -1):
        a = ang + s * 0.42
        draw.line([p1, (p1[0] - head * math.cos(a), p1[1] - head * math.sin(a))],
                  fill=ink, width=width)


def fig_projectile_cliff(img, ox, oy, rng, hand: int, wrong: int = 0):
    """Cliff, trajectory, launch components. Plotted from the real trajectory, so the
    arc, the peak and the landing point are all where the physics puts them."""
    draw = ImageDraw.Draw(img)
    f = load_hand(hand, 29)
    S = 4.9                       # px per metre
    gx, gy = ox + 96, oy + 246    # base of the cliff, at ground level
    top = gy - 20 * S             # cliff top, 20 m up
    vox, voy = 25 * math.cos(math.radians(35)), 25 * math.sin(math.radians(35))

    # ground and cliff face
    hand_seg(draw, (ox + 30, gy), (ox + 560, gy), rng, PEN_INK, width=3)
    hand_seg(draw, (gx, top), (gx, gy), rng, PEN_INK, width=3)
    for i in range(9):            # hatching on the rock face
        y = top + 6 + i * (20 * S - 10) / 9
        draw.line([(gx - 15, y + 8), (gx - 2, y)], fill=PEN_INK, width=1)

    # the parabola itself
    pts = []
    x = 0.0
    while True:
        y = 20 + math.tan(math.radians(35)) * x - 9.8 * x * x / (2 * vox * vox)
        # wrong == 2: the ball drawn landing back at cliff height, as if the 20 m drop
        # were not there. The working below still solves the full quadratic.
        if y < (20 if wrong == 2 else 0):
            break
        pts.append((gx + x * S, gy - y * S))
        x += 1.2
    for i in range(0, len(pts) - 2, 4):       # dashed
        draw.line([pts[i], pts[i + 2]], fill=PEN_INK, width=2)
    draw.ellipse([pts[-1][0] - 6, pts[-1][1] - 6, pts[-1][0] + 6, pts[-1][1] + 6], fill=PEN_INK)

    # launch vectors at the cliff top
    L = 104
    hand_arrow(draw, (gx, top), (gx + L * math.cos(math.radians(35)),
                                 top - L * math.sin(math.radians(35))), rng, PEN_INK)
    hand_arrow(draw, (gx, top), (gx + L * 0.82, top), rng, PEN_INK, width=2, head=10)
    hand_arrow(draw, (gx, top), (gx, top - L * 0.60), rng, PEN_INK, width=2, head=10)
    draw.ellipse([gx - 5, top - 5, gx + 5, top + 5], fill=PEN_INK)

    peak = min(pts, key=lambda p: p[1])
    dashed_seg(draw, (peak[0], peak[1]), (peak[0], gy), PEN_INK, width=2)
    dashed_seg(draw, (gx, top), (gx - 46, top), PEN_INK, width=1)
    hand_arrow(draw, (gx - 34, top), (gx - 34, gy), rng, PEN_INK, width=2, head=9)

    # The label beside the vertical arrow must be RIGHT-anchored: the shaft is at a fixed
    # gx, the fonts differ in width by 9 px, and a fixed left offset closed the gap to zero
    # on the widest one.
    up = (gx - 14 - f.getlength("v_x" if wrong == 1 else "v_y"), top - 66)
    # only 98 px between cliff top and ground, and x > gx+140 is blocked by the apex
    # dashed line, so the two labels below the launch point stack tight. Keep the gaps.
    for text, pos in (("25 m/s", (gx + 96, top - 100)), ("35 deg", (gx + 16, top + 4)),
                      # wrong == 1: the two component labels swapped, so v_x names the vertical arrow
                      # and v_y the horizontal one. Visible, and a real student error.
                      # horizontal label goes BELOW "35 deg", not right of it: the apex dashed
                      # line lands at gx+147 and used to cut the glyphs in half.
                      ("v_x", up if wrong == 1 else (gx + 18, top + 40)),
                      ("v_y", (gx + 18, top + 40) if wrong == 1 else up),
                      ("20 m", (gx - 112, top + 40)), ("H", (peak[0] + 12, peak[1] + 80)),    # on its own dashed line, clear of the ground line
                      ("g", (gx + 222, top - 50)), ("R", (gx + 190, gy + 34))):   # below its own arrow, which used to strike through it
        draw_hand_line(img, pos, text, f, rng, PEN_INK)
    hand_arrow(draw, (gx + 250, top - 50), (gx + 250, top + 2), rng, PEN_INK, width=2, head=9)
    hand_arrow(draw, (gx, gy + 26), (pts[-1][0], gy + 26), rng, PEN_INK, width=2, head=10)
    return 330


def fig_gravitation(img, ox, oy, rng, hand: int, wrong: int = 0):
    """Earth, satellite, Moon on one line, with the two force vectors. Positions are to
    scale: the satellite really does sit at 3.0/3.84 of the way across."""
    draw = ImageDraw.Draw(img)
    f = load_hand(hand, 29)
    ex, mx = ox + 90, ox + 610
    cy = oy + 120
    # wrong == 2: drawn a third of the way out, though the labels say 3.0 of 3.84
    sx = ex + (mx - ex) * (0.33 if wrong == 2 else 3.0 / 3.84)

    hand_seg(draw, (ex, cy), (mx, cy), rng, PEN_INK, width=2)
    hand_arc(draw, ex, cy, 34, 34, rng, PEN_INK, width=3)
    hand_arc(draw, mx, cy, 19, 19, rng, PEN_INK, width=3)
    draw.ellipse([sx - 7, cy - 7, sx + 7, cy + 7], fill=PEN_INK)

    # Both arrows the SAME length. Their directions come from the geometry and are fair
    # to show; their relative size is the answer to part (d) and must not be drawn in.
    # WRONG: both pulls drawn toward the Moon. Earth is on the other side, so F_E must
    # point left. The working below still subtracts, so picture and text disagree.
    if wrong == 1:
        # both pulls drawn toward the Moon, stacked so each stays readable
        hand_arrow(draw, (sx - 6, cy - 84), (sx + 80, cy - 84), rng, PEN_INK, width=3)  # F_E
        hand_arrow(draw, (sx + 6, cy - 32), (sx + 92, cy - 32), rng, PEN_INK, width=3)  # F_M
    else:
        hand_arrow(draw, (sx - 6, cy - 40), (sx - 92, cy - 40), rng, PEN_INK, width=3)  # F_E
        hand_arrow(draw, (sx + 6, cy - 40), (sx + 92, cy - 40), rng, PEN_INK, width=3)  # F_M

    # distance rules under the line
    for x0, x1, y in ((ex, sx, cy + 92), (ex, mx, cy + 148)):
        hand_seg(draw, (x0, y), (x1, y), rng, PEN_INK, width=1, jitter=0.6)
        for xx in (x0, x1):
            draw.line([(xx, y - 7), (xx, y + 7)], fill=PEN_INK, width=2)

    # Right-anchored, ending well left of the Moon. A fixed left offset put the "kg"
    # descender 3.6 px from the "Moon" label on the widest of the three fonts.
    cap = "satellite 800 kg"
    for text, pos in (("Earth", (ex - 32, cy + 44)), ("Moon", (mx - 26, cy + 44)),
                      (cap, (sx + 30 - f.getlength(cap), cy + 16)),
                      # wrong == 1: both labels sit left of their own tail, each centred on its
                      # own shaft. Right of the tip is not usable, the Moon is only 95 px away
                      # and F_M used to fuse into its circle.
                      ("F_E", (sx - 84, cy - 102) if wrong == 1
                               else (sx - 134, cy - 84) if wrong == 2
                               else (sx - 102, cy - 84)),
                      ("F_M", (sx - 84, cy - 50) if wrong == 1
                               else (sx + 48, cy - 84) if wrong == 2
                               else (sx + 20, cy - 84)),
                      ("3.0 x 10^8 m", (ex + 122, cy + 100)),
                      ("3.84 x 10^8 m", (ex + 190, cy + 156))):
        draw_hand_line(img, pos, text, f, rng, PEN_INK)
    return 340


def _atom(img, x, y, text, f, rng, ink=PEN_INK):
    """Centre an atom label on (x, y) so bonds can be aimed at the centre."""
    w = f.getlength(text)
    draw_hand_line(img, (x - w / 2, y - f.size * 0.62), text, f, rng, ink)
    return w


def _bond(draw, p0, p1, rng, gap0=17, gap1=17, double=False):
    """A bond that stops clear of the atom letters at each end."""
    (x0, y0), (x1, y1) = p0, p1
    L = math.hypot(x1 - x0, y1 - y0)
    if L < gap0 + gap1 + 6:
        return
    ux, uy = (x1 - x0) / L, (y1 - y0) / L
    a = (x0 + ux * gap0, y0 + uy * gap0)
    b = (x1 - ux * gap1, y1 - uy * gap1)
    if not double:
        hand_seg(draw, a, b, rng, PEN_INK, width=2, jitter=0.7)
        return
    px, py = -uy * 3.5, ux * 3.5      # offset perpendicular for the second line
    hand_seg(draw, (a[0] + px, a[1] + py), (b[0] + px, b[1] + py), rng, PEN_INK, width=2, jitter=0.5)
    hand_seg(draw, (a[0] - px, a[1] - py), (b[0] - px, b[1] - py), rng, PEN_INK, width=2, jitter=0.5)


def fig_organic_chain(img, ox, oy, rng, hand: int, wrong: int = 0):
    """Displayed formulas: ethanol -> ethanal -> ethanoic acid, with the two arrows."""
    draw = ImageDraw.Draw(img)
    f = load_hand(hand, 30)
    fs = load_hand(hand, 25)
    V = 52                                     # vertical bond length

    def molecule(x, y, kind):
        c1, c2 = (x + 52, y), (x + 132, y)
        _atom(img, x, y, "H", f, rng)
        _bond(draw, (x, y), c1, rng)
        for cx, cy in (c1, c2):
            _atom(img, cx, cy, "C", f, rng)
        _bond(draw, c1, c2, rng)
        # methyl carbon carries two more H.
        # wrong == 2: on ethanol only, one is left off, leaving that carbon with three
        # bonds. The equations below are still correct.
        drop = wrong == 2 and kind == "ethanol"
        for dy in ((V,) if drop else (-V, V)):
            _atom(img, c1[0], c1[1] + dy, "H", f, rng)
            _bond(draw, c1, (c1[0], c1[1] + dy), rng)
        if kind == "ethanol":
            o = (x + 212, y)
            _atom(img, o[0], y, "O", f, rng); _bond(draw, c2, o, rng)
            _atom(img, o[0] + 62, y, "H", f, rng); _bond(draw, o, (o[0] + 62, y), rng)
            for dy in (-V, V):
                _atom(img, c2[0], c2[1] + dy, "H", f, rng)
                _bond(draw, c2, (c2[0], c2[1] + dy), rng)
            return x + 62, "hydroxyl (-OH)"
        if kind == "ethanal":
            _atom(img, c2[0], c2[1] - V, "H", f, rng)
            _bond(draw, c2, (c2[0], c2[1] - V), rng)
            o = (x + 212, y)
            _atom(img, o[0], y, "O", f, rng); _bond(draw, c2, o, rng, double=True)
            if wrong == 1:
                # WRONG: the -OH kept from ethanol as well as the new C=O, so this
                # carbon now has five bonds. The equations below are still correct.
                _atom(img, c2[0], c2[1] + V, "O", f, rng)
                _bond(draw, c2, (c2[0], c2[1] + V), rng)
                _atom(img, c2[0] + 56, c2[1] + V, "H", f, rng)
                _bond(draw, (c2[0], c2[1] + V), (c2[0] + 56, c2[1] + V), rng)
            return x + 62, "aldehyde (-CHO)"
        # ethanoic acid
        _atom(img, c2[0], c2[1] - V, "O", f, rng)
        _bond(draw, c2, (c2[0], c2[1] - V), rng, double=True)
        o = (x + 212, y)
        _atom(img, o[0], y, "O", f, rng); _bond(draw, c2, o, rng)
        _atom(img, o[0] + 62, y, "H", f, rng); _bond(draw, o, (o[0] + 62, y), rng)
        return x + 62, "carboxylic acid (-COOH)"

    y = oy + 108
    xs = (ox + 0, ox + 390, ox + 735)
    for x, (kind, name) in zip(xs, (("ethanol", "ethanol"), ("ethanal", "ethanal"),
                                    ("acid", "ethanoic acid"))):
        molecule(x, y, kind)
        # Only the molecule name, which the question text already gives. The functional
        # group name is what the student has to supply, so it must not appear here.
        draw_hand_line(img, (x + 30, oy + 4), name, f, rng, PEN_INK)
    for x in (ox + 300, ox + 645):
        hand_arrow(draw, (x, y), (x + 52, y), rng, PEN_INK, width=2, head=11)
        draw_hand_line(img, (x + 8, y - 42), "[O]", fs, rng, PEN_INK)
    return 220


def fig_particle_ionic(img, ox, oy, rng, hand: int, wrong: int = 0):
    """Particle diagram: what is in the beaker before and after the reaction."""
    draw = ImageDraw.Draw(img)
    # "Mg2+" runs to 61 px on the widest font, so at r=30 the "+" met the arc and the two
    # fused into one blob. That label is the whole evidence on bad_5. Bigger circle,
    # smaller text, wider spacing.
    f = load_hand(hand, 24)
    fs = load_hand(hand, 28)

    def blob(cx, cy, label, r=40):
        hand_arc(draw, cx, cy, r, r, rng, PEN_INK, width=2, jitter=1.2)
        _atom(img, cx, cy, label, f, rng)

    for row, (title, items) in enumerate((
        # exactly one Mg, so nothing vanishes between the rows:
        # Mg + 2H+ + 2Cl-  ->  Mg2+ + 2Cl- + H2
        # wrong == 2: magnesium drawn already as Mg2+ in the BEFORE row, i.e. the
        # product state before the reaction happens.
        ("Before:", [("Mg2+" if wrong == 2 else "Mg", 0), ("+", 1),
                     ("H+", 2), ("H+", 3), ("Cl-", 4), ("Cl-", 5)]),
        # WRONG: Mg drawn with a single positive charge and only one chloride, so the
        # After row carries a net charge. The half-equations below are still correct.
        ("After:", [("Mg+", 0), ("Cl-", 1), ("+", 2), ("H2", 3)] if wrong == 1
                   else [("Mg2+", 0), ("Cl-", 1), ("Cl-", 2), ("+", 3), ("H2", 4)]),
    )):
        y = oy + 46 + row * 128
        draw_hand_line(img, (ox, y - 18), title, fs, rng, PEN_INK)
        for label, i in items:
            cx = ox + 152 + i * 96   # clear of the "Before:"/"After:" title, 83 px on the widest font
            if label == "+":
                draw_hand_line(img, (cx - 8, y - 18), "+", fs, rng, PEN_INK)
            elif label == "H2":     # two atoms sharing a bond
                blob(cx - 22, y, "H", 30)
                blob(cx + 22, y, "H", 30)
            else:
                blob(cx, y, label)
    hand_arrow(draw, (ox + 710, oy + 46), (ox + 770, oy + 46), rng, PEN_INK, width=3)
    # NO caption naming the electron transfer. The question asks for the half-equations,
    # so stating "Mg loses 2 e-" here would hand over the answer -- and it sits on
    # ques.png too, which is meant to be the bare worksheet.
    return 235


_BASE_FIGURES = {
    "circle_chord": fig_circle_chord,
    "cone": fig_cone,
    "projectile_cliff": fig_projectile_cliff,
    "gravitation": fig_gravitation,
    "organic_chain": fig_organic_chain,
    "particle_ionic": fig_particle_ionic,
}

# Each figure is also registered as "<name>_wrong". A student draws their own diagram,
# so the diagram is part of their work and can be wrong on its own -- with the working
# underneath entirely correct. Nothing else in the kit tests that.
FIGURES = dict(_BASE_FIGURES)
for _n in (1, 2):
    FIGURES |= {f"{k}_wrong{'' if _n == 1 else _n}": partial(fn, wrong=_n)
                for k, fn in _BASE_FIGURES.items()}


def render_page(problem: list[str], work: list[str], path: Path, *, hand: int, seed: int,
                figure: str | None = None) -> Path:
    """Printed problem at the top, then the figure, then handwritten working."""
    rng = random.Random(seed)
    problem_font = load_print(PROBLEM_SIZE)
    work_font = load_hand(hand, WORK_SIZE)

    problem_h = int(PROBLEM_SIZE * 1.5)
    work_h = int(WORK_SIZE * 1.62)

    widest = max(
        [problem_font.getlength(l) for l in problem]
        + [work_font.getlength(l) for l in work]
        + [0]
    )
    width = max(MIN_WIDTH, int(widest) + 2 * PAD + 40)  # slack for jitter

    # must exceed any figure's true height: crop can shrink, never grow
    fig_h = 470 if figure else 0
    height = PAD * 2 + problem_h * len(problem) + fig_h
    if work:
        height += GAP + work_h * len(work)

    img = Image.new("RGB", (width, height), PAPER)
    draw = ImageDraw.Draw(img)

    y = PAD
    for line in problem:
        draw.text((PAD, y), line, font=problem_font, fill=PRINT_INK)
        y += problem_h

    if figure:
        y += GAP
        used = FIGURES[figure](img, PAD, y, rng, hand)
        # the estimate above only reserved space; crop back to what was actually drawn
        y += used
        height = y + (GAP + work_h * len(work) if work else 0) + PAD
        img = img.crop((0, 0, width, height))
        draw = ImageDraw.Draw(img)

    y += GAP
    for line in work:
        draw_hand_line(img, (PAD + rng.uniform(-5, 12), y), line, work_font, rng, PEN_INK)
        y += work_h

    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path)
    return path


# easy/medium/hard are the school-level set; everything else is named by topic and is
# grade 12 or first year. The band is derived, not stored, so adding a topic cannot put
# it in the wrong place.
BASIC_LEVELS = {"easy", "medium", "hard"}


def band_of(level: str) -> str:
    return "basic" if level in BASIC_LEVELS else "advanced"


def render(example: dict) -> list[Path]:
    out = OUT / example["subject"] / band_of(example["level"]) / example["level"]
    # No figure on ques.png. The question asks the student to draw one, so the diagram
    # belongs to the student's work, not to the worksheet.
    paths = [render_page(example["problem"], [], out / "ques.png", hand=0, seed=0)]
    for i, solution in enumerate(example["solutions"]):
        paths.append(
            render_page(
                example["problem"],
                solution["work"],
                out / f"{solution['name']}.png",
                figure=solution.get("figure", example.get("figure")),
                hand=i,
                # crc32, NOT hash(): str hashing is salted per process, so hash() would
                # reseed the jitter on every run and dirty every PNG in the repo.
                seed=zlib.crc32(f"{example['level']}/{solution['name']}".encode()),
            )
        )
    return paths


def link_ranking() -> list[Path]:
    """Mirror every advanced question into samples/ranking/ as a relative symlink.

    The model sweep runs against the advanced set only -- those are the questions with
    good_1 + bad_1..N coverage and, for six of them, figure-error variants. Symlinks
    rather than copies so the two can never disagree, and relative so the repo stays
    portable. Rebuilt each run, which is what keeps it in sync as topics are added.
    """
    rank = OUT / "ranking"
    rank.mkdir(exist_ok=True)
    for stale in rank.iterdir():                 # only ever removes links we made
        if stale.is_symlink():
            stale.unlink()
    made = []
    for subject in sorted({e["subject"] for e in EXAMPLES}):
        adv = OUT / subject / "advanced"
        if not adv.is_dir():
            continue
        for topic in sorted(d for d in adv.iterdir() if d.is_dir()):
            link = rank / f"{subject}_{topic.name}"
            link.symlink_to(Path("..") / subject / "advanced" / topic.name)
            made.append(link)
    return made


if __name__ == "__main__":
    for example in EXAMPLES:
        for path in render(example):
            print(path.relative_to(OUT.parent))
    for link in link_ranking():
        print(f"{link.relative_to(OUT.parent)} -> {link.readlink()}")
