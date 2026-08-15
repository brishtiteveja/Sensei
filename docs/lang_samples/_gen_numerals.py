#!/usr/bin/env python3
"""Generate numeral-OCR probe images for the multilingual spot-check.

Mirrors the d01/d02/d03 diagnostics in VISION_FINDINGS.md: pristine printed
digit charts and one-line equations, plus a 3-line worked solution with a
planted error. No photo degradation -- the point is to isolate glyph
perception, not image quality.

  python3 _gen_numerals.py
"""
import json, os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
FONTS = os.path.join(HERE, "_fonts")
BN_FONTS = os.path.join(HERE, "..", "vision_samples", "_fonts")

# native digits 0-9 per script
DIGITS = {
    "latin":   "0123456789",
    "bengali": "০১২৩৪৫৬৭৮৯",
    "deva":    "०१२३४५६७८९",
    "arab":    "٠١٢٣٤٥٦٧٨٩",
}

LANGS = {
    "hindi": {
        "script": "deva",
        "print_font": os.path.join(FONTS, "NotoSerifDevanagari.ttf"),
        "hand_font": os.path.join(FONTS, "Kalam.ttf"),
        "equation": "२x + ७ = १५",
        "work": ["हल:", "२x + ७ = १५", "२x = ८", "x = ८ × २ = १६"],
        "work_gt": ["हल:", "2x + 7 = 15", "2x = 8", "x = 8 x 2 = 16"],
        "rtl": False,
    },
    "arabic": {
        "script": "arab",
        "print_font": os.path.join(FONTS, "NotoNaskhArabic.ttf"),
        "hand_font": None,
        "equation": "٢x + ٧ = ١٥",
        "work": ["الحل:", "٢x + ٧ = ١٥", "٢x = ٨", "x = ٨ × ٢ = ١٦"],
        "work_gt": ["(al-hall:)", "2x + 7 = 15", "2x = 8", "x = 8 x 2 = 16"],
        "rtl": True,
    },
    "bengali": {  # control: reproduce the known failure
        "script": "bengali",
        "print_font": os.path.join(BN_FONTS, "NotoSerifBengali.ttf"),
        "hand_font": os.path.join(BN_FONTS, "AtmaSlab.ttf"),
        "equation": "২x + ৭ = ১৫",
        "work": ["সমাধানঃ", "২x + ৭ = ১৫", "২x = ৮", "x = ৮ × ২ = ১৬"],
        "work_gt": ["সমাধানঃ", "2x + 7 = 15", "2x = 8", "x = 8 x 2 = 16"],
        "rtl": False,
    },
    "indonesian": {  # control: Latin script + Latin digits
        "script": "latin",
        "print_font": os.path.join(FONTS, "DejaVuSerif.ttf"),
        "hand_font": os.path.join(BN_FONTS, "Caveat.ttf"),
        "equation": "2x + 7 = 15",
        "work": ["Penyelesaian:", "2x + 7 = 15", "2x = 8", "x = 8 × 2 = 16"],
        "work_gt": ["Penyelesaian:", "2x + 7 = 15", "2x = 8", "x = 8 x 2 = 16"],
        "rtl": False,
    },
    "swahili": {
        "script": "latin",
        "print_font": os.path.join(FONTS, "DejaVuSerif.ttf"),
        "hand_font": os.path.join(BN_FONTS, "IndieFlower-Regular.ttf"),
        "equation": "2x + 7 = 15",
        "work": ["Suluhisho:", "2x + 7 = 15", "2x = 8", "x = 8 × 2 = 16"],
        "work_gt": ["Suluhisho:", "2x + 7 = 15", "2x = 8", "x = 8 x 2 = 16"],
        "rtl": False,
    },
    "spanish": {
        "script": "latin",
        "print_font": os.path.join(FONTS, "DejaVuSerif.ttf"),
        "hand_font": os.path.join(BN_FONTS, "PatrickHand-Regular.ttf"),
        "equation": "2x + 7 = 15",
        "work": ["Solución:", "2x + 7 = 15", "2x = 8", "x = 8 × 2 = 16"],
        "work_gt": ["Solución:", "2x + 7 = 15", "2x = 8", "x = 8 x 2 = 16"],
        "rtl": False,
    },
}


def canvas(w, h):
    return Image.new("RGB", (w, h), "white")


def draw_chart(path, font_path, digits, size=90, rtl=False):
    """Digit chart 0-9, generously spaced, pristine white background."""
    f = ImageFont.truetype(font_path, size)
    pad = 60
    gap = int(size * 0.55)
    # measure each glyph separately so spacing is uniform and unambiguous
    widths, hmax = [], 0
    tmp = ImageDraw.Draw(canvas(10, 10))
    for d in digits:
        b = tmp.textbbox((0, 0), d, font=f)
        widths.append(b[2] - b[0])
        hmax = max(hmax, b[3] - b[1])
    W = pad * 2 + sum(widths) + gap * (len(digits) - 1)
    H = pad * 2 + int(size * 1.6)
    im = canvas(W, H)
    dr = ImageDraw.Draw(im)
    x = pad
    y = pad
    for d, w in zip(digits, widths):
        dr.text((x, y), d, font=f, fill="black")
        x += w + gap
    im.save(path)
    return path


