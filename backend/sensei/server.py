"""FastAPI app. Runs on the GB10 itself; the Expo client talks to it over the LAN."""

from __future__ import annotations

import json
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from pathlib import Path

from .config import load_settings
from .curriculum import build_graph
from .graph import KnowledgeGraph
from .learner import LearnerStore
from .llm import LLM
from .tutor import (
    build_root_cause_prompt,
    build_system_prompt,
    diagnose_work,
    teach_from_diagnosis,
)

settings = load_settings()
llm = LLM(settings)
store = LearnerStore()

# The active course. Persisted so a restart mid-event doesn't lose a graph that took
# two model calls to generate.
GRAPH_PATH = Path(__file__).resolve().parent.parent / "graph.json"
graph: KnowledgeGraph | None = (
    KnowledgeGraph.load(GRAPH_PATH) if GRAPH_PATH.exists() else None
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Read the catalog at boot rather than trusting a hardcoded list -- it has already
    # drifted from the vendor docs once. A mismatch here is a 404 at demo time.
    try:
        models = await llm.available_models()
        if settings.model not in models:
            print(
                f"!! pinned model {settings.model!r} is NOT in the router catalog.\n"
                f"   available: {', '.join(models)}"
            )
        else:
            resident = await llm.resident_model()
            if resident != settings.model:
                print(
                    f"!! pin={settings.model!r} but resident={resident!r}. "
                    "First request will pay a 1-5 min cold swap. Pre-warm before demo."
                )
            else:
                print(f"ok: {settings.model} pinned and resident")
    except Exception as e:  # never block startup on a probe
        print(f"!! could not reach router at {settings.base_url}: {e}")
    yield
    await llm.aclose()
    store.close()


app = FastAPI(title="Sensei", lifespan=lifespan)

# Wide open: this only ever listens on a LAN behind the offline guard, and locking it
# down costs demo time on a device whose origin we do not control.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class Turn(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    learner_id: str = "demo"
    message: str
    lesson: str | None = None
    # When set, the tutor checks the graph for an upstream weakness and teaches the
    # cause instead of the symptom.
    concept_id: str | None = None
    history: list[Turn] = []


class SyllabusRequest(BaseModel):
    syllabus: str


@app.get("/health")
async def health():
    """Liveness plus the two facts that actually predict demo failure."""
    resident = await llm.resident_model()
    return {
        "status": "ok",
        "pinned_model": settings.model,
        "resident_model": resident,
        "warm": resident == settings.model,
        "offline_mode": settings.offline,
    }


@app.post("/learner/{learner_id}")
async def upsert_learner(learner_id: str, body: dict):
    store.ensure(
        learner_id,
        name=body.get("name"),
        language=body.get("language"),
        exam=body.get("exam"),
        exam_date=body.get("exam_date"),
    )
    return {"ok": True, "profile": store.profile(learner_id).__dict__}


@app.get("/learner/{learner_id}")
async def get_learner(learner_id: str):
    return store.profile(learner_id).__dict__


@app.post("/learner/{learner_id}/observation")
async def add_observation(learner_id: str, body: dict):
    """Record one attempt. `note` should capture the specific slip, not a score."""
    topic = body.get("topic")
    if not topic:
        raise HTTPException(400, "topic is required")
    store.record(learner_id, topic, bool(body.get("correct")), body.get("note"))
    return {"ok": True}


def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


@app.post("/tutor/stream")
async def tutor_stream(req: ChatRequest):
    """Stream one Socratic turn, grounded in what we know about this student."""
    profile = store.profile(req.learner_id)
    system = build_system_prompt(profile, req.lesson)

    # Root-cause redirect: if the graph says an upstream concept is the real problem,
    # teach that instead. This is the difference between a tutor and a chatbot.
    redirect = None
    if graph is not None and req.concept_id:
        redirect = build_root_cause_prompt(
            graph, req.concept_id, store.mastery(req.learner_id), profile
        )
        if redirect:
            system += "\n\n" + redirect

    messages = [{"role": "system", "content": system}]
    messages += [t.model_dump() for t in req.history]
    messages.append({"role": "user", "content": req.message})

    async def gen():
        # Surfaced so the client (and the stage) can see the redirect happening.
        yield _sse("start", {"model": settings.model, "root_cause": redirect})
        try:
            async for piece in llm.stream(messages):
                yield _sse("token", {"text": piece})
            yield _sse("done", {})
        except Exception as e:
            # Surface the failure to the client instead of dying silently mid-stream --
            # a truncated stream is indistinguishable from a thinking model otherwise.
            yield _sse("error", {"message": str(e)})

    return StreamingResponse(gen(), media_type="text/event-stream")


@app.post("/curriculum/build")
async def curriculum_build(req: SyllabusRequest):
    """Syllabus in, knowledge graph out. Two model calls; expect ~30-60s.

    Replaces the active course and persists it.
    """
    global graph
    if not req.syllabus.strip():
        raise HTTPException(400, "syllabus is required")

    graph = await build_graph(llm, req.syllabus)
    graph.save(GRAPH_PATH)
    return {
        "concepts": len(graph.concepts),
        "edges": sum(len(c.prereqs) for c in graph.concepts.values()),
        "path": graph.course_path(),
    }


@app.get("/curriculum/path")
async def curriculum_path(learner_id: str = "demo"):
    """The course path plus where this learner currently is in it."""
    if graph is None:
        raise HTTPException(404, "no course loaded; POST /curriculum/build first")

    mastery = store.mastery(learner_id)
    return {
        "next": graph.next_concept(mastery),
        "unlocked": graph.unlocked(mastery),
        "concepts": [
            {
                "id": cid,
                "name": graph.concepts[cid].name,
                "name_local": graph.concepts[cid].name_local,
                "prereqs": graph.concepts[cid].prereqs,
                "mastery": round(mastery.get(cid, 0.0), 2),
            }
            for cid in graph.course_path()
        ],
    }


@app.post("/tutor/diagnose")
async def tutor_diagnose(
    learner_id: str = Form("demo"),
    problem: str | None = Form(None),
    image: UploadFile = File(...),
):
    """Photo of written work in, transcription + first error out.

    Returns the raw diagnosis alongside the tutor's opening question so the client can
    show the tutor's turn while keeping the analysis available for debugging on stage.
    """
    raw = await image.read()
    if not raw:
        raise HTTPException(400, "empty image")

    diagnosis = await diagnose_work(
        llm, raw, problem=problem, mime=image.content_type or "image/jpeg"
    )
    profile = store.profile(learner_id)
    messages = teach_from_diagnosis(diagnosis, profile)

    opening = await llm.complete(messages, max_tokens=400, temperature=0.6)
    return {"diagnosis": diagnosis, "tutor_opening": opening}
