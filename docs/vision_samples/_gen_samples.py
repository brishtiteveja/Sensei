#!/usr/bin/env python3
"""Generate synthetic 'handwritten math work' images for VLM stress-testing.

Writes PNG/JPEG samples + a manifest.json describing, for each image, the
ground-truth line contents and the line number of the deliberately planted error.

Usage:  python3 _gen_samples.py
Output: sibling files in this directory, manifest.json
"""
import json
import math
import os
import random

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

HERE = os.path.dirname(os.path.abspath(__file__))
FONTS = os.path.join(HERE, "_fonts")

F = {
    "caveat": os.path.join(FONTS, "Caveat.ttf"),
    "indie": os.path.join(FONTS, "IndieFlower-Regular.ttf"),
    "patrick": os.path.join(FONTS, "PatrickHand-Regular.ttf"),
    "kalam": os.path.join(FONTS, "Kalam-Regular.ttf"),
    "atma": os.path.join(FONTS, "AtmaSlab.ttf"),          # Bengali, informal
    "galada": os.path.join(FONTS, "Galada-Regular.ttf"),  # Bengali, calligraphic
    "hind": os.path.join(FONTS, "HindSiliguri-Regular.ttf"),
    "noto_bn": os.path.join(FONTS, "NotoSerifBengali.ttf"),
    "print": "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
}

INK = (24, 26, 60)      # blue-black ballpoint
PENCIL = (95, 95, 100)  # light pencil
RED = (170, 30, 30)


# --------------------------------------------------------------------------
# handwriting simulation
# --------------------------------------------------------------------------
def draw_hand_text(img, xy, text, font_path, size, fill=INK, jitter=1.0,
                   rng=None, slant=0.0):
    """Draw text glyph-by-glyph with per-glyph rotation/offset/size jitter so
    that a handwriting TTF stops looking mechanically uniform."""
    rng = rng or random
    x, y = xy  # y is the BASELINE, not the top
    sup = False
    for ch in text:
        # '^' raises the NEXT character, the way a student writes an exponent
        if ch == "^":
            sup = True
            continue
        if ch == " ":
            x += size * 0.30 * rng.uniform(0.8, 1.25)
            sup = False
            continue
        base = size * (0.60 if sup else 1.0)
        y_ch = y - (size * 0.42 if sup else 0)
        gs = int(base * rng.uniform(1 - 0.05 * jitter, 1 + 0.06 * jitter))
        fnt = ImageFont.truetype(font_path, gs)
        adv = max(1.0, fnt.getlength(ch))
        pad = int(gs * 1.6)
        tile = Image.new("RGBA", (int(adv) + 2 * pad, 3 * pad), (0, 0, 0, 0))
        td = ImageDraw.Draw(tile)
        # anchor="ls" == left / baseline, so every glyph shares a baseline
        td.text((pad, pad + gs), ch, font=fnt, fill=fill + (255,), anchor="ls")
        ang = rng.uniform(-2.6, 2.6) * jitter + slant
        if abs(ang) > 0.05:
            tile = tile.rotate(ang, resample=Image.BICUBIC, expand=False,
                               center=(pad, pad + gs))
        # small baseline drift only -- must stay well under x-height or a
        # letter starts looking like a superscript
        dy = rng.uniform(-0.03, 0.03) * base * jitter
        img.alpha_composite(tile, (int(x - pad), int(y_ch - pad - gs + dy)))
        x += adv * rng.uniform(1 - 0.03 * jitter, 1 + 0.05 * jitter)
        sup = False
    return x


def draw_hand_text_shaped(img, xy, text, font_path, size, fill=INK,
                          jitter=1.0, rng=None):
    """Whole-string draw (keeps complex-script shaping intact for Bengali),
    then warps the rendered strip to fake an unsteady hand."""
    rng = rng or random
    fnt = ImageFont.truetype(font_path, size)
    adv = max(4.0, fnt.getlength(text))
    pad = int(size * 1.6)
    w, h = int(adv) + 2 * pad, 4 * pad
    tile = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(tile).text((pad, pad + size), text, font=fnt,
                              fill=fill + (255,), anchor="ls")
    tile = wobble(tile, amp=1.6 * jitter, period=rng.uniform(38, 70), rng=rng)
    tile = tile.rotate(rng.uniform(-1.0, 1.0) * jitter, resample=Image.BICUBIC,
                       expand=False, center=(pad, pad + size))
    img.alpha_composite(tile, (int(xy[0] - pad), int(xy[1] - pad - size)))
    return xy[0] + adv


