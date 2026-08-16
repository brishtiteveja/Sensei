#!/usr/bin/env python3
"""Download a curated subset of the NoTeS-Bank handwritten-notes dataset.

Source: NoTeS-Bank/ICDAR_2025_Handwritten_Notes_Understanding_Challenge
  1,943 real handwritten academic note pages, 28 class labels, Apache-2.0.
  https://huggingface.co/datasets/NoTeS-Bank/ICDAR_2025_Handwritten_Notes_Understanding_Challenge

Why a subset: the full set is 731 MB and two thirds of it is computer-science
notes (DBMS, operating systems, compilers) that a science tutor has no use for.
We take the physics / chemistry / biology / maths classes only, a few pages
each — enough to prove the vision pipeline reads real student handwriting, small
enough to ship in the repo.

Why it matters: every other image in this app is our own synthetic rendering.
This is an independent, publicly published benchmark with ground-truth labels,
so "Sensei can read handwriting" becomes something a judge can check rather
than something we assert.

The HF rows/filter API hands back signed asset URLs that expire within the hour,
so the images are downloaded immediately rather than linked.

Run:  python3 scripts/fetch_notesbank.py [--per-class 3]
"""
from __future__ import annotations

import argparse
import json
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "datasets" / "notesbank"
DATASET = "NoTeS-Bank/ICDAR_2025_Handwritten_Notes_Understanding_Challenge"
API = "https://datasets-server.huggingface.co"

# Label index -> (subject we file it under, human title). Only the classes a
# science tutor would ever be handed; the CS/EE classes are deliberately absent.
CLASSES: dict[int, tuple[str, str]] = {
    0: ("chemistry", "Acid-base chemistry"),
    2: ("biology", "Biology, chapter 5"),
    3: ("biology", "Biotechnology"),
    6: ("physics", "Rotational motion"),
    13: ("math", "Differential equations"),
    16: ("physics", "Electromagnetic theory"),
    17: ("physics", "Fluid mechanics"),
    18: ("physics", "Friction"),
    19: ("math", "Group theory"),
    21: ("biology", "Microbes in human welfare"),
    24: ("biology", "Sexual reproduction in flowering plants"),
    26: ("biology", "Biology, chapter 1"),
    27: ("math", "Differential geometry"),
}


def get_json(url: str) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": "sensei-fetch/1.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--per-class", type=int, default=3)
    args = ap.parse_args()

    OUT.mkdir(parents=True, exist_ok=True)
    entries = []

    for label, (subject, title) in CLASSES.items():
        where = urllib.parse.quote(f'"label"={label}')
        url = (
            f"{API}/filter?dataset={urllib.parse.quote(DATASET)}"
            f"&config=default&split=train&where={where}&limit={args.per_class}"
        )
        try:
            data = get_json(url)
        except Exception as e:
            print(f"  ! label {label} ({title}): {e}")
            continue

        for i, row in enumerate(data.get("rows", [])[: args.per_class]):
            src = (row.get("row", {}).get("image") or {}).get("src")
            if not src:
                continue
            name = f"{subject}_{label:02d}_{i}.jpg"
            dest = OUT / name
            if dest.exists():
                print(f"  = {name}")
            else:
                try:
                    req = urllib.request.Request(
                        src, headers={"User-Agent": "sensei-fetch/1.0"}
                    )
                    with urllib.request.urlopen(req, timeout=120) as r:
                        dest.write_bytes(r.read())
                    print(f"  + {name}  ({dest.stat().st_size // 1024} KB)")
                except Exception as e:
                    print(f"  ! {name}: {e}")
                    continue
                time.sleep(0.2)  # be polite to the assets host

            entries.append(
                {
                    "id": dest.stem,
                    "file": name,
                    "label": label,
                    "subject": subject,
                    "title": title,
                }
            )

    manifest = {
        "dataset": DATASET,
        "source": f"https://huggingface.co/datasets/{DATASET}",
        "license": "Apache-2.0",
        "note": (
            "Curated science subset of a public handwritten-notes benchmark. "
            "Ground-truth `title` is the dataset's own class label, so a model's "
            "reading of each page can be checked against it."
        ),
        "count": len(entries),
        "items": sorted(entries, key=lambda e: (e["subject"], e["title"], e["file"])),
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")

    total_kb = sum((OUT / e["file"]).stat().st_size for e in entries) // 1024
    print(f"\nwrote {OUT}/manifest.json — {len(entries)} pages, {total_kb} KB")


if __name__ == "__main__":
    main()
