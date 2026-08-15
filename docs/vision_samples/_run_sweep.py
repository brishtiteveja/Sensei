#!/usr/bin/env python3
"""Run the handwriting-vision sweep against the DGX router.

  python3 _run_sweep.py --model qwen3-vl-30b-a3b-gguf --out ../vision_runs/base.jsonl
  python3 _run_sweep.py --only c07,c13 --prompt strict --preproc

Appends one JSON object per image to the output JSONL. Resumable: ids already
present in the output file are skipped.
"""
import argparse
import base64
import json
import os
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
BASE = os.environ.get("DGX_BASE",
                      "https://spark-e257.tail803c7f.ts.net:8443/v1")

SYSTEM_PROMPTS = {
    # Sensei's actual production prompt
    "sensei": """You are examining a photograph of a student's handwritten work.

Report, in this order:
1. TRANSCRIPTION -- what is actually written, line by line, as best you can read it.
2. FIRST_ERROR -- the line number where the first genuine mistake appears, or NONE.
3. WHY -- one sentence on what went wrong conceptually.

If the handwriting is ambiguous, say so in TRANSCRIPTION rather than guessing.""",

    # variant A: transcribe-then-check separation + explicit no-error permission
    # + explicit superscript/operator disambiguation instruction
    "strict": """You are examining a photograph of a student's handwritten work.

Work in two separate passes and do not mix them.

PASS 1 - TRANSCRIPTION. Copy out what is physically on the page, line by line,
numbered exactly as the student numbered them. Do not correct anything, do not
normalise notation, and do not skip a line because it looks wrong. Pay specific
attention to:
  - superscripts: a small raised digit is an exponent (x^2), NOT multiplication
  - signs: distinguish + from -, and note minus signs inside brackets
  - crossed-out work: mark it [struck out] and exclude it from the numbering
  - digits you are unsure of: write them as {a|b} listing both readings
If a line is genuinely unreadable, write [illegible] for that part. Guessing is
a worse failure than admitting you cannot read it.

PASS 2 - CHECK. Re-read only your own PASS 1 transcription. Going line by line
from the top, find the first line whose content does not follow correctly from
the line above it.

Then report:
1. TRANSCRIPTION -- from pass 1.
2. FIRST_ERROR -- the line number of the first genuine mistake, or NONE.
   NONE is a normal and expected answer; a lot of student work is correct.
   Only flag a line if you are confident the transcription of that line is right.
3. WHY -- one sentence on what went wrong conceptually.""",

    # variant B: sensei prompt + an explicit Bengali numeral key, to test
    # whether the Bengali-digit failure is perceptual or just a naming gap
    "bnkey": """You are examining a photograph of a student's handwritten work.

The work may use Bengali numerals. This is the key, memorise it before reading:
  ০ = 0    ১ = 1    ২ = 2    ৩ = 3    ৪ = 4
  ৫ = 5    ৬ = 6    ৭ = 7    ৮ = 8    ৯ = 9
Watch for the pairs that look alike: ৪ is 4 (not 8), ৮ is 8 (not 4),
৬ is 6 (not 9), ৯ is 9 (not 6), ৭ is 7 (not 9), ১ is 1 (not 5),
৫ is 5 (not 6), ০ is 0.

Report, in this order:
1. TRANSCRIPTION -- what is actually written, line by line, as best you can
   read it. Give each Bengali numeral in its ORIGINAL Bengali form followed by
   the Western digit in brackets, e.g. ৭(7).
2. FIRST_ERROR -- the line number where the first genuine mistake appears, or NONE.
3. WHY -- one sentence on what went wrong conceptually.

If the handwriting is ambiguous, say so in TRANSCRIPTION rather than guessing.""",
}


def b64(path):
    with open(path, "rb") as fh:
        return base64.b64encode(fh.read()).decode()


def mime(path):
    return "image/jpeg" if path.lower().endswith((".jpg", ".jpeg")) else "image/png"


def call(model, system, img_path, api_key, max_time=900, temperature=0.0):
    payload = {
        "model": model,
        "temperature": temperature,
        "max_tokens": 1200,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": [
                {"type": "image_url", "image_url": {
                    "url": f"data:{mime(img_path)};base64,{b64(img_path)}"}},
                {"type": "text",
                 "text": "Here is the photograph of the student's work."},
            ]},
        ],
    }
    tmp = "/tmp/_vlm_payload.json"
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
        return None, dt, f"curl rc={p.returncode} {p.stderr[:300]}"
    try:
        j = json.loads(p.stdout)
    except json.JSONDecodeError:
        return None, dt, f"nonjson: {p.stdout[:400]}"
    if "choices" not in j:
        return None, dt, f"apierr: {p.stdout[:400]}"
    return j["choices"][0]["message"]["content"], dt, j.get("usage")