def wobble(im, amp=2.0, period=50.0, rng=None):
    """Sinusoidal vertical+horizontal displacement -> unsteady stroke path."""
    rng = rng or random
    ph1, ph2 = rng.uniform(0, 6.28), rng.uniform(0, 6.28)
    w, h = im.size
    src = im.load()
    out = Image.new(im.mode, im.size, (0, 0, 0, 0) if im.mode == "RGBA" else 255)
    dst = out.load()
    for yy in range(h):
        dx = int(amp * math.sin(2 * math.pi * yy / period + ph1))
        for xx in range(w):
            dy = int(amp * math.sin(2 * math.pi * xx / (period * 1.7) + ph2))
            sx, sy = xx - dx, yy - dy
            if 0 <= sx < w and 0 <= sy < h:
                dst[xx, yy] = src[sx, sy]
    return out


# --------------------------------------------------------------------------
# page + photo degradation
# --------------------------------------------------------------------------
def new_page(w=1100, h=850, ruled=True, paper=True, rng=None, rule_step=62,
             rule_first=130):
    rng = rng or random
    img = Image.new("RGBA", (w, h), (252, 250, 243, 255))
    if paper:
        noise = Image.effect_noise((w, h), 14).convert("L")
        noise = noise.filter(ImageFilter.GaussianBlur(0.6))
        tex = Image.merge("RGBA", (noise, noise, noise,
                                   Image.new("L", (w, h), 26)))
        img.alpha_composite(tex)
    if ruled:
        d = ImageDraw.Draw(img)
        yy = rule_first
        while yy < h - 30:
            d.line([(60, yy), (w - 50, yy)], fill=(178, 196, 216, 140), width=1)
            yy += rule_step
        d.line([(96, 20), (96, h - 20)], fill=(226, 168, 168, 150), width=2)
    return img


def lighting(img, strength=0.55, shadow_corner="right", rng=None):
    """Multiply a smooth gradient + a hard-ish shadow band over the page."""
    rng = rng or random
    w, h = img.size
    grad = Image.new("L", (w, h), 255)
    g = grad.load()
    cx = w * (0.15 if shadow_corner == "right" else 0.85)
    cy = h * 0.2
    maxd = math.hypot(w, h)
    for yy in range(0, h, 2):
        for xx in range(0, w, 2):
            d = math.hypot(xx - cx, yy - cy) / maxd
            v = int(255 * (1 - strength * d))
            g[xx, yy] = v
            if xx + 1 < w:
                g[xx + 1, yy] = v
            if yy + 1 < h:
                g[xx, yy + 1] = v
                if xx + 1 < w:
                    g[xx + 1, yy + 1] = v
    grad = grad.filter(ImageFilter.GaussianBlur(18))
    # hard shadow of a hand/phone across one edge
    sh = Image.new("L", (w, h), 255)
    sd = ImageDraw.Draw(sh)
    if shadow_corner == "right":
        sd.polygon([(w * 0.68, 0), (w, 0), (w, h), (w * 0.80, h)], fill=150)
    else:
        sd.polygon([(0, h * 0.72), (w, h * 0.60), (w, h), (0, h)], fill=155)
    sh = sh.filter(ImageFilter.GaussianBlur(42))
    base = img.convert("RGB")
    base = Image.composite(base, Image.new("RGB", (w, h), (0, 0, 0)), grad)
    base = Image.composite(base, Image.new("RGB", (w, h), (0, 0, 0)), sh)
    return base.convert("RGBA")


