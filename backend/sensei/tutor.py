"""Socratic tutoring and written-work diagnosis.

The prompts are the product. The model is capable of just answering the question, and
will default to doing so -- holding it in Socratic mode is the actual engineering here.
"""

from __future__ import annotations

from .learner import LearnerProfile
from .llm import LLM, image_message

LANGUAGE_NAMES = {
    "bn": "Bengali",
    "en": "English",
    "hi": "Hindi",
    "sw": "Swahili",
    "id": "Indonesian",
}

# Written positively ("ask a question that leads them one step") rather than as a wall
# of prohibitions. Long "do not" lists degrade instruction-following -- the model spends
# its attention on the constraints and produces stilted output.
SOCRATIC_SYSTEM = """You are Sensei, a patient one-on-one tutor.

Your method:
- Lead the student to the answer with one focused question at a time.
- Build on what they already said. If they are close, confirm the correct part first.
- When they are stuck, narrow the question rather than supplying the answer.
- Reveal a full solution only after they have solved it, as confirmation.

Reply ONLY in {language}. Use the notation and conventions a {language}-speaking
student would see in their own textbook.

Keep replies short -- two or three sentences, ending in a question. This is a
conversation, not a lecture."""

DIAGNOSIS_SYSTEM = """You are examining a photograph of a student's handwritten work.

Report, in this order:
1. TRANSCRIPTION -- what is actually written, line by line, as best you can read it.
2. FIRST_ERROR -- the line number where the first genuine mistake appears, or NONE.
3. WHY -- one sentence on what went wrong conceptually.

If the handwriting is ambiguous, say so in TRANSCRIPTION rather than guessing. A
misread digit that you present confidently is worse than admitting the image is
unclear, because the tutor will then teach against a problem the student never wrote."""


def _language_name(code: str) -> str:
    return LANGUAGE_NAMES.get(code, code)


def build_system_prompt(profile: LearnerProfile, lesson: str | None = None) -> str:
    """Assemble the tutor system prompt: method + who this student is + today's topic."""
    parts = [SOCRATIC_SYSTEM.format(language=_language_name(profile.language))]

    context = profile.as_prompt_context()
    if context:
        parts.append(
            "What you know about this student:\n"
            + context
            + "\n\nUse this. If it connects to a past mistake of theirs, start there."
        )
    if lesson:
        parts.append(f"Today's topic: {lesson}")
    return "\n\n".join(parts)


async def diagnose_work(
    llm: LLM, image_bytes: bytes, *, problem: str | None = None, mime: str = "image/jpeg"
) -> str:
    """Read a photo of written work and locate the first error.

    Runs on the same pinned model as the tutor -- that is the whole point of the single
    pin, and why this returns text for the tutor to consume rather than calling a
    separate vision service.
    """
    prompt = "Examine this student's work."
    if problem:
        prompt += f" The problem they were solving: {problem}"

    return await llm.complete(
        [
            {"role": "system", "content": DIAGNOSIS_SYSTEM},
            image_message(prompt, image_bytes, mime),
        ],
        max_tokens=700,
        temperature=0.2,  # transcription is not a place for creativity
    )


def teach_from_diagnosis(diagnosis: str, profile: LearnerProfile) -> list[dict]:
    """Turn a diagnosis into the opening move of a tutoring exchange.

    Note it never states the error outright -- it steers the student to the line and
    asks. Handing them "line 2 is wrong" would collapse the whole method at exactly the
    moment it matters most.
    """
    system = build_system_prompt(profile)
    return [
        {"role": "system", "content": system},
        {
            "role": "user",
            "content": (
                "I photographed my work. Here is an analysis of it:\n\n"
                f"{diagnosis}\n\n"
                "Do not tell me the error. Point me at the line where I should look "
                "and ask me one question that will help me spot it myself."
            ),
        },
    ]
