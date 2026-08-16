# /// script
# requires-python = ">=3.11"
# dependencies = ["openai>=1.0", "pillow>=10.0"]
# ///
"""Ask the pinned Qwen3-VL to find the first wrong line AND where it is on the page.

    uv run scripts/locate_error.py samples/math/area_between_curves/bad_1.png
    uv run scripts/locate_error.py <image> --all-boxes -o out.png

This is the "annotated photo" beat in docs/PLAN_WIN.md section 4: a box drawn on the
exact wrong line of the student's own handwriting. Two things make it work.

1. Qwen3-VL grounds natively in `bbox_2d`, normalised 0-1000 over the whole image.
   Asking for pixels instead gets you plausible-looking garbage; asking in the model's
   own coordinate convention is the whole trick.
2. Grounding is emitted BEFORE the verdict. The model transcribes and locates every line
   first, then decides which one is wrong. Reversed, the reasoning conditions the
   perception and the boxes drift.

Runs on the same single pinned model as everything else. Requesting a different id would
trigger a 1-5 minute cold swap on this very call -- see backend/sensei/config.py.
"""

import argparse
import base64
import io
import json
import os
import re
import sys
import time
from pathlib import Path

from openai import OpenAI
from PIL import Image, ImageDraw, ImageFont

PROMPT = """You are looking at a photograph of a student's handwritten solution.

Return ONLY a JSON object, with no prose and no markdown fence:

{
  "lines": [{"bbox_2d": [x1, y1, x2, y2], "text": "<exact transcription of this line>"}],
  "first_error_line": <1-based index into "lines", or null>,
  "why": "<one short sentence>"
}

Rules:
- "lines" covers ONLY the student's handwritten working. Ignore the printed problem
  statement at the top of the page.
- bbox_2d is [left, top, right, bottom], normalised to 0-1000 over the whole image.
- Transcribe exactly what is written, including wrong values. Never correct it.
- "first_error_line" is the first line that is mathematically wrong. Use null only if
  every line is correct AND the answer is complete.
- If the written lines are each correct but the final answer is missing cases or
  solutions, set "first_error_line" to null and say so in "why"."""

# The prompt above presupposes an error, and the model obliges: on first contact it
# invented faults in fully correct work and blamed a line it had itself transcribed as
# doing the very check it claimed was missing. This one forces a per-line verdict BEFORE
# any global one, and makes "correct" the expected answer rather than the exception.
CHECK_PROMPT = """You are checking a student's handwritten solution. Most student work is
correct. Your job is to verify it honestly, not to find fault.

Work in this order and return ONLY a JSON object, no prose and no markdown fence:

1. Transcribe and locate every handwritten working line. Ignore the printed problem
   statement at the top of the page.
2. For EACH line in turn, decide independently whether that line follows correctly from
   the line above it. Judge the line as written. If it is correct, say so.
3. Only after step 2, name the first line you marked incorrect.
4. Separately, decide whether the final answer is COMPLETE: does it give every value the
   question asked for? An equation over a range can have more solutions than the student
   listed, even when every line they wrote is true.

{
  "lines": [
    {"bbox_2d": [x1, y1, x2, y2], "text": "<exact transcription>",
     "ok": true or false, "check": "<one short sentence justifying ok>"}
  ],
  "first_error_line": <1-based index of the first line with "ok": false, or null>,
  "answer_complete": true or false,
  "missing": "<what the answer leaves out, or empty string>",
  "why": "<one short sentence>"
}

bbox_2d is [left, top, right, bottom], normalised to 0-1000 over the whole image.
Transcribe exactly what is written, including wrong values. Never silently correct it.
If every line is correct, "first_error_line" MUST be null."""

GROUND_PROMPT = """Find this exact handwritten line in the image:

"{line}"

Return ONLY {{"bbox_2d": [x1, y1, x2, y2]}} for that ONE line, normalised 0-1000 over the
whole image. Box the handwriting tightly: no neighbouring lines, no surrounding space."""


# Stretch to a square before sending. Measured on samples/math/area_between_curves/bad_1
# against ink rows read out of the PNG: sending the native 1200x917 drifts from -12px on
# line 1 to -44px on line 8, nearly a full 74px line pitch, so the box lands on the wrong
# line near the bottom of the page. Squaring flattens that to within 6px with no drift.
# Distort, do not pad: bbox_2d is relative to 0-1000, so a squared coordinate maps
# straight back onto the original image and needs no un-distorting.
# 1216 is where accuracy plateaus here; 1408 and 1536 measured the same, 1024 was worse.
SQUARE_SIDE = 1216


def encode(path: Path, *, square: bool) -> tuple[str, Image.Image]:
    """Return (base64 of what we send, the ORIGINAL image we draw on)."""
    img = Image.open(path).convert("RGB")
    to_send = img.resize((SQUARE_SIDE, SQUARE_SIDE), Image.LANCZOS) if square else img
    buf = io.BytesIO()
    to_send.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode(), img


def extract_json(text: str) -> dict:
    """Pull the JSON object out of the reply, fence or no fence."""
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise SystemExit(f"no JSON object in reply:\n{text}")
    return json.loads(match.group(0))


def to_pixels(bbox, width: int, height: int) -> list[float]:
    x1, y1, x2, y2 = bbox
    return [x1 / 1000 * width, y1 / 1000 * height, x2 / 1000 * width, y2 / 1000 * height]


