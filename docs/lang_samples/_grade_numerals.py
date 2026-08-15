#!/usr/bin/env python3
"""Grade the multilingual numeral-OCR run.

Normalises every native numeral to its Latin equivalent (so reading `২` as `2`
counts as correct -- same convention as VISION_FINDINGS.md), then compares the
extracted digit sequence to ground truth.

  python3 _grade_numerals.py [../lang_runs/numerals.jsonl]
"""
import json, os, re, sys, collections, difflib

HERE = os.path.dirname(os.path.abspath(__file__))

NATIVE = {
    "০১২৩৪৫৬৭৮৯": "bengali",
    "०१२३४५६७८९": "devanagari",
    "٠١٢٣٤٥٦٧٨٩": "arabic-indic",
}
XLAT = {}
for row in NATIVE:
    for i, ch in enumerate(row):
        XLAT[ch] = str(i)


def norm(s):
    return "".join(XLAT.get(c, c) for c in s)


def digits(s):
    return re.sub(r"\D", "", norm(s))


def transcription_of(text, prompt):
    """Pull just the transcription section out of a sensei-format reply."""
    if prompt != "sensei":
        return text
    t = text
    m = re.search(r"TRANSCRIPTION\s*[-:]*\s*(.*?)(?=\n\s*\**\s*2\.|FIRST_ERROR)",
                  t, re.S)
    return m.group(1) if m else t


def first_error_of(text):
    m = re.search(r"FIRST_ERROR\s*[-:]*\s*\**\s*(?:Line\s*)?(\d+|NONE|None|none)", text)
    return m.group(1) if m else "?"


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
        HERE, "..", "lang_runs", "numerals.jsonl")
    rows = [json.loads(l) for l in open(path)]
    # Ground truth is re-read from the manifest rather than trusted from the
    # embedded copy in each record, so a ground-truth fix does not require
    # re-running inference.
    man = json.load(open(os.path.join(HERE, "images", "manifest.json")))
    for r in rows:
        r.update({k: v for k, v in man.get(r["image"], {}).items()
                  if k.startswith("gt")})
    by = collections.defaultdict(list)
    for r in rows:
        by[(r["image"], r["prompt"])].append(r)

    print(f"{'image':34} {'prompt':7} {'digit acc':>10}  reads")
    print("-" * 110)
    summary = collections.defaultdict(lambda: collections.defaultdict(list))
    for (img, prompt), rs in sorted(by.items()):
        meta = rs[0]
        gt = meta.get("gt_digits", "")
        accs, reads = [], []
        for r in rs:
            if "text" not in r:
                continue
            tr = transcription_of(r["text"], prompt)
            got = digits(tr)
            # Alignment-based score. A dropped digit should cost one digit,
            # not desynchronise every position after it (the Arabic zero is a
            # bare dot and gets dropped, which a positional compare would
            # score as 9 errors instead of 1).
            sm = difflib.SequenceMatcher(None, gt, got, autojunk=False)
            matched = sum(b.size for b in sm.get_matching_blocks())
            acc = matched / max(len(gt), len(got)) if gt else 0
            accs.append(acc)
            reads.append(got)
        if not accs:
            continue
        mean = sum(accs) / len(accs)
        lang = meta["lang"]
        summary[lang][prompt].append((meta["kind"], mean))
        uniq = sorted(set(reads))
        print(f"{img:34} {prompt:7} {mean*100:9.0f}%  gt={gt} got={uniq}")

    print()
    print("Per-language mean digit accuracy")
    print(f"{'lang':12} {'script':14} {'chart':>8} {'equation':>9} {'work':>8}")
    print("-" * 60)
    scripts = {"hindi": "Devanagari", "arabic": "Arabic-Indic",
               "bengali": "Bengali", "indonesian": "Latin",
               "swahili": "Latin", "spanish": "Latin"}
    for lang in sorted(summary):
        cell = {}
        for kind in ("chart", "equation", "work"):
            vals = [m for p in summary[lang] for (k, m) in summary[lang][p]
                    if k == kind and p == "plain"]
            cell[kind] = f"{sum(vals)/len(vals)*100:.0f}%" if vals else "-"
        print(f"{lang:12} {scripts.get(lang,''):14} {cell['chart']:>8} "
              f"{cell['equation']:>9} {cell['work']:>8}")

    print()
    print("FIRST_ERROR behaviour (sensei prompt). Charts contain no arithmetic,")
    print("so anything other than NONE is an invented error.")
    for r in rows:
        if r["prompt"] == "sensei" and "text" in r:
            fe = first_error_of(r["text"])
            if r["kind"] in ("chart", "equation"):
                exp, flag = "NONE", ("ok" if fe == "NONE" else "INVENTED")
            else:
                # header line makes both 3 and 4 defensible numberings
                exp, flag = "3 or 4", ("ok" if fe in ("3", "4") else "MISSED/WRONG")
            print(f"  {r['image']:34} said={fe:5} expected={exp:5} {flag}")


if __name__ == "__main__":
    main()
