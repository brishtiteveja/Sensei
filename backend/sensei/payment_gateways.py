"""bKash and Nagad clients for payments.py.

Ports of ShikkhaDikkha's gateways/bkash.gateway.ts and gateways/nagad.gateway.ts.
The requests are byte-for-byte what those send -- same endpoints, headers,
bodies and success rules -- because a merchant account approved against one is
approved against the other.

These are the only calls in Sensei that are meant to leave the box. They do not
go through config.assert_no_egress: that guard is about the tutor model, and a
payment gateway is off-box by definition. Payments simply do not work offline.
"""

from __future__ import annotations

import base64
import json
import logging
import os
import secrets
import threading
import time
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Literal
from urllib.parse import quote

import httpx
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding

log = logging.getLogger("sensei.payments")

GatewayStatus = Literal["success", "failed", "pending"]

BKASH_SANDBOX_URL = "https://tokenized.sandbox.bka.sh/v1.2.0-beta"
NAGAD_SANDBOX_URL = "http://sandbox.mynagad.com:10080/remote-payment-gateway-1.0/api/dfs/"

# Bangladesh has had no DST since 2009, so a fixed offset is exact and needs no
# tzdata on the box. Nagad rejects a datetime that is not Dhaka local time.
DHAKA = timezone(timedelta(hours=6))

_TIMEOUT = httpx.Timeout(30.0)


class GatewayError(Exception):
    """The gateway is unconfigured, unreachable or refused the request. Maps to 503."""


def _json(res: httpx.Response) -> dict:
    # Gateways answer HTML error pages often enough that a JSON decode error
    # must not be what the student sees.
    try:
        data = res.json()
    except ValueError:
        return {}
    return data if isinstance(data, dict) else {}


# ---------------------------------------------------------------------------
# bKash (tokenized checkout)
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class BkashConfig:
    base_url: str = BKASH_SANDBOX_URL
    app_key: str = ""
    app_secret: str = ""
    username: str = ""
    password: str = ""

    @classmethod
    def from_env(cls) -> BkashConfig:
        return cls(
            base_url=os.environ.get("BKASH_BASE_URL") or BKASH_SANDBOX_URL,
            app_key=os.environ.get("BKASH_APP_KEY", ""),
            app_secret=os.environ.get("BKASH_APP_SECRET", ""),
            username=os.environ.get("BKASH_USERNAME", ""),
            password=os.environ.get("BKASH_PASSWORD", ""),
        )

    @property
    def configured(self) -> bool:
        return all((self.base_url, self.app_key, self.app_secret, self.username, self.password))


@dataclass
class BkashCreateResult:
    payment_id: str
    bkash_url: str
    raw: dict


@dataclass
class BkashResult:
    status: GatewayStatus
    payment_id: str
    trx_id: str | None = None
    amount: str | None = None
    status_message: str | None = None
    raw: dict = field(default_factory=dict)


