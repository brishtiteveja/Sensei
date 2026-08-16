"""Two-stage read of a student's page: what is wrong, then where it is.

    stage 1  the pinned tutor model  -> which line, is the figure wrong, one question
    stage 2  LocateAnything          -> pixel box for that line

Split because no single model is good at both. Reasoning variants find the wrong line
far better than instruct ones (8/8 vs 2/8 on the sample kit) and are *worse* at boxes;
the grounding model is the reverse. See `locate.py` for the numbers.

Stage 1 gets the image at its native aspect ratio. Squaring it improves box coordinates
from a general VLM but measurably degrades reading -- it turned a correct "no wrong line,
two solutions missing" into a wrong line flag. Since stage 2 no longer needs the square
trick, nothing wants a distorted image any more.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field

from sensei.llm import LLM, image_message
from .locate import Box, Locator
from .prompts import DIAGNOSIS_JSON


@dataclass
class Line:
    text: str
    ok: bool = True
    unclear: bool = False
    """The model could not read this line confidently.

    Teaching off an unclear line is how you end up correcting a student for something
    they never wrote -- ask them to re-photograph instead.
    """


@dataclass
class Diagnosis:
    """What the model saw. `first_error_line` is 1-based into `lines`, or None."""

    lines: list[Line] = field(default_factory=list)
    first_error_line: int | None = None
    figure_ok: bool | None = None
    figure_problem: str = ""
    answer_complete: bool = True
    missing: str = ""
    socratic_question: str = ""
    box: Box | None = None
    raw: str = ""
    parsed: bool = True
    """False when the reply held no usable JSON.

    Load-bearing. Without it an unparseable reply defaults to "no error found", so a
    broken response and a flawless solution are indistinguishable -- and the tutor would
    congratulate a student on work it never actually read.
    """

    @property
    def flagged_text(self) -> str:
        """The transcription of the line the model faulted, or ''.

        Prefer this over the index everywhere. Models routinely count the printed problem
        statement as line 1 despite being told not to, so the integer is off by one often
        enough that content is the only stable handle -- and it is what stage 2 needs.
        """
        n = self.first_error_line
        if n and 1 <= n <= len(self.lines):
            return self.lines[n - 1].text
        return ""

    @property
    def flagged_is_unclear(self) -> bool:
        """The line we are about to correct is one the model could not read.

        Check this before teaching. The right move is to ask for a clearer photo, not to
        correct a transcription that may be invented.
        """
        n = self.first_error_line
        return bool(n and 1 <= n <= len(self.lines) and self.lines[n - 1].unclear)

    @property
    def is_clean(self) -> bool:
        """Nothing to correct: no bad line, no bad drawing, nothing left out.

        Requires a successful parse. "We could not read the reply" is not "the work is
        correct", and only one of those is safe to tell a student.
        """
        return (
            self.parsed
            and self.first_error_line is None
            and self.figure_ok is not False
            and self.answer_complete
        )


def _extract_json(text: str) -> dict | None:
    """Pull the JSON object out of a reply, fence or thinking block or neither."""
    text = re.sub(r"<think>.*?</think>", "", text or "", flags=re.S)
    m = re.search(r"\{.*\}", text, re.S)
    if not m:
        return None
    try:
        return json.loads(m.group(0))
    except json.JSONDecodeError:
        return None


def parse_diagnosis(raw: str) -> Diagnosis:
    d = _extract_json(raw)
    if d is None:
        return Diagnosis(raw=raw, parsed=False)

    got = d.get("first_error_line")
    if not isinstance(got, int) or got <= 0:
        got = None

    entries = d.get("lines")
    lines = [
        Line(
            text=str(e.get("text", "")),
            ok=bool(e.get("ok", True)),
            unclear=bool(e.get("unclear", False)),
        )
        for e in entries
        if isinstance(e, dict)
    ] if isinstance(entries, list) else []

    return Diagnosis(
        lines=lines,
        first_error_line=got,
        figure_ok=d.get("figure_ok") if isinstance(d.get("figure_ok"), bool) else None,
        figure_problem=str(d.get("figure_problem") or ""),
        answer_complete=bool(d.get("answer_complete", True)),
        missing=str(d.get("missing") or ""),
        socratic_question=str(d.get("socratic_question") or "").strip(),
        raw=raw,
    )


async def read_page(
    llm: LLM,
    image_bytes: bytes,
    *,
    problem: str | None = None,
    mime: str = "image/png",
    locator: Locator | None = None,
    max_tokens: int = 4000,
) -> Diagnosis:
    """Full read: diagnose, then box the faulted line if there is one.

    `max_tokens` defaults high on purpose. Reasoning models emit their chain of thought
    inline before the JSON, and a ceiling that truncates it looks exactly like the model
    failing to find the error -- it cost a whole benchmark run before it was spotted.
    Observed usage on the sample kit peaks around 2300 tokens.
    """
    prompt = DIAGNOSIS_JSON
    if problem:
        prompt += f"\n\nThe problem the student was set: {problem}"

    raw = await llm.complete(
        [image_message(prompt, image_bytes, mime)],
        max_tokens=max_tokens,
        temperature=0,  # transcription and grounding are not places for sampling
    )
    diagnosis = parse_diagnosis(raw)

    if locator and diagnosis.flagged_text:
        try:
            diagnosis.box = await locator.find_line(
                image_bytes, diagnosis.flagged_text, mime=mime
            )
        except Exception:
            # A missing box must never cost us the diagnosis; the tutor can still quote
            # the line as text, which was the documented fallback before this existed.
            diagnosis.box = None

    return diagnosis