def preprocess(src, dst):
    """Deskew + grayscale + autocontrast + gentle unsharp, the cheap pipeline
    a mobile client could run before upload."""
    import math

    from PIL import Image, ImageFilter, ImageOps
    im = Image.open(src).convert("L")
    # --- estimate skew by maximising row-ink variance over candidate angles
    small = im.resize((im.width // 3, im.height // 3))
    inv = ImageOps.invert(ImageOps.autocontrast(small))
    best, best_a = -1, 0.0
    for a in [x * 0.5 for x in range(-20, 21)]:
        r = inv.rotate(a, resample=Image.BILINEAR, fillcolor=0)
        px = r.load()
        rows = []
        for y in range(0, r.height):
            s = 0
            for x in range(0, r.width, 3):
                s += px[x, y]
            rows.append(s)
        mean = sum(rows) / len(rows)
        var = sum((v - mean) ** 2 for v in rows) / len(rows)
        if var > best:
            best, best_a = var, a
    im = im.rotate(best_a, resample=Image.BICUBIC, fillcolor=255, expand=True)
    # --- flatten uneven lighting: divide by a heavily blurred copy
    bg = im.filter(ImageFilter.GaussianBlur(im.width / 22))
    px, bp = im.load(), bg.load()
    out = Image.new("L", im.size)
    op = out.load()
    for y in range(im.height):
        for x in range(im.width):
            b = bp[x, y] or 1
            op[x, y] = min(255, int(px[x, y] * 255 / b))
    out = ImageOps.autocontrast(out, cutoff=1)
    out = out.filter(ImageFilter.UnsharpMask(radius=2, percent=110, threshold=3))
    # --- cap the long edge; oversized images just cost tokens
    if out.width > 1400:
        h = int(out.height * 1400 / out.width)
        out = out.resize((1400, h), Image.LANCZOS)
    out.convert("RGB").save(dst, "JPEG", quality=92)
    return best_a


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default="qwen3-vl-30b-a3b-gguf")
    ap.add_argument("--prompt", default="sensei", choices=list(SYSTEM_PROMPTS))
    ap.add_argument("--out", required=True)
    ap.add_argument("--only", default="")
    ap.add_argument("--preproc", action="store_true")
    a = ap.parse_args()

    key = os.environ["DGX_API_KEY"]
    man = json.load(open(os.path.join(HERE, "manifest.json")))
    if a.only:
        want = [s.strip() for s in a.only.split(",")]
        man = [m for m in man if any(m["id"].startswith(w) for w in want)]

    done = set()
    if os.path.exists(a.out):
        for ln in open(a.out):
            try:
                done.add(json.loads(ln)["id"])
            except Exception:
                pass

    ppdir = os.path.join(HERE, "_preproc")
    if a.preproc:
        os.makedirs(ppdir, exist_ok=True)

    for i, m in enumerate(man, 1):
        rid = m["id"] + ("+pp" if a.preproc else "") + \
              ("" if a.prompt == "sensei" else "+" + a.prompt)
        if rid in done:
            print(f"[{i}/{len(man)}] skip {rid}")
            continue
        src = os.path.join(HERE, m["file"])
        skew = None
        if a.preproc:
            dst = os.path.join(ppdir, m["id"] + "_pp.jpg")
            skew = preprocess(src, dst)
            src = dst
        txt, dt, usage = call(a.model, SYSTEM_PROMPTS[a.prompt], src, key)
        rec = dict(id=rid, image_id=m["id"], model=a.model, prompt=a.prompt,
                   preproc=a.preproc, deskew_deg=skew, seconds=round(dt, 1),
                   error_line=m["error_line"], truth=m["truth"],
                   gt_lines=m["lines"], script=m["script"],
                   conditions=m["conditions"], usage=usage, response=txt)
        with open(a.out, "a") as fh:
            fh.write(json.dumps(rec, ensure_ascii=False) + "\n")
        head = (txt or str(usage))[:90].replace("\n", " / ")
        print(f"[{i}/{len(man)}] {rid} {dt:.0f}s :: {head}", flush=True)


if __name__ == "__main__":
    main()