class BkashGateway:
    def __init__(self, config: BkashConfig, client: httpx.Client | None = None) -> None:
        self.config = config
        self._client = client or httpx.Client(timeout=_TIMEOUT)
        self._token: tuple[str, float] | None = None
        self._token_lock = threading.Lock()

    @property
    def configured(self) -> bool:
        return self.config.configured

    @property
    def _base(self) -> str:
        return self.config.base_url.rstrip("/")

    def _post(self, path: str, headers: dict, body: dict) -> httpx.Response:
        try:
            return self._client.post(
                f"{self._base}{path}",
                headers={"Content-Type": "application/json", "Accept": "application/json", **headers},
                json=body,
            )
        except httpx.HTTPError as e:
            raise GatewayError(f"bKash is unreachable: {e}") from e

    def _grant_token(self) -> str:
        with self._token_lock:
            now = time.time()
            # Refreshed 30 s early so a token never expires mid-request.
            if self._token and self._token[1] > now + 30:
                return self._token[0]
            if not self.configured:
                raise GatewayError("bKash gateway is not configured")

            res = self._post(
                "/tokenized/checkout/token/grant",
                {"username": self.config.username, "password": self.config.password},
                {"app_key": self.config.app_key, "app_secret": self.config.app_secret},
            )
            data = _json(res)
            token = data.get("id_token")
            if not res.is_success or not token:
                log.error("bKash token grant failed: %s", data)
                raise GatewayError(data.get("statusMessage") or "bKash token grant failed")

            self._token = (token, now + float(data.get("expires_in") or 3600))
            return token

    def _authed(self) -> dict:
        return {"Authorization": self._grant_token(), "X-App-Key": self.config.app_key}

    def create_payment(self, *, amount: int, invoice_number: str, callback_url: str) -> BkashCreateResult:
        res = self._post(
            "/tokenized/checkout/create",
            self._authed(),
            {
                "mode": "0011",
                "payerReference": invoice_number,
                "callbackURL": callback_url,
                "amount": f"{amount:.2f}",
                "currency": "BDT",
                "intent": "sale",
                "merchantInvoiceNumber": invoice_number,
            },
        )
        data = _json(res)
        if not res.is_success or not data.get("paymentID") or not data.get("bkashURL"):
            log.error("bKash create failed: %s", data)
            raise GatewayError(data.get("statusMessage") or "bKash payment creation failed")
        log.info("bKash payment created: paymentID=%s invoice=%s", data["paymentID"], invoice_number)
        return BkashCreateResult(payment_id=data["paymentID"], bkash_url=data["bkashURL"], raw=data)

    def execute_payment(self, payment_id: str) -> BkashResult:
        """Capture an authorised payment. Until this runs, no money moves."""
        res = self._post("/tokenized/checkout/execute", self._authed(), {"paymentID": payment_id})
        data = _json(res)
        ok = data.get("transactionStatus") == "Completed" and data.get("statusCode") == "0000"
        log.info(
            "bKash execute: paymentID=%s status=%s code=%s",
            payment_id, data.get("transactionStatus"), data.get("statusCode"),
        )
        return BkashResult(
            status="success" if ok else "failed",
            payment_id=payment_id,
            trx_id=data.get("trxID"),
            amount=data.get("amount"),
            status_message=data.get("statusMessage"),
            raw=data,
        )

    def query_payment(self, payment_id: str) -> BkashResult:
        res = self._post("/tokenized/checkout/payment/status", self._authed(), {"paymentID": payment_id})
        data = _json(res)
        state = str(data.get("transactionStatus") or "").lower()
        status: GatewayStatus = (
            "success" if state == "completed"
            else "failed" if state in ("cancelled", "failed", "expired")
            else "pending"
        )
        return BkashResult(
            status=status, payment_id=payment_id, trx_id=data.get("trxID"), amount=data.get("amount"), raw=data,
        )


# ---------------------------------------------------------------------------
# Nagad
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class NagadConfig:
    base_url: str = NAGAD_SANDBOX_URL
    merchant_id: str = ""
    # PEM, or bare base64 DER as Nagad's merchant panel hands it out.
    merchant_private_key: str = ""
    pg_public_key: str = ""

    @classmethod
    def from_env(cls) -> NagadConfig:
        return cls(
            base_url=os.environ.get("NAGAD_BASE_URL") or NAGAD_SANDBOX_URL,
            merchant_id=os.environ.get("NAGAD_MERCHANT_ID", ""),
            merchant_private_key=os.environ.get("NAGAD_MERCHANT_PRIVATE_KEY", ""),
            pg_public_key=os.environ.get("NAGAD_PG_PUBLIC_KEY", ""),
        )

    @property
    def configured(self) -> bool:
        return all((self.base_url, self.merchant_id, self.merchant_private_key.strip(), self.pg_public_key.strip()))


@dataclass
class NagadInitResult:
    checkout_url: str
    payment_reference_id: str
    raw: dict


@dataclass
class NagadVerifyResult:
    status: GatewayStatus
    transaction_id: str
    amount: str
    raw: dict


def _compact(data: dict) -> str:
    # Must match JSON.stringify exactly: Nagad checks the signature against the
    # text it decrypts, and Python's default separators add spaces.
    return json.dumps(data, separators=(",", ":"))


def _load_private_key(raw: str):
    raw = raw.strip()
    if "BEGIN" in raw:
        return serialization.load_pem_private_key(raw.replace("\\n", "\n").encode(), password=None)
    # DER loading accepts both PKCS#8 and PKCS#1, which covers every form the
    # merchant panel has been seen to issue.
    return serialization.load_der_private_key(base64.b64decode(raw), password=None)


def _load_public_key(raw: str):
    raw = raw.strip()
    if "BEGIN" in raw:
        return serialization.load_pem_public_key(raw.replace("\\n", "\n").encode())
    return serialization.load_der_public_key(base64.b64decode(raw))


