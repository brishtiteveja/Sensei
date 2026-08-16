"""Reading a student's handwritten page: what is wrong, and where on the page it is.

Two stages, two models, because no single one is good at both jobs:

    read_page()  ->  Diagnosis(lines, first_error_line, figure_ok, socratic_question, box)

Everything here was shaped by measurement on `samples/ranking`, not by taste. The
prompt's per-line `ok`, `answer_complete` and `figure_ok` fields each exist because a
model failed without them; the second model exists because general VLMs cannot ground.
The reasoning is written down in `prompts.py` and `locate.py` rather than here.

`sensei.tutor.DIAGNOSIS_SYSTEM` is the older single-call version that returns a numbered
prose report. It is still what `/tutor/diagnose` uses. This package is the replacement.
"""

from .diagnose import Diagnosis, Line, parse_diagnosis, read_page
from .locate import Box, Locator, locate_base_url
from .prompts import DIAGNOSIS_JSON

__all__ = [
    "Box",
    "DIAGNOSIS_JSON",
    "Diagnosis",
    "Line",
    "Locator",
    "locate_base_url",
    "parse_diagnosis",
    "read_page",
]
