#!/usr/bin/env python3
"""Can the VLM tell us *where* the wrong line is?

Four ways of asking, three repeats each, graded against line bands found
programmatically by demo/annotate.py.

  export DGX_API_KEY=$(jq -r .api_key /home/projects/8kEdu/data/.cloud_endpoint.json)
  python3 _run_coords.py --out ../vision_runs/coords_30b.jsonl --repeats 3

Resumable: (id, format, repeat) keys already in the output file are skipped.
"""
import argparse
import base64
import json
import os
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "demo"))
from annotate import find_line_bands, prepare          # noqa: E402

BASE = os.environ.get("DGX_BASE",
                      "https://spark-e257.tail803c7f.ts.net:8443/v1")
MODEL = "qwen3-vl-30b-a3b-gguf"
FRAMES = os.path.join(HERE, "_frames")

# a spread of conditions, Latin only (Bengali numerals are already known broken)
CASES = [
    "c01_hand_clean",        # clean handwriting
    "c02_hand_clean_indie",  # clean, different hand, only 3 lines
    "c04_hand_rot7_persp",   # 7 deg rotation + keystone
    "c05_hand_shadow",       # lighting gradient
    "c07_hand_phone_full",   # full phone stack
    "c08_hand_phone_full2",  # full phone stack, error on the LAST line
    "c09_exponent_clean",    # raised exponent
    "c11_correct_clean",     # CONTROL: no error at all
    "c19_messy_crossout",    # crossed-out margin work
    "c20_messy_phone",       # messy + cramped + phone stack
    "c21_cramped",           # cramped line spacing, error on the last line
]

PREAMBLE = """You are examining a photograph of a student's handwritten work.
The lines of working run down the page and are numbered from the top, starting
at 1."""

TAIL = """
Answer with nothing but those lines. If the work contains no mistake at all,
answer NONE for every field."""


def prompts(w, h):
    return {
        "norm_bbox": PREAMBLE + """

Report exactly these three lines and nothing else:

FIRST_ERROR: <the line number of the first genuine mistake, or NONE>
TEXT: <that line copied out exactly as written>
BOX: [x0,y0,x1,y1]

BOX is the bounding box of that incorrect line in the image, given as
fractions of the image size between 0 and 1: x0,x1 are fractions of the image
width, y0,y1 are fractions of the image height, (0,0) is the top-left corner
and (1,1) the bottom-right corner. Make the box tight around that one line.""" + TAIL,

        "pixel_bbox": PREAMBLE + f"""

This image is exactly {w} pixels wide and {h} pixels tall. (0,0) is the
top-left pixel, ({w},{h}) is the bottom-right pixel.

Report exactly these three lines and nothing else:

FIRST_ERROR: <the line number of the first genuine mistake, or NONE>
TEXT: <that line copied out exactly as written>
BOX: [x0,y0,x1,y1]

BOX is the bounding box of that incorrect line, in absolute pixel coordinates
of this image. Make the box tight around that one line.""" + TAIL,

        "line_index": PREAMBLE + """

Report exactly these three lines and nothing else:

TOTAL_LINES: <how many lines of working are written on the page>
FIRST_ERROR: <the line number of the first genuine mistake, counting from the
top of the page starting at 1, or NONE>
TEXT: <that line copied out exactly as written>""" + TAIL,

        # control: Sensei's actual production prompt, no coordinates asked for.
        # Separates "the box request degraded the reasoning" from "prepare()
        # degraded the image".
        "sensei_ctrl": """You are examining a photograph of a student's handwritten work.

Report, in this order:
1. TRANSCRIPTION -- what is actually written, line by line, as best you can read it.
2. FIRST_ERROR -- the line number where the first genuine mistake appears, or NONE.
3. WHY -- one sentence on what went wrong conceptually.

If the handwriting is ambiguous, say so in TRANSCRIPTION rather than guessing.""",

        # THE PROPOSAL: production prompt (which keeps the 97% detection rate)
        # plus a line count we can cross-check against the segmenter.
        "sensei_lines": """You are examining a photograph of a student's handwritten work.

Report, in this order:
1. TRANSCRIPTION -- what is actually written, line by line, as best you can read it.
2. TOTAL_LINES -- how many lines of working are written on the page.
3. FIRST_ERROR -- the line number where the first genuine mistake appears, or NONE.
4. WHY -- one sentence on what went wrong conceptually.

If the handwriting is ambiguous, say so in TRANSCRIPTION rather than guessing.""",

        "qwen_ground": PREAMBLE + """

Report exactly these three lines and nothing else:

FIRST_ERROR: <the line number of the first genuine mistake, or NONE>
TEXT: <that line copied out exactly as written>
BOX: <the location of that incorrect line, in your grounding format,
      e.g. <|box_start|>(x1,y1),(x2,y2)<|box_end|>>""" + TAIL,
    }