def perspective(img, k=0.10, rng=None):
    """Mild keystone, as if the phone was not parallel to the page."""
    rng = rng or random
    w, h = img.size
    dx = w * k * rng.uniform(0.5, 1.0)
    dy = h * k * 0.35
    src = [(0, 0), (w, 0), (w, h), (0, h)]
    dstp = [(dx, dy * rng.uniform(0.2, 1.0)), (w - dx * 0.3, 0),
            (w, h - dy * 0.4), (dx * 0.4, h)]
    # solve for the 8 perspective coefficients
    A, B = [], []
    for (xd, yd), (xs, ys) in zip(dstp, src):
        A.append([xd, yd, 1, 0, 0, 0, -xs * xd, -xs * yd])
        A.append([0, 0, 0, xd, yd, 1, -ys * xd, -ys * yd])
        B += [xs, ys]
    coeffs = gauss(A, B)
    return img.transform((w, h), Image.PERSPECTIVE, coeffs,
                         Image.BICUBIC, fillcolor=(245, 243, 238, 255))


def gauss(A, b):
    n = len(b)
    M = [row[:] + [b[i]] for i, row in enumerate(A)]
    for c in range(n):
        p = max(range(c, n), key=lambda r: abs(M[r][c]))
        M[c], M[p] = M[p], M[c]
        pv = M[c][c]
        for j in range(c, n + 1):
            M[c][j] /= pv
        for r in range(n):
            if r != c and M[r][c]:
                f = M[r][c]
                for j in range(c, n + 1):
                    M[r][j] -= f * M[c][j]
    return [M[i][n] for i in range(n)]


def photo(img, rot=0.0, persp=0.0, light=0.0, blur=0.0, jpeg=None,
          scale=1.0, rng=None, out=None):
    rng = rng or random
    if persp:
        img = perspective(img, persp, rng)
    if rot:
        img = img.rotate(rot, resample=Image.BICUBIC, expand=True,
                         fillcolor=(238, 236, 231, 255))
    if light:
        img = lighting(img, light, rng.choice(["right", "bottom"]), rng)
    if blur:
        img = img.filter(ImageFilter.GaussianBlur(blur))
    if scale != 1.0:
        w, h = img.size
        img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
    rgb = img.convert("RGB")
    if jpeg:
        rgb.save(out, "JPEG", quality=jpeg)
    else:
        rgb.save(out)
    return out


# --------------------------------------------------------------------------
# problems: (lines, error_line_1based or None, note)
# --------------------------------------------------------------------------
PROBLEMS = {
    # sign error moving a term across the equals sign
    "sign": dict(
        lines=["3x + 5 = 20", "3x = 20 + 5", "3x = 25", "x = 25/3"],
        error=2,
        truth="line 2 adds 5 instead of subtracting it when moving +5 across =",
    ),
    # the known (20)^2 -> (20)x2 wobble, now in handwriting
    # NOTE: written with '^' so the generator raises the exponent the way a
    # student would, instead of using a typographic superscript glyph.
    # (Also: no pi -- the handwriting TTFs have no U+03C0 and drop it silently.)
    "exponent": dict(
        lines=["A = s^2 ,  s = 4", "A = (4)^2", "A = 8", "A = 8 cm^2"],
        error=3,
        truth="line 3 doubles 4 instead of squaring it; (4)^2 = 16",
    ),
    # sign-of-a kinematics, matches the case already validated on rendered text
    "kinematics": dict(
        lines=["v = u + at", "u = 20,  a = -9.8,  t = 3",
               "v = 20 + (-9.8)(3)", "v = 20 - 29.4", "v = 9.4"],
        error=5,
        truth="line 5 arithmetic slip: 20 - 29.4 = -9.4, not 9.4",
    ),
    # freshman fraction addition
    "fraction": dict(
        lines=["1/2 + 1/3", "= (1+1)/(2+3)", "= 2/5"],
        error=2,
        truth="line 2 adds numerators and denominators instead of using an LCD",
    ),
    # distributive + sign
    "distrib": dict(
        lines=["5(x - 3) = 20", "5x - 15 = 20", "5x = 20 - 15", "5x = 5",
               "x = 1"],
        error=3,
        truth="line 3 subtracts 15 instead of adding it",
    ),
    # CONTROL: fully correct work, no planted error
    "correct": dict(
        lines=["2x + 7 = 15", "2x = 15 - 7", "2x = 8", "x = 4"],
        error=None,
        truth="no error; control for false positives",
    ),
    # Bengali numerals, Bengali-script working
    "bn_sign": dict(
        lines=["২x + ৭ = ১৫",
               "২x = ১৫ - ৭",
               "২x = ৮",
               "x = ৮ × ২ = ১৬"],
        error=4,
        truth="line 4 multiplies by 2 instead of dividing by 2",
        script="bn",
    ),
    # Bengali prose + Latin math, mixed
    "bn_mixed": dict(
        lines=["সমাধান ঃ",
               "5(x - 3) = 20", "5x - 15 = 20", "5x = 20 - 15", "x = 1",
               "উত্তর : x = 1"],
        error=4,
        truth="line 4 subtracts 15 instead of adding it",
        script="bn_mixed",
    ),
    # Bengali all-numeral control, no error
    # isolation diagnostics: is the Bengali failure about handwriting, or about
    # the numeral glyphs themselves?
    "bn_chart": dict(
        lines=["০  ১  ২  ৩  ৪", "৫  ৬  ৭  ৮  ৯"],
        error=None,
        truth="not a proof; a plain Bengali digit chart 0-9 in two rows",
        script="bn",
    ),
    "bn_oneline": dict(
        lines=["২x + ৭ = ১৫"],
        error=None,
        truth="single line, Bengali numerals, nothing to solve",
        script="bn",
    ),
    "bn_correct": dict(
        lines=["৩x = ২১", "x = ২১ ÷ ৩",
               "x = ৭"],
        error=None,
        truth="no error; Bengali control for false positives",
        script="bn",
    ),
}


