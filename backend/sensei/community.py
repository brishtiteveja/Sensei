"""Community: students share a finished mock test, others react and comment.

A port of the NestJS community module from ShikkhaDikkha
(backend/src/modules/community), kept wire-compatible so the mobile client is
the same code either way: same paths, same response shapes, same error
messages, same rules -- one post per attempt, one reaction per person per
target (same emoji again removes it, a different one replaces it), no reacting
to your own post or comment, flat comment threads via parentCommentId.

What differs is identity. That service sits behind JWT; Sensei has no sign-in,
so a person is their learner id, sent as `X-Learner-Id` (see mobile
src/lib/learner.ts). That is an identifier, not a credential: anyone who knows
an id can act as it. Good enough for a class pilot, not for the open internet
-- put real auth in front of the write routes before this is public.

Mock tests are also saved here, because sharing needs a stored attempt to
point at and the practice runner never stored one. The attempt carries a
snapshot of each question, since the questions live in SenseiClaw and can
change or be retranslated after the fact; a shared result should keep showing
what the student actually saw.

No moderation, reporting or blocking, matching the original. The users are
minors and comments are free text -- decide who reviews them before launch.
"""

from __future__ import annotations

import json
import re
import secrets
import sqlite3
import time
from datetime import datetime, timezone
from typing import Literal
from urllib.parse import unquote

from fastapi import APIRouter, Header, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator

Emoji = Literal["FIRE", "PARTY", "STRONG", "HEART", "WOW"]
REACTION_ORDER: tuple[str, ...] = ("FIRE", "PARTY", "STRONG", "HEART", "WOW")

FEED_DEFAULT, FEED_MAX = 10, 30
COMMENTS_DEFAULT, COMMENTS_MAX = 20, 50

_LEARNER_ID = re.compile(r"^[A-Za-z0-9_.:-]{1,128}$")

_SCHEMA = """
CREATE TABLE IF NOT EXISTS mocktest_attempt (
    id                 TEXT PRIMARY KEY,
    learner_id         TEXT NOT NULL,
    question_set_id    TEXT NOT NULL,
    question_set_name  TEXT NOT NULL,
    question_set_year  TEXT NOT NULL,
    subject_id         TEXT NOT NULL,
    subject_name       TEXT NOT NULL,
    score              INTEGER NOT NULL,
    total              INTEGER NOT NULL,
    percentage         INTEGER NOT NULL,
    time_taken         INTEGER NOT NULL,
    created_at         TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_attempt_learner ON mocktest_attempt(learner_id, created_at DESC);

-- A snapshot of each question as the student saw it, not a reference to it.
CREATE TABLE IF NOT EXISTS mocktest_answer (
    attempt_id      TEXT NOT NULL REFERENCES mocktest_attempt(id) ON DELETE CASCADE,
    position        INTEGER NOT NULL,
    question_id     TEXT NOT NULL,
    question_text   TEXT NOT NULL,
    options_json    TEXT NOT NULL,
    correct_index   INTEGER NOT NULL,
    explanation     TEXT NOT NULL DEFAULT '',
    selected_index  INTEGER,
    is_correct      INTEGER NOT NULL,
    PRIMARY KEY (attempt_id, position)
);

CREATE TABLE IF NOT EXISTS community_post (
    id          TEXT PRIMARY KEY,
    learner_id  TEXT NOT NULL,
    attempt_id  TEXT NOT NULL UNIQUE REFERENCES mocktest_attempt(id) ON DELETE CASCADE,
    created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_post_feed ON community_post(created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_post_learner ON community_post(learner_id);

CREATE TABLE IF NOT EXISTS community_reaction (
    post_id     TEXT NOT NULL REFERENCES community_post(id) ON DELETE CASCADE,
    learner_id  TEXT NOT NULL,
    emoji       TEXT NOT NULL,
    created_at  TEXT NOT NULL,
    PRIMARY KEY (post_id, learner_id)
);

CREATE TABLE IF NOT EXISTS community_comment (
    id                 TEXT PRIMARY KEY,
    post_id            TEXT NOT NULL REFERENCES community_post(id) ON DELETE CASCADE,
    learner_id         TEXT NOT NULL,
    parent_comment_id  TEXT REFERENCES community_comment(id) ON DELETE CASCADE,
    content            TEXT NOT NULL,
    created_at         TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_comment_post ON community_comment(post_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_comment_learner ON community_comment(learner_id);

CREATE TABLE IF NOT EXISTS community_comment_reaction (
    comment_id  TEXT NOT NULL REFERENCES community_comment(id) ON DELETE CASCADE,
    learner_id  TEXT NOT NULL,
    emoji       TEXT NOT NULL,
    created_at  TEXT NOT NULL,
    PRIMARY KEY (comment_id, learner_id)
);
"""