def annotate(img: Image.Image, result: dict, bbox, *, all_boxes: bool) -> Image.Image:
    img = img.convert("RGBA")
    width, height = img.size
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)

    lines = result.get("lines") or []
    error_index = result.get("first_error_line")

    if all_boxes:
        for i, line in enumerate(lines, start=1):
            if i == error_index or not line.get("bbox_2d"):
                continue
            od.rectangle(to_pixels(line["bbox_2d"], width, height),
                         outline=(120, 140, 170, 150), width=2)

    if bbox:
        box = to_pixels(bbox, width, height)
        od.rounded_rectangle(box, radius=10, fill=(220, 40, 40, 30))
        od.rounded_rectangle(box, radius=10, outline=(214, 40, 40, 255), width=5)

    out = Image.alpha_composite(img, overlay).convert("RGB")

    if not error_index:
        # No box to draw. Say so on the image rather than returning a clean-looking
        # page, which is exactly how a missed error sneaks through on camera.
        draw = ImageDraw.Draw(out)
        try:
            font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 26)
        except OSError:
            font = ImageFont.load_default()
        draw.rectangle([0, 0, width, 44], fill=(214, 40, 40))
        draw.text((14, 8), "model reported NO error in this work", fill="white", font=font)
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("image", type=Path)
    ap.add_argument("-o", "--out", type=Path, help="annotated output (default: <image>.boxed.png)")
    ap.add_argument("--all-boxes", action="store_true", help="also outline every other line")
    ap.add_argument("--check", action="store_true",
                    help="per-line verification prompt (fewer invented errors)")
    ap.add_argument("--no-square", action="store_true",
                    help="send the native aspect ratio (worse boxes, see SQUARE_SIDE)")
    ap.add_argument("--max-tokens", type=int, default=1500)
    args = ap.parse_args()

    base_url = os.environ.get("SENSEI_BASE_URL", "http://localhost:8010/v1").rstrip("/")
    api_key = os.environ.get("SENSEI_API_KEY", "")
    model = os.environ.get("SENSEI_MODEL", "qwen3-vl-30b-a3b-gguf")
    if not api_key:
        sys.exit("SENSEI_API_KEY is not set. It lives in models/router-api-key.txt on the box.")

    client = OpenAI(api_key=api_key, base_url=base_url, timeout=900)

    def ask(b64: str, prompt: str, max_tokens: int) -> tuple[dict, float, object]:
        t0 = time.perf_counter()
        reply = client.chat.completions.create(
            model=model,
            messages=[{
                "role": "user",
                "content": [
                    {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}},
                    {"type": "text", "text": prompt},
                ],
            }],
            temperature=0,  # grounding is not a place for sampling
            max_tokens=max_tokens,
            response_format={"type": "json_object"},
        )
        return (extract_json(reply.choices[0].message.content),
                time.perf_counter() - t0, reply.usage)

    # Call 1, VERDICT, native aspect ratio. Squaring measurably degrades the reading:
    # it turned a correct "no error, two solutions missing" into a wrong line flag.
    native_b64, img = encode(args.image, square=False)
    result, elapsed, usage = ask(native_b64, CHECK_PROMPT if args.check else PROMPT,
                                 args.max_tokens)
    reply_usage = usage

    lines = result.get("lines") or []
    error_index = result.get("first_error_line")
    print(f"image      {args.image}  ({img.width}x{img.height})")
    print(f"model      {model}")
    print(f"verdict    {elapsed:.1f}s", end="")
    if reply_usage:
        rate = reply_usage.completion_tokens / elapsed if elapsed else 0
        print(f"   prompt {reply_usage.prompt_tokens}, completion "
              f"{reply_usage.completion_tokens} ({rate:.1f} tok/s)")
    else:
        print()
    print()
    for i, line in enumerate(lines, start=1):
        mark = ">>" if i == error_index else "  "
        ok = line.get("ok")
        flag = "" if ok is None else ("  [ok]" if ok else "  [BAD]")
        print(f"{mark} {i}. {line.get('text', '')!r}{flag}")
    print()
    print(f"first_error_line: {error_index}")
    if "answer_complete" in result:
        print(f"answer_complete:  {result['answer_complete']}   missing: {result.get('missing')!r}")
    print(f"why: {result.get('why')}")

    # Call 2, GROUNDING, squared image. Only the one flagged line, quoted back. Asking
    # for a list of boxes makes the error accumulate down the page; asking for one does
    # not. Squaring removes the y-drift. bbox_2d is relative, so it maps straight back
    # onto the unsquared original with no un-distorting.
    bbox = None
    if error_index and 1 <= error_index <= len(lines):
        target = lines[error_index - 1].get("text", "")
        square_b64, _ = encode(args.image, square=not args.no_square)
        try:
            ground, g_elapsed, _ = ask(square_b64, GROUND_PROMPT.format(line=target), 200)
            bbox = ground.get("bbox_2d")
            print(f"\ngrounding  {g_elapsed:.1f}s   bbox_2d {bbox}")
        except Exception as exc:  # a missing box must not lose the verdict
            print(f"\ngrounding failed ({exc}); annotating without a box")

    out_path = args.out or args.image.with_suffix(".boxed.png")
    annotate(img, result, bbox, all_boxes=args.all_boxes).save(out_path)
    print(f"wrote {out_path}")


if __name__ == "__main__":
    main()