def b64(path):
    with open(path, "rb") as fh:
        return base64.b64encode(fh.read()).decode()


def call(system, img_path, api_key, max_time=900, temperature=0.0):
    payload = {
        "model": MODEL,
        "temperature": temperature,
        "max_tokens": 700,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": [
                {"type": "image_url", "image_url": {
                    "url": f"data:image/png;base64,{b64(img_path)}"}},
                {"type": "text",
                 "text": "Here is the photograph of the student's work."},
            ]},
        ],
    }
    tmp = "/tmp/_vlm_coords_payload.json"
    with open(tmp, "w") as fh:
        json.dump(payload, fh)
    t0 = time.time()
    p = subprocess.run(
        ["curl", "-s", "--max-time", str(max_time),
         "-H", f"Authorization: Bearer {api_key}",
         "-H", "Content-Type: application/json",
         "-X", "POST", f"{BASE}/chat/completions",
         "--data-binary", f"@{tmp}"],
        capture_output=True, text=True)
    dt = time.time() - t0
    if p.returncode != 0:
        return None, dt, f"curl rc={p.returncode}"
    try:
        j = json.loads(p.stdout)
    except json.JSONDecodeError:
        return None, dt, f"nonjson: {p.stdout[:300]}"
    if "choices" not in j:
        return None, dt, f"apierr: {p.stdout[:300]}"
    return j["choices"][0]["message"]["content"], dt, j.get("usage")


def build_frames():
    """prepare() every case once, and record the ground-truth line bands.

    The model must be shown exactly the frame the boxes are graded in.
    """
    os.makedirs(FRAMES, exist_ok=True)
    man = {m["id"]: m for m in
           json.load(open(os.path.join(HERE, "manifest.json")))}
    meta = {}
    for cid in CASES:
        m = man[cid]
        dst = os.path.join(FRAMES, cid + ".png")
        im, info = prepare(os.path.join(HERE, m["file"]))
        im.save(dst)
        bands = find_line_bands(im, do_deskew=False)
        meta[cid] = dict(file=dst, w=im.width, h=im.height, bands=bands,
                         n_lines=len(m["lines"]), gt_lines=m["lines"],
                         error_line=m["error_line"], truth=m["truth"],
                         skew=info["skew"])
    with open(os.path.join(FRAMES, "frames.json"), "w") as fh:
        json.dump(meta, fh, indent=1)
    return meta


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--repeats", type=int, default=3)
    ap.add_argument("--formats", default="norm_bbox,pixel_bbox,line_index,qwen_ground,sensei_ctrl")
    a = ap.parse_args()

    key = os.environ["DGX_API_KEY"]
    meta = build_frames()
    fmts = a.formats.split(",")

    done = set()
    if os.path.exists(a.out):
        for ln in open(a.out):
            try:
                r = json.loads(ln)
                done.add((r["id"], r["format"], r["repeat"]))
            except Exception:
                pass

    jobs = [(cid, f, k) for cid in CASES for f in fmts
            for k in range(a.repeats)]
    for i, (cid, fmt, k) in enumerate(jobs, 1):
        if (cid, fmt, k) in done:
            continue
        mm = meta[cid]
        sysmsg = prompts(mm["w"], mm["h"])[fmt]
        txt, dt, usage = call(sysmsg, mm["file"], key)
        rec = dict(id=cid, format=fmt, repeat=k, model=MODEL,
                   w=mm["w"], h=mm["h"], bands=mm["bands"],
                   error_line=mm["error_line"], n_lines=mm["n_lines"],
                   seconds=round(dt, 1), usage=usage, response=txt)
        with open(a.out, "a") as fh:
            fh.write(json.dumps(rec, ensure_ascii=False) + "\n")
        head = (txt or str(usage))[:80].replace("\n", " | ")
        print(f"[{i}/{len(jobs)}] {cid} {fmt} r{k} {dt:.0f}s :: {head}",
              flush=True)


if __name__ == "__main__":
    main()
