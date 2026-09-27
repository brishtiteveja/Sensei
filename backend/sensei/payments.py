"""Payments: subscriptions and AI credits, paid through bKash or Nagad.

A port of ShikkhaDikkha's NestJS payments and ai-credits modules
(backend/src/modules/payments, backend/src/modules/ai-credits), wire-compatible
the way community.py is: same paths under both /payments and /payment, same
shapes, same error messages, so the mobile screens are that app's code.

The rule everything else serves: a payment is approved only after this server
has executed (bKash) or verified (Nagad) it with the gateway and checked the
amount. Nothing a client sends, and nothing in a callback URL, approves it.
Only a PENDING payment changes state, so double callbacks, a callback racing
/verify, and replays cannot fulfil an order twice.

Identity is the learner id sent as X-Learner-Id, as in community.py. It is an
identifier, not a credential, and with money that has two consequences:
  * A purchase belongs to the id that made it. A student who reinstalls
    without signing in gets a fresh id and loses what they bought. Signed-in
    learners are `u_<account>` (mobile src/lib/learner.ts), so purchases
    follow the person once accounts exist.
  * Anyone who knows an id can read its payment history and spend its
    credits. Nobody can move money with it -- approval only comes from the
    gateway. Put real auth in front of these routes before this is public.

AI credits: every learner starts with FREE_CREDITS and each tutor message
costs one. The tutor runs on SenseiClaw, which knows nothing about credits, so
the app spends one here before sending and refunds it if the tutor fails.
That gate runs on the client and is easy to skip. Fine for a pilot, but it is
not enforcement. An active subscription makes messages free, because it is
sold as "unlimited AI tutor chats". ShikkhaDikkha charged subscribers credits
anyway.

Changed from the original, each on purpose:
  * Credits are added in the same transaction that approves the payment, not
    after it commits, so a crash cannot leave a paid order unfulfilled.
  * A callback for a payment that is no longer PENDING is answered without
    calling the gateway. Upstream would ask bKash to capture the money and
    then fail to fulfil the order.
  * Callbacks and /verify for one payment run one at a time, so two in flight
    cannot capture and reject the same order.
  * Nagad is verified by the payment reference stored at initiation, not the
    one in the callback URL.
  * A gateway reports `enabled` only when its credentials are set.
  * No guest wallets, login bonus or guest-credit claiming: without sign-in
    there is one kind of learner. No push notifications, as in community.py.

Still open, as upstream: Nagad response signatures are not checked, and
payments left PENDING past expires_at are never swept.
"""

from __future__ import annotations

import json
import logging
import os
import re
import secrets
import sqlite3
import threading
import uuid
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from math import ceil
from typing import Iterator, Literal
from urllib.parse import parse_qs, urlencode, urlsplit

from fastapi import APIRouter, Header, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, RedirectResponse
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

from .payment_gateways import BkashConfig, BkashGateway, GatewayError, NagadConfig, NagadGateway

log = logging.getLogger("sensei.payments")

Gateway = Literal["bkash", "nagad"]
SUPPORTED_GATEWAYS: tuple[str, ...] = ("bkash", "nagad")
GATEWAY_NAMES = {"bkash": "bKash", "nagad": "Nagad"}
GATEWAY_LOGOS = {"bkash": "bK", "nagad": "N"}

FREE_CREDITS = 20
HISTORY_LIMIT = 50
AMOUNT_TOLERANCE = 0.01
# Distinct from ShikkhaDikkha's "SD-" so orders from the two apps can be told
# apart if they ever share a merchant account.
REFERENCE_PREFIX = "SN-"

_LEARNER_ID = re.compile(r"^[A-Za-z0-9_.:-]{1,128}$")

# The starting catalog, from ShikkhaDikkha's prisma seed. Inserted only when
# missing: once the rows exist, prices live in the database, not here.
#   (id, name, duration_days, price, display_price, period, save, popular)
SUBSCRIPTION_PACKAGES = (
    ("sub_7d", "7 Days", 7, 59, "৳59", "7 days", "", False),
    ("sub_1m", "1 Month", 30, 199, "৳199", "/month", "", False),
    ("sub_3m", "3 Months", 90, 499, "৳499", "3 months", "Save 16%", True),
    ("sub_6m", "6 Months", 180, 849, "৳849", "6 months", "Save 29%", False),
)
#   (id, name, credits, price, display_price, description, popular)
CREDIT_PACKAGES = (
    ("credits_100", "Starter AI Credits", 100, 49, "৳49", "100 AI credits for chat and Ask AI", False),
    ("credits_300", "Plus AI Credits", 300, 129, "৳129", "300 AI credits for regular practice", True),
    ("credits_800", "Pro AI Credits", 800, 299, "৳299", "800 AI credits for heavy usage", False),
)