class NagadGateway:
    def __init__(self, config: NagadConfig, client: httpx.Client | None = None) -> None:
        self.config = config
        self._client = client or httpx.Client(timeout=_TIMEOUT)

    @property
    def configured(self) -> bool:
        return self.config.configured

    @property
    def _base(self) -> str:
        return self.config.base_url.rstrip("/")

    def _keys(self):
        if not self.configured:
            raise GatewayError("Nagad gateway is not configured")
        try:
            return _load_private_key(self.config.merchant_private_key), _load_public_key(self.config.pg_public_key)
        except (ValueError, TypeError) as e:
            raise GatewayError(f"Nagad keys could not be read: {e}") from e

    @staticmethod
    def _datetime() -> str:
        return datetime.now(DHAKA).strftime("%Y%m%d%H%M%S")

    def _post(self, path: str, client_ip: str, body: dict) -> httpx.Response:
        try:
            return self._client.post(
                f"{self._base}{path}",
                headers={
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "X-KM-IP-V4": client_ip,
                    "X-KM-Client-Type": "PC_WEB",
                    "X-KM-Api-Version": "v-0.2.0",
                },
                json=body,
            )
        except httpx.HTTPError as e:
            raise GatewayError(f"Nagad is unreachable: {e}") from e

    def initiate(self, *, order_id: str, amount: int, callback_url: str, client_ip: str) -> NagadInitResult:
        private_key, pg_key = self._keys()
        merchant = self.config.merchant_id

        def encrypt(data: dict) -> str:
            return base64.b64encode(pg_key.encrypt(_compact(data).encode(), padding.PKCS1v15())).decode()

        def sign(data: dict) -> str:
            sig = private_key.sign(_compact(data).encode(), padding.PKCS1v15(), hashes.SHA256())
            return base64.b64encode(sig).decode()

        stamp = self._datetime()
        init = {
            "merchantId": merchant,
            "datetime": stamp,
            "orderId": order_id,
            "challenge": secrets.token_hex(20),
        }
        res = self._post(
            f"/check-out/initialize/{merchant}/{order_id}",
            client_ip,
            {"accountNumber": merchant, "dateTime": stamp, "sensitiveData": encrypt(init), "signature": sign(init)},
        )
        data = _json(res)
        if not res.is_success or not data.get("sensitiveData"):
            log.error("Nagad initialize failed: %s", data)
            raise GatewayError(data.get("message") or data.get("reason") or "Nagad initialize failed")

        try:
            plain = private_key.decrypt(base64.b64decode(data["sensitiveData"]), padding.PKCS1v15())
            reply = json.loads(plain)
            ref, challenge = reply["paymentReferenceId"], reply["challenge"]
        except (ValueError, KeyError, TypeError) as e:
            raise GatewayError(f"Nagad initialize reply could not be read: {e}") from e

        complete = {
            "merchantId": merchant,
            "orderId": order_id,
            "currencyCode": "050",
            "amount": f"{amount:.2f}",
            "challenge": challenge,
        }
        res = self._post(
            f"/check-out/complete/{ref}",
            client_ip,
            {"sensitiveData": encrypt(complete), "signature": sign(complete), "merchantCallbackURL": callback_url},
        )
        data = _json(res)
        if not res.is_success or not data.get("callBackUrl"):
            log.error("Nagad complete failed: %s", data)
            raise GatewayError(data.get("message") or data.get("reason") or "Nagad complete failed")

        log.info("Nagad payment initiated: paymentRef=%s order=%s", ref, order_id)
        return NagadInitResult(checkout_url=data["callBackUrl"], payment_reference_id=ref, raw=data)

    def verify(self, payment_reference_id: str) -> NagadVerifyResult:
        try:
            res = self._client.get(
                f"{self._base}/verify/payment/{quote(payment_reference_id, safe='')}",
                headers={"Accept": "application/json"},
            )
        except httpx.HTTPError as e:
            raise GatewayError(f"Nagad is unreachable: {e}") from e
        data = _json(res)
        state = str(data.get("status") or "").lower()
        status: GatewayStatus = (
            "success" if state == "success"
            else "failed" if state in ("failed", "cancelled", "canceled", "expired")
            else "pending"
        )
        log.info("Nagad verify: paymentRef=%s status=%s", payment_reference_id, data.get("status"))
        return NagadVerifyResult(
            status=status,
            transaction_id=data.get("issuerPaymentRefNo") or data.get("paymentRefId") or payment_reference_id,
            amount=str(data.get("amount") or "0"),
            raw=data,
        )