def render_problem(key, font, size=46, jitter=1.0, seed=0, ruled=True,
                   numbered=True, pencil=False, messy=False, cramped=False,
                   scrawl=False, paper=True):
    rng = random.Random(seed)
    p = PROBLEMS[key]
    lines = p["lines"]
    lh = int(size * (1.18 if cramped else 1.60))
    h = 230 + lh * len(lines) + (170 if messy else 0)
    y0 = 150
    img = new_page(1150, max(560, h), ruled=ruled, paper=paper, rng=rng,
                   rule_step=lh, rule_first=y0 + 8)
    fill = PENCIL if pencil else INK
    is_bn = p.get("script") in ("bn", "bn_mixed")

    y = y0  # baseline of the first line
    for i, ln in enumerate(lines, 1):
        x = 135 + rng.uniform(-6, 10)
        if numbered:
            num = f"{i})" if not is_bn else f"{'০১২৩৪৫৬৭৮৯'[i]})"
            if is_bn:
                draw_hand_text_shaped(img, (x, y), num, font, size, fill,
                                      jitter, rng)
                x += size * 1.5
            else:
                x = draw_hand_text(img, (x, y), num, font, size, fill,
                                   jitter, rng) + size * 0.35
        if is_bn:
            draw_hand_text_shaped(img, (x, y), ln, font, size, fill, jitter, rng)
        else:
            draw_hand_text(img, (x, y), ln, font, size, fill, jitter, rng)
        y += lh + rng.uniform(-3, 4)

    if messy:
        d = ImageDraw.Draw(img)
        # crossed-out abandoned attempt in the margin
        mx, my = 720, 190
        draw_hand_text(img, (mx, my), "x = 20/3", font, int(size * 0.85),
                       fill, jitter, rng)
        d.line([(mx - 8, my - 14), (mx + 200, my - 26)], fill=fill + (255,),
               width=4)
        d.line([(mx - 4, my - 28), (mx + 195, my - 8)], fill=fill + (255,),
               width=3)
        # margin scribble
        draw_hand_text(img, (770, 330), "?? check", font, int(size * 0.7),
                       RED, jitter * 1.4, rng)
        # a red annotation squeezed beside the working
        draw_hand_text(img, (620, y - lh * 0.6), "ans", font,
                       int(size * 0.7), RED, jitter * 1.3, rng)
        # doodle
        d.arc([830, 430, 930, 510], 0, 300, fill=fill + (200,), width=3)
    if scrawl:
        # global elastic warp -> strokes stop being font-perfect
        img = wobble(img, amp=2.6, period=rng.uniform(26, 44), rng=rng)
    return img


