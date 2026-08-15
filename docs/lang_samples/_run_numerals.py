#!/usr/bin/env python3
"""Run the multilingual numeral-OCR probe against the DGX router.

  python3 _run_numerals.py --out ../lang_runs/numerals.jsonl

Two prompts per image:
  plain  -- bare transcription; the fairest measure of glyph perception (x3,
            because the model is not deterministic at temperature 0)
  sensei -- Sensei's production prompt, for comparability with VISION_FINDINGS
Resumable on (image, prompt, rep).
"""
import argparse, base64, json, os, subprocess, time

HERE = os.path.dirname(os.path.abspath(__file__))
IMG = os.path.join(HERE, "images")
BASE = os.environ.get("DGX_BASE", "https://spark-e257.tail803c7f.ts.net:8443/v1")
KEY = os.environ.get("DGX_API_KEY", "")
MODEL = "qwen3-vl-30b-a3b-gguf"

PROMPTS = {
    "plain": "Transcribe every character in this image exactly, left to right, "
             "in order. Output only the transcription, nothing else.",
    # Copying a glyph string is not the same as knowing its value. Any
    # downstream arithmetic needs the value, so this asks for the conversion
    # explicitly -- it is the capability the tutor actually depends on.
    "tolatin": "Read the numbers in this image and write them using ordinary "
               "Western Arabic numerals (0 1 2 3 4 5 6 7 8 9). Output only the "
               "numbers, one line per line of the image, nothing else.",
    "sensei": """You are examining a photograph of a student's handwritten work.

Report, in this order:
1. TRANSCRIPTION -- what is actually written, line by line, as best you can read it.
2. FIRST_ERROR -- the line number where the first genuine mistake appears, or NONE.
3. WHY -- one sentence on what went wrong conceptually.

If the handwriting is ambiguous, say so in TRANSCRIPTION rather than guessing.""",
}


def call(img_path, prompt, max_tokens=600):
    with open(img_path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode()
    payload = {
        "model": MODEL,
        "temperature": 0,
        "max_tokens": max_tokens,
        "messages": [{"role": "user", "content": [
            {"type": "image_url",
             "image_url": {"url": f"data:image/png;base64,{b64}"}},
            {"type": "text", "text": prompt},
        ]}],
    }
    p = os.path.join(HERE, "_payload_img.json")
    with open(p, "w") as f:
        json.dump(payload, f)
    t0 = time.time()
    r = subprocess.run(
        ["curl", "-sS", "--max-time", "900", f"{BASE}/chat/completions",
         "-H", "Content-Type: application/json",
         "-H", f"Authorization: Bearer {KEY}",
         "--data-binary", f"@{p}"],
        capture_output=True, text=True)
    dt = time.time() - t0
    try:
        j = json.loads(r.stdout)
        txt = j["choices"][0]["message"]["content"]
    except Exception:
        return {"error": (r.stdout or r.stderr)[:1500], "elapsed": round(dt, 2)}
    u = j.get("usage", {})
    return {"text": txt, "elapsed": round(dt, 2),
            "prompt_tokens": u.get("prompt_tokens"),
            "completion_tokens": u.get("completion_tokens")}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=os.path.join(HERE, "..", "lang_runs", "numerals.jsonl"))
    ap.add_argument("--only", default="")
    ap.add_argument("--reps", type=int, default=3)
    a = ap.parse_args()
    out = os.path.abspath(a.out)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    man = json.load(open(os.path.join(IMG, "manifest.json")))
    done = set()
    if os.path.exists(out):
        for line in open(out):
            try:
                d = json.loads(line)
                done.add((d["image"], d["prompt"], d["rep"]))
            except Exception:
                pass
    keys = sorted(man)
    if a.only:
        want = a.only.split(",")
        keys = [k for k in keys if any(w in k for w in want)]
    fh = open(out, "a")
    for k in keys:
        meta = man[k]
        path = os.path.join(IMG, k + ".png")
        jobs = [("plain", r) for r in range(a.reps)] + [("sensei", 0)]
        if os.environ.get("TOLATIN"):
            jobs = [("tolatin", r) for r in range(a.reps)]
        for pname, rep in jobs:
            if (k, pname, rep) in done:
                continue
            res = call(path, PROMPTS[pname])
            rec = {"image": k, "prompt": pname, "rep": rep, **meta, **res}
            fh.write(json.dumps(rec, ensure_ascii=False) + "\n")
            fh.flush()
            print(f"[{k} {pname}#{rep}] {res.get('elapsed')}s :: "
                  f"{(res.get('text') or res.get('error',''))[:110]!r}")
    fh.close()


if __name__ == "__main__":
    main()
