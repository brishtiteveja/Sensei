#!/usr/bin/env python3
"""Grade the coordinate sweep: did the box land on the right line?

  python3 _grade_coords.py ../vision_runs/coords_30b.jsonl
"""
import collections
import json
import re
import sys

NONE = {"none", "null", "n/a", "-", "nan"}


def parse_line_no(txt):
    if not txt:
        return "ERR"
    m = re.search(r"FIRST_ERROR\s*[:\-]?\s*\**\s*([^\n]*)", txt, re.I)
    if not m:
        m = re.search(r"2\.\s*FIRST_ERROR\s*[:\-]?\s*([^\n]*)", txt, re.I)
    if not m:
        return "ERR"
    v = m.group(1).strip().strip("*` ")
    if v.split(".")[0].strip().lower() in NONE or v.lower().startswith("none"):
        return None
    d = re.search(r"\d+", v)
    return int(d.group()) if d else "ERR"


def parse_total(txt):
    if not txt:
        return None
    m = re.search(r"TOTAL_LINES\s*[:\-]?\s*(\d+)", txt, re.I)
    return int(m.group(1)) if m else None


BOXPAT = [
    r"<\|box_start\|>\s*\(?\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)?\s*,\s*\(?\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)?\s*<\|box_end\|>",
    r"BOX\s*[:\-]?\s*\[?\(?\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)?\s*,\s*\(?\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)?\]?",
    r"\[\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\]",
]


def parse_box(txt):
    if not txt:
        return None
    for p in BOXPAT:
        m = re.search(p, txt, re.I)
        if m:
            try:
                return [float(g) for g in m.groups()]
            except ValueError:
                pass
    return None


def scale_box(box, w, h, mode):
    x0, y0, x1, y1 = box
    if mode == "unit":
        f = (w, h, w, h)
    elif mode == "k1000":
        f = (w / 1000.0, h / 1000.0, w / 1000.0, h / 1000.0)
    else:                     # raw pixels
        f = (1, 1, 1, 1)
    x0, y0, x1, y1 = x0 * f[0], y0 * f[1], x1 * f[2], y1 * f[3]
    return [min(x0, x1), min(y0, y1), max(x0, x1), max(y0, y1)]


def guess_mode(box):
    """Which convention did the model actually use?"""
    mx = max(box)
    if mx <= 1.5:
        return "unit"
    if mx <= 1000.5:
        return "k1000"
    return "px"


def band_of(y, bands):
    for i, b in enumerate(bands, 1):
        if b["y0"] <= y <= b["y1"]:
            return i
    return None


def yiou(box, band):
    lo = max(box[1], band["y0"])
    hi = min(box[3], band["y1"])
    inter = max(0.0, hi - lo)
    union = (max(box[3], band["y1"]) - min(box[1], band["y0"]))
    return inter / union if union > 0 else 0.0


def grade(path):
    recs = [json.loads(l) for l in open(path)]
    rows = []
    for r in recs:
        txt = r["response"]
        bands = r["bands"]
        gt = r["error_line"]
        said = parse_line_no(txt)
        box = parse_box(txt)
        out = dict(id=r["id"], fmt=r["format"], rep=r["repeat"], gt=gt,
                   said=said, n_bands=len(bands), total=parse_total(txt),
                   raw_box=box, secs=r["seconds"])
        out["line_ok"] = (said == gt)
        if box:
            mode = guess_mode(box)
            sb = scale_box(box, r["w"], r["h"], mode)
            cy = (sb[1] + sb[3]) / 2.0
            out.update(mode=mode, box=[round(v) for v in sb],
                       cy=round(cy), hit_band=band_of(cy, bands))
            if isinstance(gt, int):
                gb = bands[gt - 1]
                out["box_on_gt"] = (gb["y0"] <= cy <= gb["y1"])
                out["iou_gt"] = round(yiou(sb, gb), 3)
            else:
                out["box_on_gt"] = None
                out["iou_gt"] = None
            if isinstance(said, int) and 1 <= said <= len(bands):
                cb = bands[said - 1]
                out["box_on_claimed"] = (cb["y0"] <= cy <= cb["y1"])
                out["iou_claimed"] = round(yiou(sb, cb), 3)
            else:
                out["box_on_claimed"] = None
                out["iou_claimed"] = None
            # how many GT lines does the box straddle?
            out["lines_spanned"] = sum(
                1 for b in bands if not (sb[3] < b["y0"] or sb[1] > b["y1"]))
        rows.append(out)
    return rows


