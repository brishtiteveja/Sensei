"""Per-student memory.

This is the part that makes Sensei a *tutor* rather than a chatbot with a syllabus.
Bloom's two-sigma effect comes from a tutor who knows where you specifically are weak
and starts today from yesterday's mistake. A stateless chat loop cannot reproduce it,
no matter how good the model is.

SQLite on the box. No hosted DB -- the cable-pull demo has to be literally true.
"""

from __future__ import annotations

import json
import sqlite3
import time
from dataclasses import dataclass, field
from pathlib import Path

DEFAULT_DB = Path(__file__).resolve().parent.parent / "sensei.db"

_SCHEMA = """
CREATE TABLE IF NOT EXISTS learner (
    id           TEXT PRIMARY KEY,
    name         TEXT,
    language     TEXT NOT NULL DEFAULT 'bn',
    exam         TEXT,
    exam_date    TEXT,
    created_at   REAL NOT NULL
);

-- One row per (topic, outcome) observation. We keep raw observations rather than a
-- rolled-up score so the tutor can cite a *specific* past mistake ("last time the
-- sign of a slipped"), which is far more useful than "you are 62% on kinematics".
CREATE TABLE IF NOT EXISTS observation (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    learner_id  TEXT NOT NULL,
    topic       TEXT NOT NULL,
    correct     INTEGER NOT NULL,
    note        TEXT,
    created_at  REAL NOT NULL,
    FOREIGN KEY (learner_id) REFERENCES learner(id)
);

CREATE INDEX IF NOT EXISTS idx_obs_learner ON observation(learner_id, created_at DESC);
"""


@dataclass
class LearnerProfile:
    id: str
    name: str | None = None
    language: str = "bn"
    exam: str | None = None
    exam_date: str | None = None
    strengths: list[str] = field(default_factory=list)
    weaknesses: list[str] = field(default_factory=list)
    recent_mistakes: list[str] = field(default_factory=list)

    def as_prompt_context(self) -> str:
        """Render the profile as the block injected into the tutor's system prompt.

        Kept terse on purpose. Long profiles crowd out the actual lesson and push the
        model toward summarising the student back at itself instead of teaching.
        """
        bits: list[str] = []
        if self.name:
            bits.append(f"Student name: {self.name}")
        if self.exam:
            when = f" (exam date: {self.exam_date})" if self.exam_date else ""
            bits.append(f"Preparing for: {self.exam}{when}")
        if self.strengths:
            bits.append(f"Already solid on: {', '.join(self.strengths)}")
        if self.weaknesses:
            bits.append(f"Struggles with: {', '.join(self.weaknesses)}")
        if self.recent_mistakes:
            recent = "; ".join(self.recent_mistakes[:3])
            bits.append(f"Recent specific mistakes: {recent}")
        return "\n".join(bits)


class LearnerStore:
    def __init__(self, db_path: Path | str = DEFAULT_DB) -> None:
        self.path = Path(db_path)
        self._conn = sqlite3.connect(self.path, check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._conn.executescript(_SCHEMA)
        self._conn.commit()

    def close(self) -> None:
        self._conn.close()

    def ensure(self, learner_id: str, **fields) -> None:
        """Create the learner if absent, then apply any provided fields."""
        self._conn.execute(
            "INSERT OR IGNORE INTO learner (id, created_at) VALUES (?, ?)",
            (learner_id, time.time()),
        )
        allowed = {"name", "language", "exam", "exam_date"}
        updates = {k: v for k, v in fields.items() if k in allowed and v is not None}
        if updates:
            sets = ", ".join(f"{k} = ?" for k in updates)
            self._conn.execute(
                f"UPDATE learner SET {sets} WHERE id = ?",
                (*updates.values(), learner_id),
            )
        self._conn.commit()

    def record(
        self, learner_id: str, topic: str, correct: bool, note: str | None = None
    ) -> None:
        """Log one observation. `note` should be the specific slip, not a grade."""
        self.ensure(learner_id)
        self._conn.execute(
            "INSERT INTO observation (learner_id, topic, correct, note, created_at) "
            "VALUES (?, ?, ?, ?, ?)",
            (learner_id, topic, int(correct), note, time.time()),
        )
        self._conn.commit()

    def mastery(self, learner_id: str) -> dict[str, float]:
        """Per-concept mastery in [0,1], keyed by concept id.

        This is what the knowledge graph consumes to find root causes and to gate the
        course path. Recent attempts are weighted more heavily than old ones -- a
        student who has since learned the thing should not be held to their first
        three wrong answers, which is exactly the complaint people have about systems
        that average over all history.
        """
        rows = self._conn.execute(
            "SELECT topic, correct, created_at FROM observation "
            "WHERE learner_id = ? ORDER BY created_at ASC",
            (learner_id,),
        ).fetchall()

        by_topic: dict[str, list[int]] = {}
        for r in rows:
            by_topic.setdefault(r["topic"], []).append(r["correct"])

        out: dict[str, float] = {}
        for topic, results in by_topic.items():
            # Exponential recency weighting: most recent attempt has weight 1, each
            # older one decays by 0.7.
            weight, total, hit = 1.0, 0.0, 0.0
            for correct in reversed(results):
                total += weight
                hit += weight * correct
                weight *= 0.7
            out[topic] = hit / total if total else 0.0
        return out

    def profile(self, learner_id: str, *, min_attempts: int = 2) -> LearnerProfile:
        """Roll observations up into the profile the tutor sees.

        `min_attempts` guards against branding a topic a weakness off a single unlucky
        answer -- which would make the tutor confidently wrong about the student, the
        most corrosive failure mode for trust.
        """
        row = self._conn.execute(
            "SELECT * FROM learner WHERE id = ?", (learner_id,)
        ).fetchone()
        if row is None:
            return LearnerProfile(id=learner_id)

        agg = self._conn.execute(
            """
            SELECT topic,
                   COUNT(*)      AS attempts,
                   SUM(correct)  AS hits
            FROM observation
            WHERE learner_id = ?
            GROUP BY topic
            """,
            (learner_id,),
        ).fetchall()

        strengths, weaknesses = [], []
        for a in agg:
            if a["attempts"] < min_attempts:
                continue
            ratio = a["hits"] / a["attempts"]
            if ratio >= 0.75:
                strengths.append(a["topic"])
            elif ratio <= 0.5:
                weaknesses.append(a["topic"])

        mistakes = [
            r["note"]
            for r in self._conn.execute(
                "SELECT note FROM observation "
                "WHERE learner_id = ? AND correct = 0 AND note IS NOT NULL "
                "ORDER BY created_at DESC LIMIT 5",
                (learner_id,),
            ).fetchall()
        ]

        return LearnerProfile(
            id=learner_id,
            name=row["name"],
            language=row["language"] or "bn",
            exam=row["exam"],
            exam_date=row["exam_date"],
            strengths=strengths,
            weaknesses=weaknesses,
            recent_mistakes=mistakes,
        )