_SCHEMA = """
CREATE TABLE IF NOT EXISTS subscription_package (
    id             TEXT PRIMARY KEY,
    name           TEXT NOT NULL UNIQUE,
    duration_days  INTEGER NOT NULL,
    price          INTEGER NOT NULL,
    display_price  TEXT NOT NULL,
    period         TEXT NOT NULL,
    save           TEXT NOT NULL DEFAULT '',
    popular        INTEGER NOT NULL DEFAULT 0,
    is_active      INTEGER NOT NULL DEFAULT 1,
    sort_order     INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ai_credit_package (
    id             TEXT PRIMARY KEY,
    name           TEXT NOT NULL UNIQUE,
    credits        INTEGER NOT NULL,
    price          INTEGER NOT NULL,
    display_price  TEXT NOT NULL,
    description    TEXT NOT NULL DEFAULT '',
    popular        INTEGER NOT NULL DEFAULT 0,
    is_active      INTEGER NOT NULL DEFAULT 1,
    sort_order     INTEGER NOT NULL DEFAULT 0
);

-- One row per purchase attempt, for either kind of product.
CREATE TABLE IF NOT EXISTS payment (
    id                  TEXT PRIMARY KEY,
    learner_id          TEXT NOT NULL,
    reference_code      TEXT NOT NULL UNIQUE,   -- our invoice / order id at the gateway
    gateway             TEXT NOT NULL,
    status              TEXT NOT NULL DEFAULT 'PENDING',
    amount              INTEGER NOT NULL,
    currency            TEXT NOT NULL DEFAULT 'BDT',
    package_id          TEXT REFERENCES subscription_package(id),
    credit_package_id   TEXT REFERENCES ai_credit_package(id),
    package_name        TEXT NOT NULL,          -- as bought, even if the package is renamed
    gateway_payment_id  TEXT UNIQUE,            -- bKash paymentID / Nagad paymentReferenceId
    transaction_id      TEXT,
    gateway_raw         TEXT,                   -- last gateway payload, for audit
    created_at          TEXT NOT NULL,
    reviewed_at         TEXT,
    expires_at          TEXT NOT NULL,
    CHECK ((package_id IS NULL) <> (credit_package_id IS NULL))
);
CREATE INDEX IF NOT EXISTS idx_payment_learner ON payment(learner_id, created_at DESC);

CREATE TABLE IF NOT EXISTS user_subscription (
    id          TEXT PRIMARY KEY,
    learner_id  TEXT NOT NULL,
    package_id  TEXT NOT NULL REFERENCES subscription_package(id),
    payment_id  TEXT UNIQUE REFERENCES payment(id),
    start_date  TEXT NOT NULL,
    end_date    TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'ACTIVE'
);
CREATE INDEX IF NOT EXISTS idx_subscription_learner ON user_subscription(learner_id, status, end_date DESC);

CREATE TABLE IF NOT EXISTS ai_credit_wallet (
    learner_id         TEXT PRIMARY KEY,
    total_credits      INTEGER NOT NULL,
    used_credits       INTEGER NOT NULL DEFAULT 0,
    available_credits  INTEGER NOT NULL,
    created_at         TEXT NOT NULL,
    updated_at         TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_credit_transaction (
    id                       TEXT PRIMARY KEY,
    learner_id               TEXT NOT NULL,
    amount                   INTEGER NOT NULL,
    balance_after            INTEGER NOT NULL,
    source                   TEXT NOT NULL,   -- GUEST_FREE | PURCHASED | SYSTEM
    type                     TEXT NOT NULL,   -- CREDIT_ADDED | CREDIT_USED | REFUND
    feature                  TEXT,
    payment_id               TEXT REFERENCES payment(id),
    refunded_transaction_id  TEXT UNIQUE REFERENCES ai_credit_transaction(id),
    created_at               TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_credit_tx_learner ON ai_credit_transaction(learner_id, created_at DESC);
-- A payment adds credits once, however many callbacks arrive.
CREATE UNIQUE INDEX IF NOT EXISTS ux_credit_tx_purchase
    ON ai_credit_transaction(payment_id) WHERE type = 'CREDIT_ADDED';
"""


