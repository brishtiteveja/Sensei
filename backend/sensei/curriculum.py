"""Curriculum agent: raw syllabus in, knowledge graph out.

This is what makes "drop in any region's syllabus" real rather than aspirational, and
it is the Do-track evidence: a multi-step pipeline where each stage consumes the last.

    syllabus text (any language)
        -> extract concepts
        -> infer prerequisite edges
        -> validate + prune
        -> KnowledgeGraph

Deliberately staged rather than one large prompt. Asking a model to invent concepts and
wire their dependencies simultaneously produces plausible-looking graphs with edges that
were never really reasoned about -- it pattern-matches a DAG instead of thinking about
what actually has to be learned first. Splitting the steps means the edge pass sees a
fixed concept list and only has to answer one question.
"""

from __future__ import annotations

import json
import re

from .graph import Concept, KnowledgeGraph
from .llm import LLM

EXTRACT_SYSTEM = """You are a curriculum designer reading a syllabus.

Break it into atomic teachable concepts -- each one a single idea a student could learn
in one sitting. "Trigonometry" is a chapter, not a concept; "sine rule" is a concept.

Return ONLY a JSON array. No prose, no markdown fence. Each element:
{"id": "snake_case_ascii", "name": "English name", "name_local": "name in the syllabus's
own language", "unit": "chapter or unit it came from"}

The id must be ASCII snake_case even when the syllabus is not in English -- it is a
database key, not display text. Keep name_local in the original language and script.

Aim for 12-25 concepts. Prefer splitting a broad topic over merging two distinct ones."""

PREREQ_SYSTEM = """You are mapping prerequisites between concepts.

For each concept, list which OTHER concepts from the list a student genuinely must
understand first. Only direct prerequisites -- if A needs B and B needs C, do not also
list C under A. The transitive path is derived later.

Be conservative. A wrong edge sends a struggling student to relearn something they
already know, which wastes their time and costs their trust in the tutor. If two
concepts are merely related, that is not a prerequisite.

Many concepts legitimately have zero prerequisites. That is expected -- those are the
entry points to the course.

Return ONLY a JSON object mapping concept id to an array of prerequisite ids:
{"projectile_motion": ["vector_decomposition", "kinematics"], "arithmetic": []}"""


def _extract_json(raw: str):
    """Pull JSON out of a model response.

    Models wrap JSON in markdown fences, prepend "Here is the...", and occasionally
    emit trailing commas. This is the single most common failure point in an agent
    pipeline, so it is handled properly rather than with a bare json.loads.
    """
    text = raw.strip()

    # ```json ... ``` fence
    fence = re.search(r"```(?:json)?\s*(.+?)```", text, re.DOTALL)
    if fence:
        text = fence.group(1).strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Fall back to the outermost bracketed span
    for opener, closer in (("[", "]"), ("{", "}")):
        start, end = text.find(opener), text.rfind(closer)
        if start != -1 and end > start:
            candidate = text[start : end + 1]
            candidate = re.sub(r",\s*([}\]])", r"\1", candidate)  # trailing commas
            try:
                return json.loads(candidate)
            except json.JSONDecodeError:
                continue

    raise ValueError(f"no parseable JSON in model output: {raw[:200]!r}")


def _slug(value: str) -> str:
    """Coerce a model-supplied id into a safe ASCII snake_case key."""
    cleaned = re.sub(r"[^a-zA-Z0-9]+", "_", value.strip().lower()).strip("_")
    return cleaned or "concept"


async def extract_concepts(llm: LLM, syllabus: str) -> list[Concept]:
    """Stage 1 -- syllabus text into atomic concepts."""
    raw = await llm.complete(
        [
            {"role": "system", "content": EXTRACT_SYSTEM},
            {"role": "user", "content": f"Syllabus:\n\n{syllabus}"},
        ],
        max_tokens=2000,
        temperature=0.3,
    )

    items = _extract_json(raw)
    if isinstance(items, dict):  # model wrapped it, e.g. {"concepts": [...]}
        items = next((v for v in items.values() if isinstance(v, list)), [])

    concepts: list[Concept] = []
    seen: set[str] = set()
    for item in items:
        if not isinstance(item, dict) or not item.get("name"):
            continue
        cid = _slug(item.get("id") or item["name"])
        while cid in seen:  # ids must be unique or edges collapse silently
            cid += "_x"
        seen.add(cid)
        concepts.append(
            Concept(
                id=cid,
                name=str(item["name"]),
                name_local=item.get("name_local") or None,
                unit=item.get("unit") or None,
            )
        )
    return concepts


async def infer_prerequisites(llm: LLM, concepts: list[Concept]) -> dict[str, list[str]]:
    """Stage 2 -- wire dependency edges between a fixed concept list."""
    catalogue = "\n".join(
        f"- {c.id}: {c.name}" + (f" (unit: {c.unit})" if c.unit else "")
        for c in concepts
    )
    raw = await llm.complete(
        [
            {"role": "system", "content": PREREQ_SYSTEM},
            {"role": "user", "content": f"Concepts:\n\n{catalogue}"},
        ],
        max_tokens=2000,
        temperature=0.2,
    )

    parsed = _extract_json(raw)
    if not isinstance(parsed, dict):
        return {}

    valid = {c.id for c in concepts}
    edges: dict[str, list[str]] = {}
    for cid, prereqs in parsed.items():
        if cid not in valid or not isinstance(prereqs, list):
            continue
        # Drop unknown ids and self-edges. A self-edge would make the concept
        # permanently locked, since its own prerequisite can never be satisfied.
        edges[cid] = [p for p in prereqs if p in valid and p != cid]
    return edges


async def build_graph(llm: LLM, syllabus: str) -> KnowledgeGraph:
    """Run the full pipeline. Returns a validated, cycle-safe knowledge graph."""
    concepts = await extract_concepts(llm, syllabus)
    if not concepts:
        raise ValueError("no concepts extracted from syllabus")

    edges = await infer_prerequisites(llm, concepts)
    for c in concepts:
        c.prereqs = edges.get(c.id, [])

    graph = KnowledgeGraph(concepts)
    # Must happen before the graph is ever served. A surviving cycle leaves the
    # concepts in it permanently unreachable in the course path, with no visible error.
    graph.break_cycles()
    return graph
