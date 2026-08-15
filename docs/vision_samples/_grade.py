#!/usr/bin/env python3
"""Grade sweep JSONL against ground truth.

Per record:
  transcription_ok  - every ground-truth line recovered, in order, after
                      normalisation (Bengali digits count as read correctly if
                      rendered as the right Western digit)
  error_line_ok     - FIRST_ERROR equals the planted line (or NONE where the
                      work is genuinely correct)
  hedged            - the model said something was illegible/ambiguous/unsure
  hallucinated      - transcription is wrong AND the model did NOT hedge,
                      i.e. it confidently invented content

Usage: python3 _grade.py ../vision_runs/base_30b.jsonl [more.jsonl ...]
"""
import json
import re
import sys

BN = str.maketrans("০১২৩৪৫৬৭৮৯", "0123456789")

HEDGE = re.compile(
    r"illegible|ambiguous|unclear|cannot read|can't read|unreadable|"
    r"not certain|uncertain|hard to read|difficult to read|\{[0-9]\|[0-9]\}|"
    r"possibly|appears to be|unsure",
    re.I)


def norm(s):
    s = s.translate(BN)
    s = s.replace("²", "^2").replace("³", "^3")
    s = s.replace("×", "*").replace("x2", "*2")
    s = s.replace("÷", "/").replace("−", "-").replace("–", "-")
    s = re.sub(r"[ \t,]", "", s)
    s = s.lower()
    # a leading list marker of any flavour: "1)", "a)", "line 3:", "3."
    s = re.sub(r"^(line)?[0-9a-z]{1,3}[\).:]\s*", "", s)
    s = s.replace("(", "").replace(")", "")
    return s


def extract_section(txt, name):
    # the model varies the separator: newline, ':', '--', '—'
    m = re.search(rf"{name}\s*(?:--|—|:|\n)", txt, re.I)
    if not m:
        return ""
    rest = txt[m.end():]
    nxt = re.search(r"\n\s*\d?\s*[\).]?\s*(FIRST_ERROR|WHY|PASS 2)\b", rest)
    return rest[:nxt.start()] if nxt else rest


def parse_first_error(txt):
    sec = extract_section(txt, "FIRST_ERROR")
    if not sec:
        return "PARSE_FAIL"
    if re.search(r"\bnone\b", sec, re.I):
        return None
    m = re.search(r"(?:line\s*)?(\d+)", sec, re.I)
    if m:
        return int(m.group(1))
    # lettered line refs ("d") -> position in the alphabet
    m = re.search(r"^\s*([a-z])\s*$", sec.strip(), re.I)
    if m:
        return ord(m.group(1).lower()) - 96
    return "PARSE_FAIL"


def grade(rec):
    txt = rec.get("response") or ""
    tr = extract_section(txt, "TRANSCRIPTION")
    got = [norm(l) for l in tr.splitlines() if norm(l)]
    want = [norm(l) for l in rec["gt_lines"] if norm(l)]

    # every GT line must appear, in order, among the transcribed lines
    i, matched = 0, 0
    for g in got:
        if i < len(want) and (want[i] == g or want[i] in g):
            i += 1
            matched += 1
    tok = matched == len(want)

    fe = parse_first_error(txt)
    elok = (fe == rec["error_line"])
    hedged = bool(HEDGE.search(tr))
    return dict(transcription_ok=tok, first_error=fe, error_line_ok=elok,
                hedged=hedged, hallucinated=(not tok) and (not hedged),
                # right line AND actually read the page: the only outcome the
                # tutor can safely act on. right line off a wrong transcription
                # is a coin flip, not a capability.
                genuine=tok and elok,
                lines_matched=f"{matched}/{len(want)}")


def main():
    rows = []
    for path in sys.argv[1:]:
        for ln in open(path):
            r = json.loads(ln)
            g = grade(r)
            r.update(g)
            r["_src"] = path.split("/")[-1]
            rows.append(r)

    hdr = f"{'id':34} {'scr':6} {'tr':3} {'err':5} {'gt':4} {'ok':3} {'hedge':5} {'HALL':5} {'lines':6}"
    print(hdr)
    print("-" * len(hdr))
    for r in rows:
        print(f"{r['id']:34} {r['script'][:6]:6} "
              f"{'Y' if r['transcription_ok'] else 'n':3} "
              f"{str(r['first_error']):5} {str(r['error_line']):4} "
              f"{'Y' if r['error_line_ok'] else 'n':3} "
              f"{'Y' if r['hedged'] else '-':5} "
              f"{'YES' if r['hallucinated'] else '-':5} "
              f"{r['lines_matched']:6} {'OK' if r['genuine'] else '':3}")

    def pct(sel, key):
        s = [r for r in rows if sel(r)]
        return f"{sum(bool(r[key]) for r in s)}/{len(s)}" if s else "-"

    print()
    for label, sel in [
        ("ALL", lambda r: True),
        ("latin", lambda r: r["script"] == "latin"),
        ("bn_mixed (Bengali prose + Latin digits)",
         lambda r: r["script"] == "bn_mixed"),
        ("bn (Bengali numerals)", lambda r: r["script"] == "bn"),
    ]:
        print(f"{label:42} transcription {pct(sel,'transcription_ok'):>7}   "
              f"error_line {pct(sel,'error_line_ok'):>7}   "
              f"genuine {pct(sel,'genuine'):>7}   "
              f"hallucinated {pct(sel,'hallucinated'):>7}")


if __name__ == "__main__":
    main()