class PaymentError(Exception):
    """An error with the status and message the NestJS service would return."""

    def __init__(self, status: int, message: str, code: str | None = None) -> None:
        super().__init__(message)
        self.status = status
        self.message = message
        self.code = code


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _iso(dt: datetime) -> str:
    # The same text Prisma's toISOString() produces, so stored dates compare
    # correctly as plain strings.
    return dt.astimezone(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def _parse(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def _new_id(prefix: str) -> str:
    return f"{prefix}{uuid.uuid4().hex}"


def _raw(data: object) -> str:
    return json.dumps(data, ensure_ascii=False, default=str)


def _amount(value: str | None) -> float | None:
    try:
        return float(value) if value else None
    except ValueError:
        return None


def _status(db_status: str) -> str:
    if db_status == "APPROVED":
        return "success"
    if db_status in ("REJECTED", "EXPIRED"):
        return "failed"
    if db_status == "CANCELLED":
        return "cancelled"
    return "pending"


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class PaymentSettings:
    # Where the gateway sends the student's browser after checkout. Must be
    # this API, never the app: the callback is what executes the payment.
    bkash_callback_url: str = ""
    nagad_callback_url: str = ""
    callback_base_url: str = ""
    # Where the callback then sends the browser: the app's own scheme.
    deep_link_base: str = "sensei://"
    expires_hours: float = 24

    @classmethod
    def from_env(cls) -> PaymentSettings:
        return cls(
            bkash_callback_url=os.environ.get("BKASH_CALLBACK_URL", ""),
            nagad_callback_url=os.environ.get("NAGAD_CALLBACK_URL", ""),
            callback_base_url=os.environ.get("PAYMENT_CALLBACK_BASE_URL", ""),
            deep_link_base=os.environ.get("APP_DEEP_LINK_BASE", "") or "sensei://",
            expires_hours=float(os.environ.get("SUBSCRIPTION_PAYMENT_EXPIRES_HOURS", "24")),
        )

    def callback_url(self, gateway: str) -> str:
        explicit = (self.bkash_callback_url if gateway == "bkash" else self.nagad_callback_url).removesuffix("/")
        if explicit:
            return explicit
        base = self.callback_base_url.removesuffix("/")
        if base:
            return f"{base}/payments/{gateway}/callback"
        var = "BKASH_CALLBACK_URL" if gateway == "bkash" else "NAGAD_CALLBACK_URL"
        raise PaymentError(503, f"Payment callback URL is not configured. Set {var} or PAYMENT_CALLBACK_BASE_URL.")

    def deep_link(self, result: str, order_id: str | None, reason: str | None = None) -> str:
        params = {"status": result}
        if order_id:
            params["orderId"] = order_id
        if reason:
            params["reason"] = reason
        # Path must match the app's payment-result route and the redirectUrl it
        # hands openAuthSessionAsync. One slash off "sensei://" is intended:
        # "sensei:/" + "/payment-result" is "sensei://payment-result".
        return f"{self.deep_link_base.removesuffix('/')}/payment-result?{urlencode(params)}"


# ---------------------------------------------------------------------------
# Storage
# ---------------------------------------------------------------------------


class PaymentsStore:
    """Payment tables, on the same SQLite file as the learner store.

    Unlike CommunityStore this opens its own connection. Every route shares
    one connection across threads, so another module's commit can land in the
    middle of this one's transaction. For comments that is harmless; for an
    approval that marks an order paid and then grants what was bought, it is
    not. Each write here is one BEGIN IMMEDIATE transaction on a connection
    only this store uses.
    """

    def __init__(self, db_path: str | os.PathLike = ":memory:") -> None:
        self._conn = sqlite3.connect(db_path, check_same_thread=False, isolation_level=None, timeout=10)
        self._conn.row_factory = sqlite3.Row
        self._conn.execute("PRAGMA foreign_keys = ON")
        self._lock = threading.RLock()
        self._conn.executescript(_SCHEMA)
        self._seed()

    def close(self) -> None:
        self._conn.close()

    @contextmanager
    def _tx(self) -> Iterator[sqlite3.Connection]:
        with self._lock:
            self._conn.execute("BEGIN IMMEDIATE")
            try:
                yield self._conn
            except BaseException:
                self._conn.execute("ROLLBACK")
                raise
            self._conn.execute("COMMIT")

    def _one(self, sql: str, args: tuple = ()) -> sqlite3.Row | None:
        with self._lock:
            return self._conn.execute(sql, args).fetchone()

    def _all(self, sql: str, args: tuple = ()) -> list[sqlite3.Row]:
        with self._lock:
            return self._conn.execute(sql, args).fetchall()

    def _seed(self) -> None:
        with self._tx() as c:
            c.executemany(
                "INSERT OR IGNORE INTO subscription_package (id, name, duration_days, price, display_price,"
                " period, save, popular, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [(*p, i) for i, p in enumerate(SUBSCRIPTION_PACKAGES)],
            )
            c.executemany(
                "INSERT OR IGNORE INTO ai_credit_package (id, name, credits, price, display_price, description,"
                " popular, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                [(*p, i) for i, p in enumerate(CREDIT_PACKAGES)],
            )

    # -- catalog ------------------------------------------------------------

    def subscription_packages(self) -> list[dict]:
        return [
            {
                "id": r["id"],
                "name": r["name"],
                "durationDays": r["duration_days"],
                "price": r["price"],
                "displayPrice": r["display_price"],
                "period": r["period"],
                "save": r["save"],
                "popular": bool(r["popular"]),
            }
            for r in self._all("SELECT * FROM subscription_package WHERE is_active = 1 ORDER BY sort_order")
        ]

    def credit_packages(self) -> list[dict]:
        return [
            {
                "id": r["id"],
                "name": r["name"],
                "credits": r["credits"],
                "price": r["price"],
                "displayPrice": r["display_price"],
                "description": r["description"],
                "popular": bool(r["popular"]),
                "isActive": bool(r["is_active"]),
                "sortOrder": r["sort_order"],
            }
            for r in self._all("SELECT * FROM ai_credit_package WHERE is_active = 1 ORDER BY sort_order")
        ]

    def package(self, kind: str, package_id: str) -> sqlite3.Row | None:
        table = "subscription_package" if kind == "subscription" else "ai_credit_package"
        return self._one(f"SELECT * FROM {table} WHERE id = ? AND is_active = 1", (package_id,))

    # -- payments -----------------------------------------------------------

    def create_payment(
        self, learner_id: str, kind: str, pkg: sqlite3.Row, gateway: str, expires_hours: float
    ) -> sqlite3.Row:
        now = _now()
        payment_id = _new_id("pay_")
        for _ in range(5):
            ref = f"{REFERENCE_PREFIX}{secrets.token_hex(4).upper()}"
            try:
                with self._tx() as c:
                    c.execute(
                        "INSERT INTO payment (id, learner_id, reference_code, gateway, amount, package_id,"
                        " credit_package_id, package_name, gateway_payment_id, created_at, expires_at)"
                        " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                        (
                            payment_id, learner_id, ref, gateway, pkg["price"],
                            pkg["id"] if kind == "subscription" else None,
                            pkg["id"] if kind == "credits" else None,
                            pkg["name"],
                            # A placeholder until the gateway issues its own id,
                            # as upstream does.
                            ref,
                            _iso(now), _iso(now + timedelta(hours=expires_hours)),
                        ),
                    )
                break
            except sqlite3.IntegrityError:
                continue  # reference collision; 4 bytes is small enough to happen eventually
        else:
            raise PaymentError(500, "Could not allocate a payment reference")
        row = self.payment(payment_id)
        assert row is not None
        return row

    def set_gateway_ref(self, payment_id: str, gateway_payment_id: str, raw: dict) -> None:
        with self._tx() as c:
            c.execute(
                "UPDATE payment SET gateway_payment_id = ?, gateway_raw = ? WHERE id = ?",
                (gateway_payment_id, _raw(raw), payment_id),
            )

    def payment(self, payment_id: str) -> sqlite3.Row | None:
        return self._one("SELECT * FROM payment WHERE id = ?", (payment_id,))

    def payment_for(self, learner_id: str, payment_id: str) -> sqlite3.Row | None:
        return self._one("SELECT * FROM payment WHERE id = ? AND learner_id = ?", (payment_id, learner_id))

    def payment_by_gateway_id(self, gateway_payment_id: str) -> sqlite3.Row | None:
        return self._one("SELECT * FROM payment WHERE gateway_payment_id = ?", (gateway_payment_id,))

    def payment_by_reference(self, reference_code: str) -> sqlite3.Row | None:
        return self._one("SELECT * FROM payment WHERE reference_code = ?", (reference_code,))

    def reject(self, payment_id: str, raw: object) -> bool:
        """PENDING -> REJECTED. A settled payment is never reopened by a later callback."""
        with self._tx() as c:
            cur = c.execute(
                "UPDATE payment SET status = 'REJECTED', reviewed_at = ?, gateway_raw = ?"
                " WHERE id = ? AND status = 'PENDING'",
                (_iso(_now()), _raw(raw), payment_id),
            )
            return cur.rowcount == 1

    def note_pending(self, payment_id: str, raw: object) -> None:
        with self._tx() as c:
            c.execute(
                "UPDATE payment SET gateway_raw = ? WHERE id = ? AND status = 'PENDING'", (_raw(raw), payment_id)
            )

    def approve(self, payment_id: str, transaction_id: str, raw: object) -> bool:
        """PENDING -> APPROVED, and grant what was bought, in one transaction.

        Only one caller can win the transition; everyone else gets False and
        grants nothing.
        """
        now = _now()
        with self._tx() as c:
            cur = c.execute(
                "UPDATE payment SET status = 'APPROVED', transaction_id = ?, reviewed_at = ?, gateway_raw = ?"
                " WHERE id = ? AND status = 'PENDING'",
                (transaction_id, _iso(now), _raw(raw), payment_id),
            )
            if cur.rowcount != 1:
                return False
            p = c.execute("SELECT * FROM payment WHERE id = ?", (payment_id,)).fetchone()
            if p["package_id"]:
                self._grant_subscription(c, p, now)
            else:
                self._grant_credits(c, p, now)
        return True

    def _grant_subscription(self, c: sqlite3.Connection, p: sqlite3.Row, now: datetime) -> None:
        pkg = c.execute("SELECT duration_days FROM subscription_package WHERE id = ?", (p["package_id"],)).fetchone()
        latest = c.execute(
            "SELECT MAX(end_date) FROM user_subscription WHERE learner_id = ? AND status = 'ACTIVE'",
            (p["learner_id"],),
        ).fetchone()[0]
        # Stacks: buying while subscribed extends from the current end date,
        # so no paid day is lost.
        base = max(now, _parse(latest)) if latest else now
        c.execute(
            "INSERT INTO user_subscription (id, learner_id, package_id, payment_id, start_date, end_date)"
            " VALUES (?, ?, ?, ?, ?, ?)",
            (
                _new_id("sub_"), p["learner_id"], p["package_id"], p["id"],
                _iso(now), _iso(base + timedelta(days=pkg["duration_days"])),
            ),
        )

    def _grant_credits(self, c: sqlite3.Connection, p: sqlite3.Row, now: datetime) -> None:
        pkg = c.execute("SELECT credits FROM ai_credit_package WHERE id = ?", (p["credit_package_id"],)).fetchone()
        self._ensure_wallet(c, p["learner_id"], now)
        c.execute(
            "UPDATE ai_credit_wallet SET total_credits = total_credits + ?, available_credits = available_credits + ?,"
            " updated_at = ? WHERE learner_id = ?",
            (pkg["credits"], pkg["credits"], _iso(now), p["learner_id"]),
        )
        self._record(c, p["learner_id"], pkg["credits"], "PURCHASED", "CREDIT_ADDED", now, payment_id=p["id"])

    def history(self, learner_id: str) -> list[dict]:
        return [
            {
                "id": r["id"],
                "status": _status(r["status"]),
                "gateway": r["gateway"],
                "amount": r["amount"],
                "currency": r["currency"],
                "transactionId": r["transaction_id"],
                "packageName": r["package_name"],
                "kind": "ai_credit" if r["credit_package_id"] else "subscription",
                "createdAt": r["created_at"],
                "reviewedAt": r["reviewed_at"],
            }
            for r in self._all(
                "SELECT * FROM payment WHERE learner_id = ? ORDER BY created_at DESC LIMIT ?",
                (learner_id, HISTORY_LIMIT),
            )
        ]

    # -- subscriptions ------------------------------------------------------

    def _expire(self, c: sqlite3.Connection, learner_id: str, now: datetime) -> None:
        c.execute(
            "UPDATE user_subscription SET status = 'EXPIRED' WHERE learner_id = ? AND status = 'ACTIVE' AND end_date < ?",
            (learner_id, _iso(now)),
        )

    def subscription(self, learner_id: str) -> dict:
        now = _now()
        with self._tx() as c:
            self._expire(c, learner_id, now)
            row = c.execute(
                "SELECT s.*, p.name AS package_name, p.duration_days FROM user_subscription s"
                " JOIN subscription_package p ON p.id = s.package_id"
                " WHERE s.learner_id = ? AND s.status = 'ACTIVE' ORDER BY s.end_date DESC LIMIT 1",
                (learner_id,),
            ).fetchone()
        if row is None:
            return {"isActive": False, "subscription": None}
        remaining = (_parse(row["end_date"]) - now).total_seconds() / 86400
        return {
            "isActive": True,
            "subscription": {
                "id": row["id"],
                "packageName": row["package_name"],
                "durationDays": row["duration_days"],
                "startDate": row["start_date"],
                "endDate": row["end_date"],
                "status": "active",
                "daysRemaining": max(0, ceil(remaining)),
            },
        }

    # -- AI credits ---------------------------------------------------------

    def _record(
        self, c: sqlite3.Connection, learner_id: str, amount: int, source: str, kind: str, now: datetime,
        *, feature: str | None = None, payment_id: str | None = None, refunds: str | None = None,
    ) -> str:
        balance = c.execute(
            "SELECT available_credits FROM ai_credit_wallet WHERE learner_id = ?", (learner_id,)
        ).fetchone()[0]
        tx_id = _new_id("ctx_")
        c.execute(
            "INSERT INTO ai_credit_transaction (id, learner_id, amount, balance_after, source, type, feature,"
            " payment_id, refunded_transaction_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (tx_id, learner_id, amount, balance, source, kind, feature, payment_id, refunds, _iso(now)),
        )
        return tx_id

    def _ensure_wallet(self, c: sqlite3.Connection, learner_id: str, now: datetime) -> None:
        cur = c.execute(
            "INSERT OR IGNORE INTO ai_credit_wallet (learner_id, total_credits, available_credits, created_at,"
            " updated_at) VALUES (?, ?, ?, ?, ?)",
            (learner_id, FREE_CREDITS, FREE_CREDITS, _iso(now), _iso(now)),
        )
        if cur.rowcount == 1:
            self._record(c, learner_id, FREE_CREDITS, "GUEST_FREE", "CREDIT_ADDED", now)

    def _balance(self, c: sqlite3.Connection, learner_id: str) -> dict:
        w = c.execute("SELECT * FROM ai_credit_wallet WHERE learner_id = ?", (learner_id,)).fetchone()
        return {
            "scope": "user",
            "totalCredits": w["total_credits"],
            "usedCredits": w["used_credits"],
            "availableCredits": w["available_credits"],
        }

    def balance(self, learner_id: str) -> dict:
        with self._tx() as c:
            self._ensure_wallet(c, learner_id, _now())
            return self._balance(c, learner_id)

    def consume(self, learner_id: str, feature: str, cost: int) -> dict:
        now = _now()
        with self._tx() as c:
            self._ensure_wallet(c, learner_id, now)
            self._expire(c, learner_id, now)
            subscribed = c.execute(
                "SELECT 1 FROM user_subscription WHERE learner_id = ? AND status = 'ACTIVE' AND end_date > ?",
                (learner_id, _iso(now)),
            ).fetchone()
            if subscribed:
                return {"code": "SUBSCRIPTION_ACTIVE", "transactionId": None, **self._balance(c, learner_id)}
            cur = c.execute(
                "UPDATE ai_credit_wallet SET available_credits = available_credits - ?,"
                " used_credits = used_credits + ?, updated_at = ?"
                " WHERE learner_id = ? AND available_credits >= ?",
                (cost, cost, _iso(now), learner_id, cost),
            )
            if cur.rowcount == 1:
                tx_id = self._record(c, learner_id, -cost, "SYSTEM", "CREDIT_USED", now, feature=feature.upper())
                return {"code": "CREDIT_CONSUMED", "transactionId": tx_id, **self._balance(c, learner_id)}
        # Outside the transaction so the wallet it may have just created is kept.
        raise PaymentError(402, "No AI credits remaining", code="INSUFFICIENT_USER_CREDIT")

    def refund(self, learner_id: str, transaction_id: str) -> dict:
        now = _now()
        with self._tx() as c:
            original = c.execute(
                "SELECT * FROM ai_credit_transaction WHERE id = ? AND learner_id = ?", (transaction_id, learner_id)
            ).fetchone()
            if original is None or original["type"] != "CREDIT_USED":
                raise PaymentError(409, "Credit transaction cannot be refunded")
            done = c.execute(
                "SELECT id FROM ai_credit_transaction WHERE refunded_transaction_id = ?", (transaction_id,)
            ).fetchone()
            if done:
                return {"code": "CREDIT_REFUNDED", "transactionId": done["id"], **self._balance(c, learner_id)}
            cost = -original["amount"]
            c.execute(
                "UPDATE ai_credit_wallet SET available_credits = available_credits + ?,"
                " used_credits = used_credits - ?, updated_at = ? WHERE learner_id = ?",
                (cost, cost, _iso(now), learner_id),
            )
            tx_id = self._record(
                c, learner_id, cost, "SYSTEM", "REFUND", now, feature=original["feature"], refunds=transaction_id
            )
            return {"code": "CREDIT_REFUNDED", "transactionId": tx_id, **self._balance(c, learner_id)}


# ---------------------------------------------------------------------------
# Orchestration
# ---------------------------------------------------------------------------


class Payments:
    """Initiate, verify and callbacks: the parts that talk to a gateway."""

    _STRIPES = 64

    def __init__(
        self,
        store: PaymentsStore,
        bkash: BkashGateway,
        nagad: NagadGateway,
        settings: PaymentSettings,
    ) -> None:
        self.store = store
        self.bkash = bkash
        self.nagad = nagad
        self.settings = settings
        # One lock per payment, striped so the set stays bounded. Callbacks and
        # /verify for the same order take turns; different orders never wait
        # on each other's gateway round trip. Per process: run one worker.
        self._stripes = [threading.Lock() for _ in range(self._STRIPES)]

    @contextmanager
    def _serialised(self, payment_id: str) -> Iterator[None]:
        with self._stripes[hash(payment_id) % self._STRIPES]:
            yield

    def gateway_options(self) -> list[dict]:
        configured = {"bkash": self.bkash.configured, "nagad": self.nagad.configured}
        return [
            {
                "id": g,
                "name": GATEWAY_NAMES[g],
                "logoText": GATEWAY_LOGOS[g],
                "enabled": configured[g],
                "comingSoon": False,
            }
            for g in SUPPORTED_GATEWAYS
        ]

    # -- initiate -----------------------------------------------------------

    def initiate(self, learner_id: str, kind: str, package_id: str, gateway: str, client_ip: str) -> dict:
        if gateway not in SUPPORTED_GATEWAYS:
            raise PaymentError(400, f'Gateway "{gateway}" is not supported')
        pkg = self.store.package(kind, package_id)
        if pkg is None:
            label = "Subscription package" if kind == "subscription" else "AI credit package"
            raise PaymentError(404, f"{label} not found")
        # Checked before a row exists, so tapping an unconfigured gateway does
        # not leave a trail of rejected orders.
        client = self.bkash if gateway == "bkash" else self.nagad
        if not client.configured:
            raise PaymentError(503, f"{GATEWAY_NAMES[gateway]} gateway is not configured")
        callback_url = self.settings.callback_url(gateway)

        payment = self.store.create_payment(learner_id, kind, pkg, gateway, self.settings.expires_hours)
        ref = payment["reference_code"]
        try:
            if gateway == "bkash":
                created = self.bkash.create_payment(amount=pkg["price"], invoice_number=ref, callback_url=callback_url)
                self.store.set_gateway_ref(payment["id"], created.payment_id, created.raw)
                checkout_url = created.bkash_url
            else:
                started = self.nagad.initiate(
                    order_id=ref, amount=pkg["price"], callback_url=callback_url, client_ip=client_ip
                )
                self.store.set_gateway_ref(payment["id"], started.payment_reference_id, started.raw)
                checkout_url = started.checkout_url
        except GatewayError as e:
            log.error("initiate failed gateway=%s ref=%s: %s", gateway, ref, e)
            self.store.reject(payment["id"], {"initiateError": str(e)})
            raise PaymentError(503, str(e)) from e
        except Exception as e:
            self.store.reject(payment["id"], {"initiateError": str(e)})
            raise

        return {
            "orderId": payment["id"],
            "gateway": gateway,
            "checkoutURL": checkout_url,
            "amount": pkg["price"],
            "currency": "BDT",
            "packageName": pkg["name"],
            "status": "pending",
        }

    # -- verify -------------------------------------------------------------

    @staticmethod
    def _verify_response(p: sqlite3.Row) -> dict:
        return {
            "orderId": p["id"],
            "status": _status(p["status"]),
            "gateway": p["gateway"],
            "amount": p["amount"],
            "currency": p["currency"],
            "transactionId": p["transaction_id"],
            "packageName": p["package_name"],
            "subscription": None,
        }

    def _apply(self, p: sqlite3.Row, status: str, transaction_id: str | None, raw: dict, paid: float | None) -> None:
        if status == "pending":
            self.store.note_pending(p["id"], raw)
        elif status == "success":
            if paid is not None and abs(paid - p["amount"]) > AMOUNT_TOLERANCE:
                log.error("amount mismatch on %s: expected=%s paid=%s", p["id"], p["amount"], paid)
                self.store.reject(p["id"], raw)
            else:
                self.store.approve(p["id"], transaction_id or p["gateway_payment_id"] or "", raw)
        else:
            self.store.reject(p["id"], raw)

    def verify(self, learner_id: str, order_id: str) -> dict:
        """The app's safety net after checkout: ask the gateway, settle, report.

        Runs even when the callback never reached us (browser closed, network
        dropped). Idempotent -- a settled payment is reported as it stands.
        """
        p = self.store.payment_for(learner_id, order_id)
        if p is None:
            raise PaymentError(404, "Payment not found")
        if p["status"] != "PENDING" or not p["gateway_payment_id"]:
            return self._verify_response(p)

        with self._serialised(p["id"]):
            p = self.store.payment(p["id"])
            if p["status"] == "PENDING":
                try:
                    if p["gateway"] == "bkash":
                        r = self.bkash.query_payment(p["gateway_payment_id"])
                        self._apply(p, r.status, r.trx_id, r.raw, _amount(r.amount))
                    else:
                        v = self.nagad.verify(p["gateway_payment_id"])
                        self._apply(p, v.status, v.transaction_id, v.raw, _amount(v.amount))
                except GatewayError as e:
                    # Reported as still pending; the next verify tries again.
                    log.error("verify failed for %s: %s", order_id, e)
        return self._verify_response(self.store.payment(p["id"]))

    # -- callbacks ----------------------------------------------------------

    def _settled(self, p: sqlite3.Row) -> str | None:
        """The deep link for a payment that is no longer PENDING, else None."""
        if p["status"] == "APPROVED":
            return self.settings.deep_link("success", p["id"])
        if p["status"] != "PENDING":
            return self.settings.deep_link("failed", p["id"], f"payment_{p['status'].lower()}")
        return None

    def bkash_callback(self, params: dict[str, str]) -> str:
        """bKash sends the browser back with `paymentID` and `status`. Executing
        the payment here is what captures the money; without it, nothing moves."""
        payment_id = params.get("paymentID", "")
        status = params.get("status", "").lower()
        log.info("bKash callback: paymentID=%s status=%s", payment_id, status)

        p = self.store.payment_by_gateway_id(payment_id) if payment_id else None
        if p is None or p["gateway"] != "bkash":
            return self.settings.deep_link("failed", None, "not_found")

        with self._serialised(p["id"]):
            p = self.store.payment(p["id"])
            if (done := self._settled(p)) is not None:
                return done
            if status != "success":
                self.store.reject(p["id"], {"callback": params})
                return self.settings.deep_link("failed", p["id"], f"payment_{status or 'cancelled'}")

            try:
                ex = self.bkash.execute_payment(payment_id)
            except GatewayError as e:
                log.error("bKash execute failed for %s: %s", payment_id, e)
                self.store.reject(p["id"], {"callback": params, "executeError": str(e)})
                return self.settings.deep_link("failed", p["id"], "execute_failed")

            if ex.status != "success":
                self.store.reject(p["id"], ex.raw)
                return self.settings.deep_link("failed", p["id"], "execute_invalid")

            paid = _amount(ex.amount) or 0.0
            if abs(paid - p["amount"]) > AMOUNT_TOLERANCE:
                log.error("bKash amount mismatch on %s: expected=%s paid=%s", p["id"], p["amount"], paid)
                self.store.reject(p["id"], ex.raw)
                return self.settings.deep_link("failed", p["id"], "amount_mismatch")

            self.store.approve(p["id"], ex.trx_id or payment_id, ex.raw)
            return self.settings.deep_link("success", p["id"])

    def nagad_callback(self, params: dict[str, str]) -> str:
        """Nagad sends `merchant`, `order_id`, `payment_ref_id` and `status`."""
        ref = params.get("payment_ref_id", "")
        order_id = params.get("order_id", "")
        status = params.get("status", "").lower()
        log.info("Nagad callback: payment_ref_id=%s order_id=%s status=%s", ref, order_id, status)

        p = self.store.payment_by_gateway_id(ref) if ref else None
        if p is None and order_id:
            p = self.store.payment_by_reference(order_id)
        if p is None or p["gateway"] != "nagad":
            return self.settings.deep_link("failed", None, "not_found")

        with self._serialised(p["id"]):
            p = self.store.payment(p["id"])
            if (done := self._settled(p)) is not None:
                return done
            if status != "success":
                self.store.reject(p["id"], {"callback": params})
                return self.settings.deep_link("failed", p["id"], f"payment_{status or 'cancelled'}")

            try:
                v = self.nagad.verify(p["gateway_payment_id"])
            except GatewayError as e:
                log.error("Nagad verify failed for %s: %s", p["id"], e)
                self.store.reject(p["id"], {"callback": params, "verifyError": str(e)})
                return self.settings.deep_link("failed", p["id"], "verify_failed")

            if v.status != "success":
                self.store.reject(p["id"], v.raw)
                return self.settings.deep_link("failed", p["id"], "verify_invalid")

            paid = _amount(v.amount) or 0.0
            if abs(paid - p["amount"]) > AMOUNT_TOLERANCE:
                log.error("Nagad amount mismatch on %s: expected=%s paid=%s", p["id"], p["amount"], paid)
                self.store.reject(p["id"], v.raw)
                return self.settings.deep_link("failed", p["id"], "amount_mismatch")

            self.store.approve(p["id"], v.transaction_id, v.raw)
            return self.settings.deep_link("success", p["id"])

    def webhook(self, body: dict[str, str]) -> dict:
        """Generic entry for a provider that cannot use its own callback route."""
        gateway = str(body.get("gateway") or body.get("provider") or body.get("paymentMethod") or "").lower()
        if gateway == "bkash":
            url = self.bkash_callback(body)
        elif gateway == "nagad":
            url = self.nagad_callback(body)
        else:
            raise PaymentError(400, "Unsupported payment gateway")
        query = parse_qs(urlsplit(url).query)
        return {
            "status": "success" if query.get("status") == ["success"] else "failed",
            "orderId": (query.get("orderId") or [None])[0],
        }


# ---------------------------------------------------------------------------
# HTTP
# ---------------------------------------------------------------------------


class InitiateBody(BaseModel):
    packageId: str = Field(min_length=1)
    gateway: Gateway


class VerifyBody(BaseModel):
    orderId: str = Field(min_length=1)


class ConsumeBody(BaseModel):
    feature: Literal["ai_chat", "ask_ai"]
    cost: int = Field(default=1, ge=1, le=20)


class RefundBody(BaseModel):
    transactionId: str = Field(min_length=1)


def _learner(learner_id: str | None) -> str:
    if learner_id and _LEARNER_ID.match(learner_id):
        return learner_id
    raise PaymentError(401, "Unauthorized")


def _client_ip(request: Request) -> str:
    # Nagad wants the payer's address. Behind the proxy that is the first hop
    # it recorded; the value is informational to Nagad, not a security check.
    forwarded = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
    return forwarded or (request.client.host if request.client else "") or "0.0.0.0"


async def _callback_params(request: Request) -> dict[str, str]:
    params = dict(request.query_params)
    if request.method == "POST":
        if "json" in request.headers.get("content-type", ""):
            try:
                body = await request.json()
            except ValueError:
                body = {}
            if isinstance(body, dict):
                params.update({k: str(v) for k, v in body.items() if v is not None})
        else:
            form = await request.form()
            params.update({k: str(v) for k, v in form.items()})
    return params


def _payment_routes(prefix: str, service: Payments) -> APIRouter:
    router = APIRouter(prefix=prefix)
    store = service.store

    @router.get("/methods")
    def methods():
        return {"methods": service.gateway_options()}

    @router.get("/packages")
    def packages():
        return {"currency": "BDT", "packages": store.subscription_packages(), "gateways": service.gateway_options()}

    @router.get("/credit-packages")
    def credit_packages(x_learner_id: str | None = Header(default=None)):
        _learner(x_learner_id)
        return {"currency": "BDT", "packages": store.credit_packages(), "gateways": service.gateway_options()}

    @router.post("/initiate", status_code=201)
    def initiate(body: InitiateBody, request: Request, x_learner_id: str | None = Header(default=None)):
        return service.initiate(
            _learner(x_learner_id), "subscription", body.packageId, body.gateway, _client_ip(request)
        )

    @router.post("/credits/initiate", status_code=201)
    def initiate_credits(body: InitiateBody, request: Request, x_learner_id: str | None = Header(default=None)):
        return service.initiate(_learner(x_learner_id), "credits", body.packageId, body.gateway, _client_ip(request))

    @router.post("/verify")
    def verify(body: VerifyBody, x_learner_id: str | None = Header(default=None)):
        return service.verify(_learner(x_learner_id), body.orderId)

    @router.get("/subscription/status")
    def subscription(x_learner_id: str | None = Header(default=None)):
        return store.subscription(_learner(x_learner_id))

    @router.get("/history")
    def history(x_learner_id: str | None = Header(default=None)):
        return {"items": store.history(_learner(x_learner_id))}

    # Public: the gateways call these, carrying no identity. They only locate
    # a payment; approval still takes a successful execute or verify.
    @router.api_route("/bkash/callback", methods=["GET", "POST"])
    async def bkash_callback(request: Request):
        url = await run_in_threadpool(service.bkash_callback, await _callback_params(request))
        return RedirectResponse(url, status_code=302)

    @router.api_route("/nagad/callback", methods=["GET", "POST"])
    async def nagad_callback(request: Request):
        url = await run_in_threadpool(service.nagad_callback, await _callback_params(request))
        return RedirectResponse(url, status_code=302)

    @router.post("/webhook")
    @router.post("/callback")
    async def webhook(request: Request):
        return await run_in_threadpool(service.webhook, await _callback_params(request))

    return router


def _credit_routes(store: PaymentsStore) -> APIRouter:
    router = APIRouter(prefix="/ai/credits")

    @router.get("/balance")
    def balance(x_learner_id: str | None = Header(default=None)):
        return store.balance(_learner(x_learner_id))

    @router.get("/packages")
    def packages():
        return store.credit_packages()

    @router.post("/consume")
    def consume(body: ConsumeBody, x_learner_id: str | None = Header(default=None)):
        return store.consume(_learner(x_learner_id), body.feature, body.cost)

    # Not an upstream route: there the server that ran the model refunded a
    # failed turn itself. Here the model is SenseiClaw, so the app asks.
    @router.post("/refund")
    def refund(body: RefundBody, x_learner_id: str | None = Header(default=None)):
        return store.refund(_learner(x_learner_id), body.transactionId)

    return router


_OWNED_PREFIXES = ("/payment", "/ai/credits")


def build(db_path: str | os.PathLike) -> Payments:
    """The production wiring: gateways and settings from the environment."""
    return Payments(
        PaymentsStore(db_path),
        BkashGateway(BkashConfig.from_env()),
        NagadGateway(NagadConfig.from_env()),
        PaymentSettings.from_env(),
    )


def install(app, service: Payments) -> None:
    """Mount the routes and the NestJS-style error format the client reads.

    Chains onto any validation handler already installed (community.py's), so
    each module formats errors only for its own paths.
    """
    for prefix in ("/payments", "/payment"):
        app.include_router(_payment_routes(prefix, service))
    app.include_router(_credit_routes(service.store))

    @app.exception_handler(PaymentError)
    async def _payment_error(_request: Request, exc: PaymentError):
        content: dict = {"statusCode": exc.status, "message": exc.message}
        if exc.code:
            content["code"] = exc.code
        return JSONResponse(status_code=exc.status, content=content)

    previous = app.exception_handlers.get(RequestValidationError)

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
        if previous is not None:
            return await previous(request, exc)
        from fastapi.exception_handlers import request_validation_exception_handler

        return await request_validation_exception_handler(request, exc)
