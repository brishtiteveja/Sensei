"""FastAPI app. Runs on the GB10 itself; the Expo client talks to it over the LAN."""

from __future__ import annotations

import json
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from .config import load_settings
from .learner import LearnerStore
from .llm import LLM
from .tutor import build_system_prompt, diagnose_work, teach_from_diagnosis

settings = load_settings()
llm = LLM(settings)
store = LearnerStore()


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
    history: list[Turn] = []


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
    messages = [{"role": "system", "content": build_system_prompt(profile, req.lesson)}]
    messages += [t.model_dump() for t in req.history]
    messages.append({"role": "user", "content": req.message})

    async def gen():
        yield _sse("start", {"model": settings.model})
        try:
            async for piece in llm.stream(messages):
                yield _sse("token", {"text": piece})
            yield _sse("done", {})
        except Exception as e:
            # Surface the failure to the client instead of dying silently mid-stream --
            # a truncated stream is indistinguishable from a thinking model otherwise.
            yield _sse("error", {"message": str(e)})

    return StreamingResponse(gen(), media_type="text/event-stream")


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