class CommunityError(Exception):
    """An error with the status and message the NestJS service would return."""

    def __init__(self, status: int, message: str) -> None:
        super().__init__(message)
        self.status = status
        self.message = message


def _now_iso() -> str:
    # Millisecond ISO with a Z, the same text Prisma's toISOString() produces, so
    # feed cursors built from it sort and compare correctly as plain strings.
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


_last_tick = 0


def _new_id(prefix: str) -> str:
    # Time-ordered like a cuid: comment pagination orders by id, exactly as the
    # original does, so ids must sort by creation time. The tick only moves
    # forward, so two ids minted in the same millisecond still sort in order.
    global _last_tick
    _last_tick = max(int(time.time() * 1000) * 1000, _last_tick + 1)
    return f"{prefix}{_last_tick:015x}{secrets.token_hex(4)}"


# ---------------------------------------------------------------------------
# Request bodies (same rules as the zod DTOs)
# ---------------------------------------------------------------------------


class ShareBody(BaseModel):
    mocktestAttemptId: str = Field(min_length=1)


class ReactBody(BaseModel):
    emoji: Emoji


class CommentBody(BaseModel):
    content: str
    replyToCommentId: str | None = None

    @field_validator("content")
    @classmethod
    def _content(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Comment cannot be empty")
        if len(v) > 500:
            raise ValueError("Comment must be at most 500 characters")
        return v

    @field_validator("replyToCommentId")
    @classmethod
    def _reply(cls, v: str | None) -> str | None:
        if v is None:
            return None
        v = v.strip()
        if not v:
            raise ValueError("replyToCommentId cannot be empty")
        return v


class AttemptSubject(BaseModel):
    id: str = Field(min_length=1, max_length=200)
    name: str = Field(min_length=1, max_length=200)


class AttemptQuestionSet(BaseModel):
    id: str = Field(min_length=1, max_length=200)
    name: str = Field(min_length=1, max_length=300)
    year: str = Field(default="", max_length=20)
    subject: AttemptSubject


class AttemptQuestion(BaseModel):
    text: str = Field(min_length=1, max_length=5000)
    options: list[str] = Field(min_length=2, max_length=10)
    correctIndex: int = Field(ge=0)
    explanation: str = Field(default="", max_length=5000)


class AttemptAnswer(BaseModel):
    questionId: str = Field(min_length=1, max_length=200)
    selectedIndex: int | None = Field(default=None, ge=0)
    question: AttemptQuestion


class AttemptBody(BaseModel):
    questionSet: AttemptQuestionSet
    timeTaken: int = Field(ge=0, le=24 * 60 * 60)
    answers: list[AttemptAnswer] = Field(min_length=1, max_length=200)


# ---------------------------------------------------------------------------
# Storage
# ---------------------------------------------------------------------------


class CommunityStore:
    """Community tables, on the same SQLite file as the learner store.

    Display names come from the `learner` table that LearnerStore owns, so
    this store is handed that store's connection rather than opening its own.
    """

    def __init__(self, conn: sqlite3.Connection) -> None:
        self._conn = conn
        self._conn.execute("PRAGMA foreign_keys = ON")
        self._conn.executescript(_SCHEMA)
        self._conn.commit()

    # -- people -------------------------------------------------------------

    def touch_learner(self, learner_id: str, name: str | None) -> None:
        self._conn.execute(
            "INSERT OR IGNORE INTO learner (id, created_at) VALUES (?, ?)",
            (learner_id, time.time()),
        )
        if name:
            self._conn.execute("UPDATE learner SET name = ? WHERE id = ?", (name, learner_id))
        self._conn.commit()

    def _user(self, learner_id: str) -> dict:
        row = self._conn.execute("SELECT name FROM learner WHERE id = ?", (learner_id,)).fetchone()
        return {"id": learner_id, "name": row["name"] if row else None, "avatarUrl": None}

    # -- attempts -----------------------------------------------------------

    def create_attempt(self, learner_id: str, body: AttemptBody) -> dict:
        rows = []
        score = 0
        for position, a in enumerate(body.answers):
            q = a.question
            if q.correctIndex >= len(q.options):
                raise CommunityError(400, f"answers[{position}].question.correctIndex is out of range")
            if a.selectedIndex is not None and a.selectedIndex >= len(q.options):
                raise CommunityError(400, f"answers[{position}].selectedIndex is out of range")
            # Scored here, not trusted from the client: the score is what the
            # feed shows everyone.
            is_correct = a.selectedIndex is not None and a.selectedIndex == q.correctIndex
            score += int(is_correct)
            rows.append((position, a, is_correct))

        total = len(rows)
        attempt_id = _new_id("a")
        created_at = _now_iso()
        qs = body.questionSet
        with self._conn:
            self._conn.execute(
                "INSERT INTO mocktest_attempt (id, learner_id, question_set_id, question_set_name,"
                " question_set_year, subject_id, subject_name, score, total, percentage, time_taken,"
                " created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    attempt_id, learner_id, qs.id, qs.name, qs.year, qs.subject.id, qs.subject.name,
                    score, total, round(score / total * 100), body.timeTaken, created_at,
                ),
            )
            self._conn.executemany(
                "INSERT INTO mocktest_answer (attempt_id, position, question_id, question_text,"
                " options_json, correct_index, explanation, selected_index, is_correct)"
                " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [
                    (
                        attempt_id, position, a.questionId, a.question.text,
                        json.dumps(a.question.options, ensure_ascii=False), a.question.correctIndex,
                        a.question.explanation, a.selectedIndex, int(is_correct),
                    )
                    for position, a, is_correct in rows
                ],
            )
        attempt = self._attempt_summary(attempt_id)
        assert attempt is not None
        return {**attempt, "questionSetId": qs.id}

    def _attempt_row(self, attempt_id: str) -> sqlite3.Row | None:
        return self._conn.execute(
            "SELECT * FROM mocktest_attempt WHERE id = ?", (attempt_id,)
        ).fetchone()

    def _attempt_summary(self, attempt_id: str) -> dict | None:
        r = self._attempt_row(attempt_id)
        if r is None:
            return None
        return {
            "id": r["id"],
            "score": r["score"],
            "total": r["total"],
            "percentage": r["percentage"],
            "timeTaken": r["time_taken"],
            "createdAt": r["created_at"],
            "questionSet": {
                "id": r["question_set_id"],
                "name": r["question_set_name"],
                "year": r["question_set_year"],
                "subject": {"id": r["subject_id"], "name": r["subject_name"]},
            },
        }

    def _attempt_detail(self, attempt_id: str) -> dict:
        summary = self._attempt_summary(attempt_id)
        assert summary is not None
        answers = [
            {
                "questionId": a["question_id"],
                "selectedIndex": a["selected_index"],
                "isCorrect": bool(a["is_correct"]),
                "question": {
                    "id": a["question_id"],
                    "text": a["question_text"],
                    "options": json.loads(a["options_json"]),
                    "correctIndex": a["correct_index"],
                    "explanation": a["explanation"],
                },
            }
            for a in self._conn.execute(
                "SELECT * FROM mocktest_answer WHERE attempt_id = ? ORDER BY position", (attempt_id,)
            ).fetchall()
        ]
        return {**summary, "answers": answers}

    # -- posts --------------------------------------------------------------

    def _reactions(self, table: str, key: str, target_id: str, viewer: str | None) -> tuple[list[dict], str | None]:
        counts = {
            r["emoji"]: r["n"]
            for r in self._conn.execute(
                f"SELECT emoji, COUNT(*) AS n FROM {table} WHERE {key} = ? GROUP BY emoji", (target_id,)
            ).fetchall()
        }
        mine = None
        if viewer:
            row = self._conn.execute(
                f"SELECT emoji FROM {table} WHERE {key} = ? AND learner_id = ?", (target_id, viewer)
            ).fetchone()
            mine = row["emoji"] if row else None
        # Fixed order, zero counts dropped -- the shape the client renders.
        return [{"emoji": e, "count": counts[e]} for e in REACTION_ORDER if counts.get(e)], mine

    def _post(self, row: sqlite3.Row, viewer: str | None) -> dict:
        reactions, mine = self._reactions("community_reaction", "post_id", row["id"], viewer)
        comments = self._conn.execute(
            "SELECT COUNT(*) FROM community_comment WHERE post_id = ?", (row["id"],)
        ).fetchone()[0]
        return {
            "id": row["id"],
            "createdAt": row["created_at"],
            "user": self._user(row["learner_id"]),
            "attempt": self._attempt_summary(row["attempt_id"]),
            "reactions": reactions,
            "commentsCount": comments,
            "myReaction": mine,
        }

    def _post_row(self, post_id: str) -> sqlite3.Row:
        row = self._conn.execute("SELECT * FROM community_post WHERE id = ?", (post_id,)).fetchone()
        if row is None:
            raise CommunityError(404, f"Community post {post_id} not found")
        return row

    def share(self, learner_id: str, attempt_id: str) -> dict:
        attempt = self._attempt_row(attempt_id)
        # A missing attempt and someone else's attempt answer the same, as upstream.
        if attempt is None or attempt["learner_id"] != learner_id:
            raise CommunityError(403, "You can only share your own mocktest attempts")
        # Idempotent: sharing again returns the existing post, unchanged.
        self._conn.execute(
            "INSERT OR IGNORE INTO community_post (id, learner_id, attempt_id, created_at) VALUES (?, ?, ?, ?)",
            (_new_id("p"), learner_id, attempt_id, _now_iso()),
        )
        self._conn.commit()
        row = self._conn.execute(
            "SELECT * FROM community_post WHERE attempt_id = ?", (attempt_id,)
        ).fetchone()
        return self._post(row, learner_id)

    def feed(self, viewer: str | None, limit: int, cursor: str | None) -> dict:
        where, args = "", []
        if cursor:
            created, sep, cid = cursor.partition("__")
            if sep and cid and _parses_as_date(created):
                where = "WHERE created_at < ? OR (created_at = ? AND id < ?)"
                args = [created, created, cid]
            else:
                # Upstream falls back to treating an unparseable cursor as an id.
                where, args = "WHERE id < ?", [cursor]
        rows = self._conn.execute(
            f"SELECT * FROM community_post {where} ORDER BY created_at DESC, id DESC LIMIT ?",
            (*args, limit + 1),
        ).fetchall()
        page = rows[:limit]
        next_cursor = None
        if len(rows) > limit and page:
            last = page[-1]
            next_cursor = f"{last['created_at']}__{last['id']}"
        return {"data": [self._post(r, viewer) for r in page], "nextCursor": next_cursor, "limit": limit}

    def post_detail(self, post_id: str, viewer: str | None) -> dict:
        row = self._post_row(post_id)
        return {**self._post(row, viewer), "attemptDetail": self._attempt_detail(row["attempt_id"])}

    # -- reactions ----------------------------------------------------------

    def _toggle(self, table: str, key: str, target_id: str, learner_id: str, emoji: str) -> dict:
        with self._conn:
            existing = self._conn.execute(
                f"SELECT emoji FROM {table} WHERE {key} = ? AND learner_id = ?", (target_id, learner_id)
            ).fetchone()
            if existing and existing["emoji"] == emoji:
                self._conn.execute(
                    f"DELETE FROM {table} WHERE {key} = ? AND learner_id = ?", (target_id, learner_id)
                )
            else:
                self._conn.execute(
                    f"INSERT INTO {table} ({key}, learner_id, emoji, created_at) VALUES (?, ?, ?, ?)"
                    f" ON CONFLICT({key}, learner_id) DO UPDATE SET emoji = excluded.emoji",
                    (target_id, learner_id, emoji, _now_iso()),
                )
        reactions, mine = self._reactions(table, key, target_id, learner_id)
        return {"myReaction": mine, "reactions": reactions}

    def react_to_post(self, post_id: str, learner_id: str, emoji: str) -> dict:
        row = self._post_row(post_id)
        if row["learner_id"] == learner_id:
            raise CommunityError(403, "You cannot react to your own post")
        return self._toggle("community_reaction", "post_id", post_id, learner_id, emoji)

    def react_to_comment(self, comment_id: str, learner_id: str, emoji: str) -> dict:
        row = self._comment_row(comment_id)
        if row is None:
            raise CommunityError(404, f"Community comment {comment_id} not found")
        if row["learner_id"] == learner_id:
            raise CommunityError(403, "You cannot react to your own comment")
        return self._toggle("community_comment_reaction", "comment_id", comment_id, learner_id, emoji)

    # -- comments -----------------------------------------------------------

    def _comment_row(self, comment_id: str) -> sqlite3.Row | None:
        return self._conn.execute(
            "SELECT * FROM community_comment WHERE id = ?", (comment_id,)
        ).fetchone()

    def _comment(self, row: sqlite3.Row, viewer: str | None) -> dict:
        reactions, mine = self._reactions("community_comment_reaction", "comment_id", row["id"], viewer)
        return {
            "id": row["id"],
            "content": row["content"],
            "parentCommentId": row["parent_comment_id"],
            "createdAt": row["created_at"],
            "user": self._user(row["learner_id"]),
            "reactions": reactions,
            "myReaction": mine,
        }

    def add_comment(self, post_id: str, learner_id: str, content: str, reply_to: str | None) -> dict:
        self._post_row(post_id)
        if reply_to:
            parent = self._comment_row(reply_to)
            # A reply must stay on its own post.
            if parent is None or parent["post_id"] != post_id:
                raise CommunityError(404, f"Community comment {reply_to} not found")
        comment_id = _new_id("c")
        self._conn.execute(
            "INSERT INTO community_comment (id, post_id, learner_id, parent_comment_id, content, created_at)"
            " VALUES (?, ?, ?, ?, ?, ?)",
            (comment_id, post_id, learner_id, reply_to, content, _now_iso()),
        )
        self._conn.commit()
        row = self._comment_row(comment_id)
        assert row is not None
        return self._comment(row, learner_id)

    def comments(self, post_id: str, viewer: str | None, limit: int, cursor: str | None) -> dict:
        self._post_row(post_id)
        where, args = "WHERE post_id = ?", [post_id]
        if cursor:
            where += " AND id < ?"
            args.append(cursor)
        rows = self._conn.execute(
            f"SELECT * FROM community_comment {where} ORDER BY id DESC LIMIT ?", (*args, limit + 1)
        ).fetchall()
        page = rows[:limit]
        next_cursor = page[-1]["id"] if len(rows) > limit and page else None
        return {"data": [self._comment(r, viewer) for r in page], "nextCursor": next_cursor, "limit": limit}


