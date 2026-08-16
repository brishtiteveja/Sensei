#!/usr/bin/env python3
"""Emit samples/manifest.json from the sample kit.

The problem text lives in render_samples.py's EXAMPLES list; the rendered images
live under samples/<subject>/<band>/<topic>/. This walks both and produces one
JSON the frontend can read to surface the curated problems in Practice.

EXAMPLES is a pure literal, so we lift it out with `ast` rather than importing
the module (which would drag in Pillow). Answers are only in code comments, so
we take the final line of a `good_*` solution as the answer where one exists.

Run:  python3 scripts/build_samples_manifest.py
"""
from __future__ import annotations

import ast
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SAMPLES = ROOT / "samples"
RENDER = ROOT / "scripts" / "render_samples.py"

BASIC_LEVELS = {"easy", "medium", "hard"}


def load_examples() -> list[dict]:
    tree = ast.parse(RENDER.read_text())
    for node in tree.body:
        if isinstance(node, ast.Assign):
            target = node.targets[0]
            if isinstance(target, ast.Name) and target.id == "EXAMPLES":
                return ast.literal_eval(node.value)
    raise SystemExit("EXAMPLES not found in render_samples.py")


def humanize(slug: str) -> str:
    return slug.replace("_", " ").strip().capitalize()


def build() -> dict:
    problems = []
    for ex in load_examples():
        subject = ex["subject"]
        level = ex["level"]
        slug = ex["slug"]
        band = "basic" if level in BASIC_LEVELS else "advanced"
        # basic dirs are named by difficulty; advanced dirs by topic slug.
        leaf = level if band == "basic" else slug
        rel_dir = f"{subject}/{band}/{leaf}"
        abs_dir = SAMPLES / subject / band / leaf

        if not abs_dir.is_dir():
            print(f"  skip (no dir): {rel_dir}")
            continue

        def rel(p: Path) -> str:
            return str(p.relative_to(SAMPLES)).replace("\\", "/")

        ques = abs_dir / "ques.png"
        good = sorted(rel(p) for p in abs_dir.glob("good_*.png"))
        bad = sorted(rel(p) for p in abs_dir.glob("bad_*.png"))

        # Answer = last line of the first good solution, when the kit has one.
        answer = None
        for sol in ex.get("solutions", []):
            if sol["name"].startswith("good") and sol.get("work"):
                answer = sol["work"][-1]
                break

        problems.append(
            {
                "id": f"{subject}-{band}-{leaf}",
                "subject": subject,
                "band": band,
                "level": level,
                "slug": slug,
                "title": humanize(slug),
                "problem": "\n".join(ex["problem"]),
                "answer": answer,
                "dir": rel_dir,
                "images": {
                    "ques": rel(ques) if ques.exists() else None,
                    "good": good,
                    "bad": bad,
                },
                "solutions": ex.get("solutions", []),
            }
        )

    problems.sort(key=lambda p: (p["subject"], p["band"] != "basic", p["level"]))
    subjects = sorted({p["subject"] for p in problems})
    return {"version": 1, "subjects": subjects, "problems": problems}


def main() -> None:
    manifest = build()
    out = SAMPLES / "manifest.json"
    out.write_text(json.dumps(manifest, indent=2, ensure_ascii=True) + "\n")
    n = len(manifest["problems"])
    by_subject = {s: sum(1 for p in manifest["problems"] if p["subject"] == s) for s in manifest["subjects"]}
    print(f"wrote {out}  ({n} problems: {by_subject})")


if __name__ == "__main__":
    main()