def draw_lines(path, font_path, lines, size=64, rtl=False, pad=50,
               force_tokens=False):
    f = ImageFont.truetype(font_path, size)
    dirn = "rtl" if rtl else "ltr"
    tmp = ImageDraw.Draw(canvas(10, 10))
    W = 0
    for ln in lines:
        b = tmp.textbbox((0, 0), ln, font=f, direction=dirn)
        W = max(W, b[2] - b[0])
    W += pad * 2
    lh = int(size * 1.7)
    H = pad * 2 + lh * len(lines)
    im = canvas(max(W, 700), H)
    dr = ImageDraw.Draw(im)
    space = f.getlength(" ")
    for i, ln in enumerate(lines):
        # Equations are typeset left-to-right even inside RTL prose (this is how
        # Arabic maths textbooks set them). Applying RTL paragraph direction to
        # "2x + 7 = 15" mirrors it to "15 = 7 + 2x"; worse, Arabic-Indic digits
        # carry bidi class AN and get reordered around the neutral +/= operators
        # even under an LTR base direction. Both would confound a glyph
        # perception test with a layout artifact, so equation lines are drawn
        # token by token, each token shaped on its own and placed left to right.
        is_eq = force_tokens or any(c in ln for c in "=+×")
        y = pad + i * lh
        if is_eq:
            x = pad
            for tok in ln.split(" "):
                dr.text((x, y), tok, font=f, fill="black", direction="ltr")
                x += f.getlength(tok) + space
        elif rtl:
            dr.text((pad, y), ln, font=f, fill="black", direction="rtl", anchor="la")
        else:
            dr.text((pad, y), ln, font=f, fill="black", direction="ltr")
    im.save(path)
    return path


def main():
    out = os.path.join(HERE, "images")
    os.makedirs(out, exist_ok=True)
    manifest = {}
    for lang, cfg in LANGS.items():
        script = cfg["script"]
        digits = DIGITS[script]
        pf = cfg["print_font"]
        if not os.path.exists(pf):
            # fall back to a bundled serif for latin
            pf = "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf"
        # n01 printed digit chart, 90px pristine (== d01 conditions)
        p = os.path.join(out, f"{lang}_n01_chart_print.png")
        draw_chart(p, pf, digits, size=90)
        manifest[f"{lang}_n01_chart_print"] = {
            "lang": lang, "kind": "chart", "script": script,
            "gt_digits": "0123456789", "font": os.path.basename(pf)}

        # n02 printed one-line equation, 110px pristine (== d03 conditions)
        p = os.path.join(out, f"{lang}_n02_eq_print.png")
        draw_lines(p, pf, [cfg["equation"]], size=110, rtl=False)
        manifest[f"{lang}_n02_eq_print"] = {
            "lang": lang, "kind": "equation", "script": script,
            "gt": "2x + 7 = 15", "gt_digits": "2715",
            "font": os.path.basename(pf)}

        # n03 printed 3-line worked solution with planted error on line 4
        p = os.path.join(out, f"{lang}_n03_work_print.png")
        draw_lines(p, pf, cfg["work"], size=64, rtl=cfg["rtl"])
        manifest[f"{lang}_n03_work_print"] = {
            "lang": lang, "kind": "work", "script": script,
            "gt_lines": cfg["work_gt"], "gt_error_line": 4,
            "gt_digits": "2715282816",
            "note": "student multiplied instead of dividing; x should be 4",
            "font": os.path.basename(pf)}

        # n04 handwriting digit chart where a handwriting font exists (== d04)
        hf = cfg.get("hand_font")
        if hf and os.path.exists(hf):
            p = os.path.join(out, f"{lang}_n04_chart_hand.png")
            draw_chart(p, hf, digits, size=90)
            manifest[f"{lang}_n04_chart_hand"] = {
                "lang": lang, "kind": "chart", "script": script,
                "gt_digits": "0123456789", "font": os.path.basename(hf)}

    with open(os.path.join(out, "manifest.json"), "w") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    print(f"{len(manifest)} images -> {out}")
    for k in sorted(manifest):
        print(" ", k)


if __name__ == "__main__":
    main()


# --- decisive probe: random, non-inferable digit strings ---------------------
# The chart (0-9) and the worked solution are both guessable from priors: the
# model can emit a memorised 0..9 run, or infer the numbers from the arithmetic.
# Random digit groups remove both crutches, so this is the test that actually
# measures glyph perception.
RANDOM_ROWS = ["47 91 26", "30 85 19", "72 64 53"]


def gen_random_probe():
    out = os.path.join(HERE, "images")
    man_path = os.path.join(out, "manifest.json")
    man = json.load(open(man_path))
    fonts = {
        "hindi": (LANGS["hindi"]["print_font"], "deva"),
        "arabic": (LANGS["arabic"]["print_font"], "arab"),
        "bengali": (LANGS["bengali"]["print_font"], "bengali"),
        "spanish": (LANGS["spanish"]["print_font"], "latin"),
    }
    for lang, (fp, script) in fonts.items():
        tbl = DIGITS[script]
        lines = ["".join(tbl[int(c)] if c.isdigit() else c for c in row)
                 for row in RANDOM_ROWS]
        p = os.path.join(out, f"{lang}_n05_random_print.png")
        # bidi reorders whole Arabic-Indic number groups even under an LTR
        # base direction, so place every group explicitly
        draw_lines(p, fp, lines, size=72, rtl=False, force_tokens=True)
        man[f"{lang}_n05_random_print"] = {
            "lang": lang, "kind": "random", "script": script,
            "gt_digits": "".join(RANDOM_ROWS).replace(" ", ""),
            "gt_lines": RANDOM_ROWS, "font": os.path.basename(fp)}
    json.dump(man, open(man_path, "w"), ensure_ascii=False, indent=2)
    print("random probes written")
