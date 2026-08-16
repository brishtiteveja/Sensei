# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow>=10.0"]
# ///
"""Render the demo work samples into samples/<subject>/<level>/.

Run: uv run scripts/render_samples.py

Per question directory:
  ques.png     the problem alone, no working
  good_N.png   a student who solved it correctly
  bad_N.png    a student who made one realistic mistake

The good_N images are not filler. A tutor that finds an error in correct work is worse
than one that misses an error, because it teaches the student out of something they
already had right. There is no way to catch that without a correct sample.

This file is the source of truth for the sample text. Each samples/<subject>/README.md
quotes it; if you change a number here, change it there too.

Every bad_N sample carries exactly ONE deliberate error, and every line after it is
arithmetically consistent with that error. That is deliberate: a diagnosis that reports
the second error first is not wrong, so a two-error sample cannot be graded.

Work lines are NOT numbered. Students do not number their steps, and a photo of real
handwriting will not either. Grade a diagnosis on which line's *content* it flags, not on
the integer it prints -- DIAGNOSIS_SYSTEM transcribes before it counts.
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parent.parent / "samples"

# ASCII only. Students write x squared and subscript 2, but a glyph the font is missing
# renders as a box, and the model then transcribes a box. Not worth the risk on camera.
EXAMPLES = [
    # ------------------------------------------------------------------ math
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
        "work": [
            "x^2 + 9 = 25",
            "x^2 = 16",
            "x = 4   or   x = -4",
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
        "work": [
            "dy/dx = cos(3x^2)",
            "At x = 1:   dy/dx = cos(3)",
            "= -0.99",
        ],
    },
    # --------------------------------------------------------------- physics
    {
        "subject": "physics",
        "level": "easy",
        "slug": "unit_conversion",
        "problem": [
            "A car moves at 72 km/h.",
            "How far does it travel in 5.0 s?",
        ],
        "work": [
            "v = 72 km/h",
            "d = v x t",
            "d = 72 x 5.0",
            "d = 360 m",
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
        "work": [
            "v_y = 20 m/s",
            "t_up = v_y / g = 20 / 9.8 = 2.04 s",
            "t_total = 2 x 2.04 = 4.08 s",
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
        "work": [
            "N = mg = 5.0 x 9.8 = 49 N",
            "f = 0.20 x N = 0.20 x 49",
            "f = 9.8 N",
        ],
    },
    # ------------------------------------------------------------- chemistry
    {
        "subject": "chemistry",
        "level": "easy",
        "slug": "balance_subscript",
        "problem": ["Balance:   H2 + O2  ->  H2O"],
        "work": [
            "H2 + O2  ->  H2O2",
            "Check:   H: 2 = 2,   O: 2 = 2",
            "Balanced.",
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
        "work": [
            "n(H2) = 6.0 / 2.0 = 3.0 mol",
            "n(O2) = 64 / 32 = 2.0 mol",
            "O2 is limiting (fewer moles)",
            "n(H2O) = 2 x 2.0 = 4.0 mol",
            "m = 4.0 x 18 = 72 g",
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
        "work": [
            "M(CaCO3) = 40.1 + 12.0 + 3(16.0) = 100.1 g/mol",
            "n(CaCO3) = 25.0 / 100.1 = 0.250 mol",
            "n(CO2) = 0.250 mol      (1 : 1)",
            "V = nRT / P = (0.250)(0.0821)(25) / 1.00",
            "V = 0.513 L",
        ],
    },
]

WIDTH = 1200
PAD = 56
PROBLEM_SIZE = 36
WORK_SIZE = 44
GAP = 40  # between the problem block and the numbered work

FONT_CANDIDATES = [
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/TTF/DejaVuSans.ttf",
]


def load_font(size: int) -> ImageFont.FreeTypeFont:
    for path in FONT_CANDIDATES:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    raise SystemExit(f"no usable font found, tried: {FONT_CANDIDATES}")


def render_page(problem: list[str], work: list[str], path: Path) -> Path:
    """One image: the problem in grey at the top, then the working in black."""
    problem_font = load_font(PROBLEM_SIZE)
    work_font = load_font(WORK_SIZE)

    problem_h = int(PROBLEM_SIZE * 1.5)
    work_h = int(WORK_SIZE * 1.55)
    height = PAD * 2 + problem_h * len(problem)
    if work:
        height += GAP + work_h * len(work)

    img = Image.new("RGB", (WIDTH, height), "white")
    draw = ImageDraw.Draw(img)

    y = PAD
    for line in problem:
        draw.text((PAD, y), line, font=problem_font, fill=(70, 70, 70))
        y += problem_h

    y += GAP
    for line in work:
        draw.text((PAD, y), line, font=work_font, fill="black")
        y += work_h

    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path)
    return path


def render(example: dict) -> list[Path]:
    out = OUT / example["subject"] / example["level"]

    # Only math/easy has a reviewed solution set so far. The rest still bundle the
    # question and one wrong attempt into ques.png; split them once the format is agreed.
    if "solutions" not in example:
        return [render_page(example["problem"], example["work"], out / "ques.png")]

    paths = [render_page(example["problem"], [], out / "ques.png")]
    for solution in example["solutions"]:
        paths.append(render_page(example["problem"], solution["work"], out / f"{solution['name']}.png"))
    return paths


if __name__ == "__main__":
    for example in EXAMPLES:
        for path in render(example):
            print(f"{path.relative_to(OUT.parent)}   ({example['slug']})")
