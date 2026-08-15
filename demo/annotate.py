#!/usr/bin/env python3
"""Line segmentation + red-box annotation for the Sensei "show me the wrong line" beat.

The model is only asked for a *line index* (1-based, counted from the top of the
page). Everything spatial is done here, locally and deterministically:

    bands = find_line_bands("photo.jpg")        # -> [(y0, y1, x0, x1), ...]
    annotate("photo.jpg", 2, "out.png")         # red box round line 2

Why not ask the VLM for a bounding box directly: see
docs/VISION_FINDINGS.md -> "Annotated-photo coordinates (P1 beat validation)".
Short version: the model's boxes do not land on the right line.

Deps: Pillow, numpy. No OpenCV.

CLI
    python3 annotate.py IMAGE --line 2 --out boxed.png
    python3 annotate.py IMAGE --bands            # print detected bands as JSON
    python3 annotate.py IMAGE --all --out g.png  # box every line (debug view)
"""
from __future__ import annotations

import argparse
import json
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageOps

__all__ = ["prepare", "frame_and_bands", "find_line_bands", "annotate",
           "annotate_all", "estimate_skew", "deskew"]


# --------------------------------------------------------------------------
# page isolation -- a phone photo has desk/shadow around the paper, and the
# rotate-to-straighten step smears that dark border across the row profile.
# --------------------------------------------------------------------------
def _paper_mask(g: Image.Image, ds=6, dark=90) -> Image.Image:
    """Boolean 'L' mask, 255 = paper. Large dark regions are treated as
    off-page; handwriting strokes are too thin to survive the erosion."""
    w, h = g.size
    small = g.resize((max(8, w // ds), max(8, h // ds)), Image.BILINEAR)
    a = np.asarray(small, np.uint8)
    off = Image.fromarray(((a < dark) * 255).astype(np.uint8), "L")
    off = off.filter(ImageFilter.MinFilter(5))   # erode: kill thin strokes
    off = off.filter(ImageFilter.MaxFilter(9))   # dilate back + margin
    off = off.resize((w, h), Image.NEAREST)
    return ImageOps.invert(off)


def prepare(path_or_im, max_edge=1400, margin=0.02):
    """Photo -> the single frame everything else works in.

    Whitens the off-page border, deskews, crops to the sheet, caps resolution.
    The image the model is shown and the image the box is drawn on must be this
    same frame, otherwise the coordinates mean nothing.

    Returns (RGB image, info dict).
    """
    im = (Image.open(path_or_im) if isinstance(path_or_im, str)
          else path_or_im).convert("RGB")
    g = im.convert("L")
    paper = _paper_mask(g)

    # Fill off-page with the paper's own median tone, NOT with white: a hard
    # white border creates a dark halo once the illumination is flattened, and
    # that halo reads as a giant blob of ink.
    arr = np.asarray(im, np.float32)
    sel = np.asarray(paper, np.uint8) > 127
    fill = tuple(int(v) for v in np.median(arr[sel], axis=0)) if sel.any() \
        else (235, 235, 235)
    im = Image.composite(im, Image.new("RGB", im.size, fill), paper)

    bbox = paper.point(lambda v: 255 if v > 127 else 0).getbbox()
    if bbox:
        mx = int(min(im.size) * margin)
        im = im.crop((max(0, bbox[0] - mx), max(0, bbox[1] - mx),
                      min(im.width, bbox[2] + mx),
                      min(im.height, bbox[3] + mx)))

    im, angle = deskew(im, fill=fill)

    if im.width > max_edge or im.height > max_edge:
        s = max_edge / max(im.size)
        im = im.resize((int(im.width * s), int(im.height * s)), Image.LANCZOS)
    return im, {"skew": angle, "size": im.size}


# --------------------------------------------------------------------------
# skew
# --------------------------------------------------------------------------
def _ink(im: Image.Image) -> np.ndarray:
    """Grayscale -> float array in [0,1] where 1 == ink (dark)."""
    g = np.asarray(im.convert("L"), dtype=np.float32) / 255.0
    return 1.0 - g


def _flatten(g: Image.Image) -> Image.Image:
    """Divide by a heavily blurred copy -> even illumination, white paper."""
    bg = g.filter(ImageFilter.GaussianBlur(max(6, g.width / 20)))
    a = np.asarray(g, np.float32)
    b = np.asarray(bg, np.float32)
    flat = np.clip(a * 255.0 / np.maximum(b, 1.0), 0, 255)
    return Image.fromarray(flat.astype(np.uint8), "L")


def estimate_skew(im: Image.Image, limit=9.0, step=0.25) -> float:
    """Angle (deg) that maximises the variance of the horizontal ink profile.

    Text rows line up when the page is straight, which spikes row variance.
    Rotation introduces blank fill in the corners, which by itself changes the
    row profile and biases the search towards large angles -- so we rotate a
    validity mask alongside the image and use the *mean* ink per valid pixel,
    ignoring rows that are mostly fill.
    """
    small = im.convert("L")
    scale = 700.0 / max(small.size)
    if scale < 1.0:
        small = small.resize((max(1, int(small.width * scale)),
                              max(1, int(small.height * scale))),
                             Image.BILINEAR)
    # Flatten lighting *before* the search: a shadow gradient rotates with the
    # image and otherwise dominates the row profile, which sends the estimate
    # straight to the search limit.
    small = _flatten(small)
    mask = Image.new("L", small.size, 255)

    def score(a):
        r = small.rotate(a, resample=Image.BILINEAR, fillcolor=255)
        mk = np.asarray(mask.rotate(a, resample=Image.BILINEAR, fillcolor=0),
                        np.float32) / 255.0
        ok = mk > 0.5
        valid = ok.sum(axis=1)
        keep = valid > (0.6 * small.width)
        if keep.sum() < 10:
            return -1.0
        prof = (_ink(r) * ok).sum(axis=1)[keep] / valid[keep]
        return float(prof.var())

    # coarse pass then a local refine -- 4x fewer rotations than a flat sweep
    coarse = 1.0
    best_a = max((k * coarse for k in range(-int(limit / coarse),
                                            int(limit / coarse) + 1)),
                 key=score)
    lo, hi = best_a - coarse, best_a + coarse
    n = int(round((hi - lo) / step))
    best_a = max((lo + i * step for i in range(n + 1)), key=score)
    return round(best_a, 2)


def deskew(im: Image.Image, angle: float | None = None, fill=None):
    if angle is None:
        angle = estimate_skew(im)
    if abs(angle) < 0.05:
        return im, 0.0
    # NB fillcolor must be a colour name / tuple: passing the int 255 to an RGB
    # image gives *red* fill, not white.
    if fill is None:
        fill = "white" if im.mode != "RGB" else (255, 255, 255)
    return im.rotate(angle, resample=Image.BICUBIC, fillcolor=fill,
                     expand=True), angle


# --------------------------------------------------------------------------
# ruled-line suppression
# --------------------------------------------------------------------------
def _local_ink(g: Image.Image) -> np.ndarray:
    """Adaptive 'how much darker than the local paper' map, in [0,1].

    A global threshold cannot survive a phone photo's lighting gradient -- the
    shadowed half of the page binarises into one solid blob that swallows every
    text line. Comparing each pixel to a local mean is immune to any gradient
    slower than the blur radius.
    """
    r = max(10.0, g.width / 40.0)
    bg = np.asarray(g.filter(ImageFilter.GaussianBlur(r)), np.float32)
    a = np.asarray(g, np.float32)
    return np.clip((bg - a) / 255.0, 0.0, 1.0)


def _otsu(v: np.ndarray) -> float:
    hist, edges = np.histogram(v, bins=256, range=(0.0, 1.0))
    hist = hist.astype(np.float64)
    tot = hist.sum()
    if tot == 0:
        return 0.5
    p = hist / tot
    centres = (edges[:-1] + edges[1:]) / 2
    w0 = np.cumsum(p)
    m0 = np.cumsum(p * centres)
    mt = m0[-1]
    denom = w0 * (1 - w0)
    denom[denom == 0] = 1e-12
    between = (mt * w0 - m0) ** 2 / denom
    return float(centres[int(np.argmax(between))])


def _row_max_run(binary: np.ndarray) -> np.ndarray:
    """Longest horizontal run of True per row (vectorised over rows)."""
    h, w = binary.shape
    run = np.zeros(h, np.int32)
    cur = np.zeros(h, np.int32)
    for x in range(w):
        col = binary[:, x]
        cur = np.where(col, cur + 1, 0)
        run = np.maximum(run, cur)
    return run


def _suppress_rules(binary: np.ndarray, frac=0.35) -> np.ndarray:
    """Zero out printed ruled lines: rows containing a long continuous run.

    Handwriting never draws an unbroken horizontal stroke across a third of the
    page; a printed rule does. We remove the whole row (rules span the page, so
    nothing else of value lives on exactly that scanline).
    """
    h, w = binary.shape
    runs = _row_max_run(binary)
    kill = runs > frac * w
    if not kill.any():
        return binary
    out = binary.copy()
    # rules are 1-4px thick; also clear the immediate anti-aliased neighbours
    idx = np.where(kill)[0]
    for y in idx:
        out[max(0, y - 1):min(h, y + 2), :] = False
    return out


# --------------------------------------------------------------------------
# line bands
# --------------------------------------------------------------------------
def _components(binary):
    """Connected components -> (labels, slices). Falls back to a pure-numpy
    two-pass labeller if scipy is unavailable."""
    from scipy import ndimage
    lab, n = ndimage.label(binary, structure=np.ones((3, 3), bool))
    return lab, ndimage.find_objects(lab), n


def _clean_components(binary, max_h_frac=0.22, max_w_frac=0.55,
                      min_area_frac=2e-5):
    """Drop everything that cannot be a handwritten glyph: shadow blobs, page
    edges, doodles, leftover rules, single-pixel JPEG speckle."""
    h, w = binary.shape
    lab, slices, n = _components(binary)
    keep = np.zeros_like(binary)
    boxes = []
    min_area = max(6, int(h * w * min_area_frac))
    for i, sl in enumerate(slices, 1):
        if sl is None:
            continue
        ys, xs = sl
        bh, bw = ys.stop - ys.start, xs.stop - xs.start
        area = int((lab[sl] == i).sum())
        if bh > h * max_h_frac or bw > w * max_w_frac:
            continue
        # a long, sparse, near-horizontal streak is a page edge or a rule
        # remnant, never a glyph
        if bw > 3 * bh and bw > w * 0.15 and area < 0.20 * bh * bw:
            continue
        if area < min_area and bh * bw < min_area * 3:
            continue
        keep[sl] |= (lab[sl] == i)
        boxes.append((ys.start, ys.stop - 1, xs.start, xs.stop - 1, area))
    return keep, boxes


def _main_column(boxes, w, glyph_h):
    """The x-range of the working column, ignoring margin scribbles.

    Column profile of glyph boxes, smoothed; keep the densest contiguous run
    plus any neighbouring run holding a comparable amount of ink.
    """
    if not boxes:
        return 0, w - 1
    prof = np.zeros(w, np.float32)
    for y0, y1, x0, x1, area in boxes:
        prof[x0:x1 + 1] += area / max(1, (x1 - x0 + 1))
    k = max(3, int(glyph_h * 1.5) | 1)
    sm = np.convolve(prof, np.ones(k, np.float32) / k, mode="same")
    thr = sm.max() * 0.08
    segs, x = [], 0
    while x < w:
        if sm[x] > thr:
            x0 = x
            while x < w and sm[x] > thr:
                x += 1
            segs.append((x0, x - 1, float(sm[x0:x].sum())))
        else:
            x += 1
    if not segs:
        return 0, w - 1
    segs.sort(key=lambda s: s[0])
    bi = max(range(len(segs)), key=lambda i: segs[i][2])
    lo, hi = segs[bi][0], segs[bi][1]
    # grow outward only across small gaps -- margin scribbles sit in their own
    # column a long way off and must not be absorbed
    max_gap = glyph_h * 3.0
    i = bi - 1
    while i >= 0 and lo - segs[i][1] <= max_gap:
        lo = segs[i][0]
        i -= 1
    j = bi + 1
    while j < len(segs) and segs[j][0] - hi <= max_gap:
        hi = segs[j][1]
        j += 1
    return lo, hi


def _cluster_rows(boxes, glyph_h, tol=0.62):
    """Group glyph boxes into text lines by vertical overlap of their centres."""
    if not boxes:
        return []
    items = sorted(boxes, key=lambda b: (b[0] + b[1]) / 2.0)
    rows = [[items[0]]]
    for b in items[1:]:
        cy = (b[0] + b[1]) / 2.0
        cur = rows[-1]
        cy_prev = np.median([(c[0] + c[1]) / 2.0 for c in cur])
        top = min(c[0] for c in cur)
        bot = max(c[1] for c in cur)
        # same line if its centre sits inside the running row, or close to it
        if b[0] <= bot + glyph_h * 0.15 and abs(cy - cy_prev) < glyph_h * tol:
            cur.append(b)
        elif b[0] < bot and (min(b[1], bot) - max(b[0], top)) > \
                0.45 * min(b[1] - b[0] + 1, bot - top + 1):
            cur.append(b)
        else:
            rows.append([b])
    return rows


def find_line_bands(path_or_im, do_deskew=True, pad_frac=0.22,
                    return_debug=False):
    """Segment a page of handwritten work into text-line bands.

    Returns a list of dicts {"y0","y1","x0","x1"} in pixels of the image as
    passed in (deskewed first if do_deskew). Use prepare() upstream so that the
    frame matches the one the model is shown.
    """
    im = Image.open(path_or_im) if isinstance(path_or_im, str) else path_or_im
    im = im.convert("RGB")
    angle = 0.0
    if do_deskew:
        im, angle = deskew(im)

    g = im.convert("L")
    ink = _local_ink(g)
    t = max(_otsu(ink), 0.055)
    binary = ink > t
    binary = _suppress_rules(binary)

    h, w = binary.shape
    keep, boxes = _clean_components(binary)
    if not boxes:
        return ([], {}) if return_debug else []

    heights = np.array([b[1] - b[0] + 1 for b in boxes], np.float32)
    areas = np.array([b[4] for b in boxes], np.float32)
    # ink-weighted height percentile -> the height of a typical digit/letter,
    # not of a stray comma
    order = np.argsort(heights)
    cum = np.cumsum(areas[order])
    glyph_h = float(heights[order][int(np.searchsorted(cum, cum[-1] * 0.6))])
    glyph_h = max(glyph_h, h * 0.012)

    xlo, xhi = _main_column(boxes, w, glyph_h)
    col = [b for b in boxes
           if (b[2] + b[3]) / 2.0 >= xlo - glyph_h and
              (b[2] + b[3]) / 2.0 <= xhi + glyph_h]
    if len(col) < max(2, 0.25 * len(boxes)):
        col = boxes
        xlo, xhi = 0, w - 1

    rows = _cluster_rows(col, glyph_h)
    # A text line is several glyphs of roughly glyph height. One long thin
    # component is a page edge or a leftover rule, not a line of working.
    tot_ink = sum(b[4] for b in col)
    def _is_line(r):
        y0 = min(b[0] for b in r)
        y1 = max(b[1] for b in r)
        if sum(b[4] for b in r) <= tot_ink * 0.02:
            return False
        if (y1 - y0 + 1) < glyph_h * 0.45:
            return False
        return len(r) >= 3 or (y1 - y0 + 1) >= glyph_h * 0.8
    rows = [r for r in rows if _is_line(r)]

    raw = []
    for r in rows:
        raw.append((min(b[0] for b in r), max(b[1] for b in r),
                    min(b[2] for b in r), max(b[3] for b in r),
                    sum(b[4] for b in r)))

    # Lines of working share a left margin. A "row" that overlaps none of the
    # others horizontally is a page edge or a margin doodle -- and an extra row
    # at the top silently shifts every line number, so this matters.
    if len(raw) >= 3:
        rx0 = float(np.median([r[2] for r in raw]))
        rx1 = float(np.median([r[3] for r in raw]))
        def _ov(r):
            o = min(r[3], rx1) - max(r[2], rx0)
            return o / max(1.0, min(r[3] - r[2], rx1 - rx0))
        kept = [r for r in raw if _ov(r) > 0.25]
        if len(kept) >= 2:
            raw = kept

    out = []
    for y0, y1, x0, x1, _ink_amt in raw:
        pad = int((y1 - y0) * pad_frac)
        xp = int(glyph_h * 0.3)
        out.append({"y0": max(0, y0 - pad), "y1": min(h - 1, y1 + pad),
                    "x0": max(0, x0 - xp), "x1": min(w - 1, x1 + xp)})
    out.sort(key=lambda b: b["y0"])

    if return_debug:
        return out, {"image": im, "skew": angle, "binary": binary,
                     "kept": keep, "glyph_h": glyph_h, "column": (xlo, xhi)}
    return out


# --------------------------------------------------------------------------
# drawing
# --------------------------------------------------------------------------
def frame_and_bands(path_or_im):
    """The one call the demo needs before talking to the model.

    Returns (frame, bands, info). Send `frame` to the model, get a line index
    back, then annotate(frame, idx, bands=bands).
    """
    im, info = prepare(path_or_im)
    bands = find_line_bands(im, do_deskew=False)
    return im, bands, info


def annotate(path_or_im, line_index, out_path=None, color=(225, 30, 45),
             width=None, label=None, bands=None):
    """Draw a red box around 1-based `line_index`.

    Pass `bands` (and a prepared frame) if you already have them -- otherwise
    the frame is rebuilt here, and it MUST be the same frame the model saw.
    Returns (image, band|None); band is None if the index is out of range,
    which is the signal to fall back to quoting the line as text.
    """
    if bands is None:
        im, bands, _ = frame_and_bands(path_or_im)
        im = im.copy()
    else:
        im = (Image.open(path_or_im) if isinstance(path_or_im, str)
              else path_or_im).convert("RGB").copy()

    if not (isinstance(line_index, int) and 1 <= line_index <= len(bands)):
        return im, None
    b = bands[line_index - 1]
    d = ImageDraw.Draw(im)
    wpx = width or max(3, int(im.width / 300))
    m = wpx * 2
    d.rounded_rectangle([b["x0"] - m, b["y0"] - m, b["x1"] + m, b["y1"] + m],
                        radius=wpx * 3, outline=color, width=wpx)
    if label:
        d.text((b["x0"], max(0, b["y0"] - wpx * 8)), label, fill=color)
    if out_path:
        im.save(out_path)
    return im, b


def annotate_all(path_or_im, out_path=None, bands=None):
    """Debug view: number and box every detected line."""
    if bands is None:
        im, bands, _ = frame_and_bands(path_or_im)
        im = im.copy()
    else:
        im = (Image.open(path_or_im) if isinstance(path_or_im, str)
              else path_or_im).convert("RGB").copy()
    d = ImageDraw.Draw(im)
    for i, b in enumerate(bands, 1):
        d.rectangle([b["x0"], b["y0"], b["x1"], b["y1"]],
                    outline=(0, 140, 255), width=3)
        d.text((max(0, b["x0"] - 34), b["y0"]), str(i), fill=(255, 0, 0))
    if out_path:
        im.save(out_path)
    return im, bands


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("image")
    ap.add_argument("--line", type=int, help="1-based line to box")
    ap.add_argument("--out", help="where to write the annotated image")
    ap.add_argument("--frame-out", help="write the prepared frame; this is the "
                                        "image that must be sent to the model")
    ap.add_argument("--bands", action="store_true", help="print bands as JSON")
    ap.add_argument("--all", action="store_true", help="box every line")
    a = ap.parse_args()

    im, bands, info = frame_and_bands(a.image)
    if a.frame_out:
        im.save(a.frame_out)

    if a.all:
        annotate_all(im, a.out or "annotated.png", bands=bands)
        print(json.dumps({"skew": info["skew"], "size": info["size"],
                          "bands": bands}, indent=1))
        return
    if a.bands or a.line is None:
        print(json.dumps({"skew": info["skew"], "size": info["size"],
                          "bands": bands}, indent=1))
        return
    _, b = annotate(im, a.line, a.out or "annotated.png", bands=bands)
    if b is None:
        sys.exit(f"line {a.line} is outside the {len(bands)} lines found -- "
                 f"fall back to quoting the line as text")
    print(json.dumps(b))


if __name__ == "__main__":
    main()