def _parses_as_date(value: str) -> bool:
    try:
        datetime.fromisoformat(value.replace("Z", "+00:00"))
        return True
    except ValueError:
        return False


def _clamp(raw: str | None, default: int, most: int) -> int:
    try:
        n = int(raw) if raw is not None else default
    except ValueError:
        n = default
    return min(max(n or default, 1), most)


# ---------------------------------------------------------------------------
# HTTP
# ---------------------------------------------------------------------------


def _viewer(learner_id: str | None) -> str | None:
    """The learner id if it is well formed, else None (treated as a guest)."""
    if learner_id and _LEARNER_ID.match(learner_id):
        return learner_id
    return None


def build_router(store: CommunityStore) -> APIRouter:
    router = APIRouter()

    def required(learner_id: str | None, learner_name: str | None) -> str:
        viewer = _viewer(learner_id)
        if viewer is None:
            raise CommunityError(401, "Unauthorized")
        # Names arrive URL-encoded: HTTP headers are Latin-1, and names are Bangla.
        name = None
        if learner_name:
            name = unquote(learner_name).strip()[:80] or None
        store.touch_learner(viewer, name)
        return viewer

    @router.post("/mocktest/attempts", status_code=201)
    def create_attempt(
        body: AttemptBody,
        x_learner_id: str | None = Header(default=None),
        x_learner_name: str | None = Header(default=None),
    ):
        return store.create_attempt(required(x_learner_id, x_learner_name), body)

    @router.post("/community/share", status_code=201)
    def share(
        body: ShareBody,
        x_learner_id: str | None = Header(default=None),
        x_learner_name: str | None = Header(default=None),
    ):
        return store.share(required(x_learner_id, x_learner_name), body.mocktestAttemptId)

    @router.get("/community")
    def feed(
        limit: str | None = Query(default=None),
        cursor: str | None = Query(default=None),
        x_learner_id: str | None = Header(default=None),
    ):
        return store.feed(_viewer(x_learner_id), _clamp(limit, FEED_DEFAULT, FEED_MAX), cursor)

    # Registered before /community/{post_id} so "comments" is never read as a post id.
    @router.post("/community/comments/{comment_id}/react", status_code=201)
    def react_comment(
        comment_id: str,
        body: ReactBody,
        x_learner_id: str | None = Header(default=None),
        x_learner_name: str | None = Header(default=None),
    ):
        return store.react_to_comment(comment_id, required(x_learner_id, x_learner_name), body.emoji)

    @router.get("/community/{post_id}")
    def detail(post_id: str, x_learner_id: str | None = Header(default=None)):
        return store.post_detail(post_id, _viewer(x_learner_id))

    @router.post("/community/{post_id}/react", status_code=201)
    def react_post(
        post_id: str,
        body: ReactBody,
        x_learner_id: str | None = Header(default=None),
        x_learner_name: str | None = Header(default=None),
    ):
        return store.react_to_post(post_id, required(x_learner_id, x_learner_name), body.emoji)

    @router.post("/community/{post_id}/comment", status_code=201)
    def comment(
        post_id: str,
        body: CommentBody,
        x_learner_id: str | None = Header(default=None),
        x_learner_name: str | None = Header(default=None),
    ):
        viewer = required(x_learner_id, x_learner_name)
        return store.add_comment(post_id, viewer, body.content, body.replyToCommentId)

    @router.get("/community/{post_id}/comments")
    def comments(
        post_id: str,
        limit: str | None = Query(default=None),
        cursor: str | None = Query(default=None),
        x_learner_id: str | None = Header(default=None),
    ):
        return store.comments(
            post_id, _viewer(x_learner_id), _clamp(limit, COMMENTS_DEFAULT, COMMENTS_MAX), cursor
        )

    return router