def main():
    os.makedirs(HERE, exist_ok=True)
    manifest = []

    def emit(name, problem, img, **photo_kw):
        ext = "jpg" if photo_kw.get("jpeg") else "png"
        path = os.path.join(HERE, f"{name}.{ext}")
        photo(img, out=path, rng=random.Random(hash(name) & 0xFFFF), **photo_kw)
        p = PROBLEMS[problem]
        manifest.append(dict(
            id=name, file=os.path.basename(path), problem=problem,
            lines=p["lines"], error_line=p["error"], truth=p["truth"],
            script=p.get("script", "latin"), conditions=photo_kw,
        ))

    # ---- C0 control: cleanly rendered print, no degradation (prior baseline)
    emit("c00_print_clean", "sign",
         render_problem("sign", F["print"], size=44, jitter=0.0, seed=1))

    # ---- C1 handwriting, otherwise clean
    emit("c01_hand_clean", "sign",
         render_problem("sign", F["caveat"], size=52, jitter=1.0, seed=2))
    emit("c02_hand_clean_indie", "fraction",
         render_problem("fraction", F["indie"], size=50, jitter=1.0, seed=3))

    # ---- C2/C3 rotation + perspective
    emit("c03_hand_rot3", "kinematics",
         render_problem("kinematics", F["patrick"], size=48, jitter=1.0, seed=4),
         rot=3.0)
    emit("c04_hand_rot7_persp", "sign",
         render_problem("sign", F["caveat"], size=52, jitter=1.1, seed=5),
         rot=-7.0, persp=0.06)

    # ---- C4 lighting / shadow
    emit("c05_hand_shadow", "distrib",
         render_problem("distrib", F["indie"], size=48, jitter=1.0, seed=6),
         light=0.55)

    # ---- C5 paper + jpeg compression
    emit("c06_hand_jpeg35", "fraction",
         render_problem("fraction", F["patrick"], size=48, jitter=1.0, seed=7),
         jpeg=35)

    # ---- C6 full phone-photo stack (realistic worst case)
    emit("c07_hand_phone_full", "sign",
         render_problem("sign", F["caveat"], size=52, jitter=1.3, seed=8),
         rot=4.5, persp=0.05, light=0.5, blur=0.7, jpeg=30, scale=0.75)
    emit("c08_hand_phone_full2", "kinematics",
         render_problem("kinematics", F["indie"], size=50, jitter=1.3, seed=9),
         rot=-5.5, persp=0.06, light=0.45, blur=0.8, jpeg=32, scale=0.8)

    # ---- exponent stress (the known wobble)
    emit("c09_exponent_clean", "exponent",
         render_problem("exponent", F["caveat"], size=52, jitter=1.0, seed=10))
    emit("c10_exponent_phone", "exponent",
         render_problem("exponent", F["patrick"], size=50, jitter=1.2, seed=11),
         rot=3.5, light=0.45, blur=0.7, jpeg=32, scale=0.8)

    # ---- no-error controls (false-positive test)
    emit("c11_correct_clean", "correct",
         render_problem("correct", F["caveat"], size=52, jitter=1.0, seed=12))
    emit("c12_correct_phone", "correct",
         render_problem("correct", F["indie"], size=50, jitter=1.3, seed=13),
         rot=-4.0, persp=0.05, light=0.5, blur=0.8, jpeg=30, scale=0.78)

    # ---- Bengali
    emit("c13_bn_clean", "bn_sign",
         render_problem("bn_sign", F["atma"], size=50, jitter=0.9, seed=14))
    emit("c14_bn_hand_galada", "bn_sign",
         render_problem("bn_sign", F["galada"], size=50, jitter=1.0, seed=15))
    emit("c15_bn_phone", "bn_sign",
         render_problem("bn_sign", F["atma"], size=50, jitter=1.1, seed=16),
         rot=4.0, persp=0.05, light=0.5, blur=0.7, jpeg=32, scale=0.8)
    emit("c16_bn_mixed_clean", "bn_mixed",
         render_problem("bn_mixed", F["atma"], size=48, jitter=0.9, seed=17))
    emit("c17_bn_mixed_phone", "bn_mixed",
         render_problem("bn_mixed", F["hind"], size=48, jitter=1.0, seed=18),
         rot=-3.5, light=0.5, blur=0.7, jpeg=32, scale=0.8)
    emit("c18_bn_correct_clean", "bn_correct",
         render_problem("bn_correct", F["atma"], size=50, jitter=0.9, seed=19))

    # ---- messy layout
    emit("c19_messy_crossout", "sign",
         render_problem("sign", F["caveat"], size=50, jitter=1.2, seed=20,
                        messy=True))
    emit("c20_messy_phone", "distrib",
         render_problem("distrib", F["indie"], size=46, jitter=1.3, seed=21,
                        messy=True, cramped=True),
         rot=5.0, persp=0.06, light=0.5, blur=0.8, jpeg=30, scale=0.78)

    # ---- cramped lines
    emit("c21_cramped", "kinematics",
         render_problem("kinematics", F["patrick"], size=44, jitter=1.2,
                        seed=22, cramped=True))

    # ---- faint pencil, low contrast
    emit("c22_pencil_faint", "fraction",
         render_problem("fraction", F["caveat"], size=50, jitter=1.1, seed=23,
                        pencil=True),
         light=0.4, jpeg=40)

    # ---- low resolution
    emit("c23_lowres", "sign",
         render_problem("sign", F["indie"], size=52, jitter=1.1, seed=24),
         rot=3.0, jpeg=40, scale=0.42)

    # ---- hard tier: sloppy scrawl (high per-glyph jitter)
    emit("c24_scrawl_clean", "distrib",
         render_problem("distrib", F["caveat"], size=52, jitter=2.6, seed=25,
                        cramped=True, scrawl=True))
    emit("c25_scrawl_phone", "sign",
         render_problem("sign", F["indie"], size=52, jitter=2.6, seed=26,
                        cramped=True, scrawl=True),
         rot=6.5, persp=0.07, light=0.5, blur=1.0, jpeg=28, scale=0.72)
    emit("c26_bn_scrawl_phone", "bn_sign",
         render_problem("bn_sign", F["galada"], size=52, jitter=2.4, seed=27,
                        scrawl=True),
         rot=-6.0, persp=0.06, light=0.5, blur=0.9, jpeg=30, scale=0.75)

    # ---- hard tier: very small capture
    emit("c27_tiny", "kinematics",
         render_problem("kinematics", F["caveat"], size=52, jitter=1.2, seed=28),
         rot=3.0, jpeg=35, scale=0.30)

    # ---- hard tier: motion blur / out of focus
    emit("c28_heavyblur", "exponent",
         render_problem("exponent", F["indie"], size=54, jitter=1.2, seed=29),
         rot=-3.0, light=0.45, blur=2.4, jpeg=35, scale=0.8)

    # ---- D-series: Bengali-numeral isolation diagnostics.
    # Pristine, printed, oversized -- if these fail, the problem is the model's
    # grasp of Bengali digit glyphs, not photo quality or handwriting.
    emit("d01_bn_chart_print", "bn_chart",
         render_problem("bn_chart", F["noto_bn"], size=90, jitter=0.0, seed=40,
                        ruled=False, paper=False, numbered=False))
    emit("d02_bn_print_pristine", "bn_sign",
         render_problem("bn_sign", F["noto_bn"], size=64, jitter=0.0, seed=41,
                        ruled=False, paper=False))
    emit("d03_bn_oneline_huge", "bn_oneline",
         render_problem("bn_oneline", F["noto_bn"], size=110, jitter=0.0,
                        seed=42, ruled=False, paper=False, numbered=False))
    emit("d04_bn_chart_hand", "bn_chart",
         render_problem("bn_chart", F["atma"], size=90, jitter=1.0, seed=43,
                        ruled=False, paper=False, numbered=False))

    with open(os.path.join(HERE, "manifest.json"), "w") as fh:
        json.dump(manifest, fh, indent=2, ensure_ascii=False)
    print(f"wrote {len(manifest)} samples")
    for m in manifest:
        print(" ", m["file"], "err_line=", m["error_line"])


if __name__ == "__main__":
    main()