def pct(n, d):
    return "n/a" if d == 0 else f"{n}/{d} ({100.0*n/d:.0f}%)"


def main():
    path = sys.argv[1]
    rows = grade(path)
    fmts = []
    for r in rows:
        if r["fmt"] not in fmts:
            fmts.append(r["fmt"])

    print("=" * 78)
    print("PER-FORMAT SUMMARY   (control image c11 has no error; excluded from"
          " box stats)")
    print("=" * 78)
    for f in fmts:
        rs = [r for r in rows if r["fmt"] == f]
        err = [r for r in rs if isinstance(r["gt"], int)]
        ctl = [r for r in rs if r["gt"] is None]
        boxed = [r for r in err if r.get("box")]
        print(f"\n### {f}   n={len(rs)}  median {sorted(r['secs'] for r in rs)[len(rs)//2]:.1f}s")
        print(f"  line index correct      : {pct(sum(1 for r in err if r['line_ok']), len(err))}")
        print(f"  control answered NONE   : {pct(sum(1 for r in ctl if r['said'] is None), len(ctl))}")
        if any(r.get("raw_box") for r in rs):
            print(f"  box parsed              : {pct(sum(1 for r in err if r.get('box')), len(err))}")
            modes = collections.Counter(r["mode"] for r in rs if r.get("mode"))
            print(f"  coord convention used   : {dict(modes)}")
            print(f"  box centre on GT line   : {pct(sum(1 for r in boxed if r['box_on_gt']), len(boxed))}")
            sc = [r for r in boxed if r["box_on_claimed"] is not None]
            print(f"  box centre on the line  : {pct(sum(1 for r in sc if r['box_on_claimed']), len(sc))}")
            print(f"     the model NAMED")
            ious = [r["iou_gt"] for r in boxed if r["iou_gt"] is not None]
            if ious:
                ious.sort()
                print(f"  y-IoU vs GT line        : median {ious[len(ious)//2]:.2f}"
                      f"  mean {sum(ious)/len(ious):.2f}")
            iouc = [r["iou_claimed"] for r in boxed if r["iou_claimed"] is not None]
            if iouc:
                iouc.sort()
                print(f"  y-IoU vs NAMED line     : median {iouc[len(iouc)//2]:.2f}"
                      f"  mean {sum(iouc)/len(iouc):.2f}")
            sp = collections.Counter(r["lines_spanned"] for r in boxed)
            print(f"  GT lines the box touches: {dict(sorted(sp.items()))}")
        tot = [r["total"] for r in rs if r["total"]]
        if tot:
            okc = sum(1 for r in rs if r["total"] and r["total"] == r["n_bands"])
            print(f"  TOTAL_LINES == segmenter: {pct(okc, len(tot))}")

    print("\n" + "=" * 78)
    print("VARIANCE ACROSS THE 3 REPEATS")
    print("=" * 78)
    for f in fmts:
        rs = [r for r in rows if r["fmt"] == f]
        byid = collections.defaultdict(list)
        for r in rs:
            byid[r["id"]].append(r)
        stable_line = sum(1 for v in byid.values()
                          if len({str(x["said"]) for x in v}) == 1)
        stable_band = sum(1 for v in byid.values()
                          if len({str(x.get("hit_band")) for x in v}) == 1)
        print(f"  {f:12s} same line index all 3x: {stable_line}/{len(byid)}"
              f"   same band hit all 3x: {stable_band}/{len(byid)}")

    print("\n" + "=" * 78)
    print("PER-CASE DETAIL")
    print("=" * 78)
    hdr = f"{'image':22s} {'fmt':12s} {'gt':>3s} {'said':>4s} {'band':>4s} {'onGT':>5s} {'onSaid':>6s} {'IoUgt':>6s} {'span':>4s} box"
    print(hdr)
    for r in rows:
        print(f"{r['id']:22s} {r['fmt']:12s} {str(r['gt']):>3s} "
              f"{str(r['said']):>4s} {str(r.get('hit_band')):>4s} "
              f"{str(r.get('box_on_gt')):>5s} {str(r.get('box_on_claimed')):>6s} "
              f"{str(r.get('iou_gt')):>6s} {str(r.get('lines_spanned')):>4s} "
              f"{r.get('raw_box')}")


if __name__ == "__main__":
    main()