_OWNED_PREFIXES = ("/community", "/mocktest")


def install(app, store: CommunityStore) -> None:
    """Mount the routes and the error format the mobile client reads.

    The client's getApiErrorMessage() reads `message`, the NestJS convention,
    not FastAPI's `detail`. The validation handler is scoped to these routes so
    the tutor endpoints keep FastAPI's usual 422s.
    """
    app.include_router(build_router(store))

    @app.exception_handler(CommunityError)
    async def _community_error(_request: Request, exc: CommunityError):
        return JSONResponse(status_code=exc.status, content={"statusCode": exc.status, "message": exc.message})

    default_validation = app.exception_handlers.get(RequestValidationError)

    @app.exception_handler(RequestValidationError)
    async def _validation_error(request: Request, exc: RequestValidationError):
        if request.url.path.startswith(_OWNED_PREFIXES):
            errors: dict[str, list[str]] = {}
            for e in exc.errors():
                loc = ".".join(str(p) for p in e.get("loc", ())[1:]) or "body"
                errors.setdefault(loc, []).append(e.get("msg", "Invalid value"))
            return JSONResponse(
                status_code=400,
                content={"statusCode": 400, "message": "Validation failed", "errors": errors},
            )
        if default_validation is not None:
            return await default_validation(request, exc)
        from fastapi.exception_handlers import request_validation_exception_handler

        return await request_validation_exception_handler(request, exc)

