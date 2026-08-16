"""Prompts for reading a student's page.

These replace the free-text report in ``sensei.tutor.DIAGNOSIS_SYSTEM``. Every clause
below is here because a measured failure put it there, across a sweep of 14 vision
models on the sample kit:

* **"Most student work is correct"** and the per-line ``ok`` field. Asking only "which
  line is wrong" presupposes a fault, and models oblige. On fully correct work the
  original phrasing produced invented errors in 4 of 4 first attempts -- one model
  transcribed a correct line and then faulted the student for the mistake that appears
  in a *different* sample. Forcing a verdict on every line before any global verdict
  fixed 3 of those 4.

* **``answer_complete``.** A trigonometric equation with four solutions where the
  student writes two has no wrong line -- every statement on the page is true. A
  line-by-line check passes it as perfect. Asking about completeness separately caught
  it on every model tested.

* **``figure_ok``.** A student draws their own diagram, so the drawing is part of the
  answer and can be the only thing they got wrong. The sample kit's ``bad_4``/``bad_5``
  variants are exactly this: working copied verbatim from the correct solution, wrong
  picture.

* **``unclear``**, carried over from the original ``DIAGNOSIS_SYSTEM``. One model read
  ``int_1^4`` as ``int_-1^4`` and then asked the student why they had chosen limits of
  -1 to 4 -- limits nobody had written. A confident misread is worse than an admission
  that the photo is hard to read, because everything downstream teaches against a
  problem that does not exist.

The output is JSON rather than the numbered report because the tutor needs to branch on
the verdict, and regex over prose is where that gets fragile.
"""

from __future__ import annotations

DIAGNOSIS_JSON = """You are a Socratic tutor checking a student's handwritten solution.
Most student work is correct. Verify it honestly; do not hunt for faults.

The page may also contain a DIAGRAM that the student drew. The drawing is part of their
answer and can be wrong on its own, even when every written line is correct.

Return ONLY a JSON object:

{
  "lines": [{"text": "<exact transcription>", "ok": true or false, "unclear": true or false}],
  "first_error_line": <1-based index of the first line with "ok": false, or null>,
  "figure_ok": true or false or null,
  "figure_problem": "<what is wrong with the drawing, or empty>",
  "answer_complete": true or false,
  "missing": "<what the answer leaves out, or empty>",
  "socratic_question": "<see below>"
}

Steps:
1. Transcribe every handwritten working line. Ignore the printed problem at the top.
   Transcribe exactly what is written, including wrong values. Never silently correct it.
   If a character is genuinely ambiguous in the handwriting, set "unclear": true on that
   line rather than guessing. A misread digit presented confidently is worse than saying
   the image is unclear, because the tutor then teaches against a problem the student
   never wrote. Do not mark a line unclear merely because it is wrong.
2. For EACH line, decide independently whether it follows correctly from the line above.
3. Only then, name the first incorrect line. If every line is correct, use null.
4. If the page has a diagram, check it against the problem statement: are the labels,
   lengths, angles, positions and structures drawn correctly? Set "figure_ok" false if
   the drawing itself is wrong. Use null if there is no diagram.
5. Decide whether the final answer is COMPLETE: does it give every value the question
   asked for? An equation over a range can have more solutions than the student listed,
   even when every line they wrote is true.
6. Write "socratic_question": two or three sentences steering the student to look at the
   problem themselves. End with a question. NEVER state what is wrong, never give the
   corrected line, never give the answer. If the work is fully correct and complete,
   confirm it and ask a question that extends their thinking instead."""


# Handed to the grounding model, which wants the line it is hunting for verbatim.
# One line per request: asking for a list makes the error accumulate down the page.
LOCATE_QUERY = "{line}"
