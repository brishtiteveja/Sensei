"""Payment and AI-credit routes, against an in-memory database.

The state machine is exercised through fake gateways: what approves a payment,
what cannot, and that nothing is fulfilled twice. The real bKash and Nagad
clients are then run against a mock transport, which is where a wrong byte
would otherwise surface only against a live merchant account.
"""

from __future__ import annotations

import base64
import json
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from urllib.parse import parse_qs, urlsplit

import httpx
import pytest
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from fastapi import FastAPI
from fastapi.testclient import TestClient

from sensei import payments
from sensei.payment_gateways import (
    BkashConfig,
    BkashCreateResult,
    BkashGateway,
    BkashResult,
    GatewayError,
    NagadConfig,
    NagadGateway,
    NagadInitResult,
    NagadVerifyResult,
)

ALICE = {"X-Learner-Id": "l_alice"}
BOB = {"X-Learner-Id": "l_bob"}


@dataclass
class FakeBkash:
    configured: bool = True
    execute_status: str = "success"
    execute_amount: str | None = None  # None: whatever was asked
    query_status: str = "pending"
    fail_execute: bool = False
    created: dict = field(default_factory=dict)  # paymentID -> amount
    executed: list = field(default_factory=list)

    def create_payment(self, *, amount, invoice_number, callback_url):
        pid = f"BK{len(self.created) + 1}"
        self.created[pid] = amount
        self.callback_url = callback_url
        return BkashCreateResult(payment_id=pid, bkash_url=f"https://bkash.test/{pid}", raw={"paymentID": pid})

    def execute_payment(self, payment_id):
        self.executed.append(payment_id)
        if self.fail_execute:
            raise GatewayError("bKash is unreachable")
        amount = self.execute_amount or f"{self.created[payment_id]:.2f}"
        return BkashResult(status=self.execute_status, payment_id=payment_id, trx_id=f"TRX-{payment_id}",
                           amount=amount, raw={"transactionStatus": "Completed"})

    def query_payment(self, payment_id):
        return BkashResult(status=self.query_status, payment_id=payment_id, trx_id=f"TRX-{payment_id}",
                           amount=f"{self.created[payment_id]:.2f}", raw={"transactionStatus": "x"})


@dataclass
class FakeNagad:
    configured: bool = True
    verify_status: str = "success"
    started: dict = field(default_factory=dict)  # ref -> amount
    verified: list = field(default_factory=list)

    def initiate(self, *, order_id, amount, callback_url, client_ip):
        ref = f"NG{len(self.started) + 1}"
        self.started[ref] = amount
        return NagadInitResult(checkout_url=f"https://nagad.test/{ref}", payment_reference_id=ref, raw={})

    def verify(self, ref):
        self.verified.append(ref)
        return NagadVerifyResult(status=self.verify_status, transaction_id=f"NTX-{ref}",
                                 amount=f"{self.started.get(ref, 0):.2f}", raw={"status": self.verify_status})


SETTINGS = payments.PaymentSettings(callback_base_url="https://api.test/", deep_link_base="sensei://")


@pytest.fixture
def gw() -> tuple[FakeBkash, FakeNagad]:
    return FakeBkash(), FakeNagad()


@pytest.fixture
def service(gw) -> payments.Payments:
    return payments.Payments(payments.PaymentsStore(":memory:"), gw[0], gw[1], SETTINGS)


@pytest.fixture
def client(service) -> TestClient:
    app = FastAPI()
    payments.install(app, service)
    return TestClient(app)


def buy(client: TestClient, who=ALICE, package="sub_1m", gateway="bkash", path="/payment/initiate") -> dict:
    r = client.post(path, json={"packageId": package, "gateway": gateway}, headers=who)
    assert r.status_code == 201, r.text
    return r.json()


def pid(order: dict) -> str:
    return order["checkoutURL"].rsplit("/", 1)[1]


def callback(client: TestClient, gateway: str, **params) -> dict:
    r = client.get(f"/payments/{gateway}/callback", params=params, follow_redirects=False)
    assert r.status_code == 302, r.text
    parts = urlsplit(r.headers["location"])
    assert f"{parts.scheme}://{parts.netloc}{parts.path}" == "sensei://payment-result"
    return {k: v[0] for k, v in parse_qs(parts.query).items()}


# -- catalog -------------------------------------------------------------------


def test_packages_and_gateways(client, gw):
    body = client.get("/payment/packages").json()
    assert body["currency"] == "BDT"
    assert [p["name"] for p in body["packages"]] == ["7 Days", "1 Month", "3 Months", "6 Months"]
    assert [p["id"] for p in body["packages"] if p["popular"]] == ["sub_3m"]
    assert [(g["id"], g["enabled"]) for g in body["gateways"]] == [("bkash", True), ("nagad", True)]

    gw[1].configured = False
    methods = client.get("/payments/methods").json()["methods"]
    assert [(g["id"], g["enabled"]) for g in methods] == [("bkash", True), ("nagad", False)]


def test_credit_packages_need_a_learner(client):
    assert client.get("/payment/credit-packages").status_code == 401
    body = client.get("/payment/credit-packages", headers=ALICE).json()
    assert [p["credits"] for p in body["packages"]] == [100, 300, 800]
    assert [p["credits"] for p in client.get("/ai/credits/packages").json()] == [100, 300, 800]


# -- initiate ------------------------------------------------------------------


def test_initiate_shape_and_callback_url(client, gw):
    order = buy(client, package="sub_3m")
    assert order["checkoutURL"].startswith("https://bkash.test/")
    assert {k: order[k] for k in ("gateway", "amount", "currency", "packageName", "status")} == {
        "gateway": "bkash", "amount": 499, "currency": "BDT", "packageName": "3 Months", "status": "pending",
    }
    assert gw[0].callback_url == "https://api.test/payments/bkash/callback"


def test_initiate_errors(client, gw):
    r = client.post("/payment/initiate", json={"packageId": "nope", "gateway": "bkash"}, headers=ALICE)
    assert (r.status_code, r.json()["message"]) == (404, "Subscription package not found")
    r = client.post("/payment/credits/initiate", json={"packageId": "sub_1m", "gateway": "bkash"}, headers=ALICE)
    assert (r.status_code, r.json()["message"]) == (404, "AI credit package not found")
    r = client.post("/payment/initiate", json={"packageId": "sub_1m", "gateway": "visa"}, headers=ALICE)
    assert (r.status_code, r.json()["message"]) == (400, "Validation failed")
    assert client.post("/payment/initiate", json={"packageId": "sub_1m", "gateway": "bkash"}).status_code == 401

    gw[0].configured = False
    r = client.post("/payment/initiate", json={"packageId": "sub_1m", "gateway": "bkash"}, headers=ALICE)
    assert (r.status_code, r.json()["message"]) == (503, "bKash gateway is not configured")
    # Refused before any order was written.
    assert client.get("/payment/history", headers=ALICE).json()["items"] == []


def test_missing_callback_url_is_503(gw):
    service = payments.Payments(payments.PaymentsStore(), gw[0], gw[1], payments.PaymentSettings())
    app = FastAPI()
    payments.install(app, service)
    r = TestClient(app).post("/payment/initiate", json={"packageId": "sub_1m", "gateway": "nagad"}, headers=ALICE)
    assert r.status_code == 503
    assert "NAGAD_CALLBACK_URL" in r.json()["message"]


def test_gateway_failure_rejects_the_order(client, gw):
    def boom(**_):
        raise GatewayError("bKash token grant failed")

    gw[0].create_payment = boom
    r = client.post("/payment/initiate", json={"packageId": "sub_1m", "gateway": "bkash"}, headers=ALICE)
    assert (r.status_code, r.json()["message"]) == (503, "bKash token grant failed")
    [item] = client.get("/payment/history", headers=ALICE).json()["items"]
    assert item["status"] == "failed"


# -- bKash callback --------------------------------------------------------------


def test_bkash_success_activates_subscription(client, gw):
    order = buy(client)
    link = callback(client, "bkash", paymentID=pid(order), status="success")
    assert link == {"status": "success", "orderId": order["orderId"]}

    sub = client.get("/payment/subscription/status", headers=ALICE).json()
    assert sub["isActive"] is True
    assert sub["subscription"]["packageName"] == "1 Month"
    assert sub["subscription"]["daysRemaining"] == 30

    verify = client.post("/payment/verify", json={"orderId": order["orderId"]}, headers=ALICE).json()
    assert verify["status"] == "success"
    assert verify["transactionId"] == f"TRX-{pid(order)}"


def test_bkash_callback_is_idempotent(client, gw):
    order = buy(client)
    callback(client, "bkash", paymentID=pid(order), status="success")
    again = callback(client, "bkash", paymentID=pid(order), status="success")
    assert again["status"] == "success"
    # Executed once: the second callback is answered from the database.
    assert gw[0].executed == [pid(order)]
    assert client.get("/payment/subscription/status", headers=ALICE).json()["subscription"]["daysRemaining"] == 30


def test_concurrent_callbacks_capture_once(client, gw, service):
    """Two callbacks in flight for one order: one executes, the other waits
    and is answered from the database instead of racing it to a rejection."""
    import threading
    import time

    order = buy(client)
    real_execute = gw[0].execute_payment

    def slow_execute(payment_id):
        time.sleep(0.2)
        return real_execute(payment_id)

    gw[0].execute_payment = slow_execute
    links: list[str] = []
    threads = [
        threading.Thread(target=lambda: links.append(
            service.bkash_callback({"paymentID": pid(order), "status": "success"})))
        for _ in range(2)
    ]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    assert gw[0].executed == [pid(order)]
    assert all("status=success" in link for link in links)


def test_bkash_cancel_rejects_and_stays_rejected(client, gw):
    order = buy(client)
    assert callback(client, "bkash", paymentID=pid(order), status="cancel") == {
        "status": "failed", "orderId": order["orderId"], "reason": "payment_cancel",
    }
    # A later "success" for the same order must not capture money it will not honour.
    late = callback(client, "bkash", paymentID=pid(order), status="success")
    assert late["reason"] == "payment_rejected"
    assert gw[0].executed == []
    assert client.get("/payment/subscription/status", headers=ALICE).json()["isActive"] is False


def test_bkash_amount_mismatch_rejects(client, gw):
    gw[0].execute_amount = "1.00"
    order = buy(client)
    assert callback(client, "bkash", paymentID=pid(order), status="success")["reason"] == "amount_mismatch"
    assert client.get("/payment/subscription/status", headers=ALICE).json()["isActive"] is False


def test_bkash_execute_failures(client, gw):
    gw[0].fail_execute = True
    order = buy(client)
    assert callback(client, "bkash", paymentID=pid(order), status="success")["reason"] == "execute_failed"

    gw[0].fail_execute = False
    gw[0].execute_status = "failed"
    order = buy(client)
    assert callback(client, "bkash", paymentID=pid(order), status="success")["reason"] == "execute_invalid"


def test_unknown_payment(client):
    assert callback(client, "bkash", paymentID="nope", status="success") == {"status": "failed", "reason": "not_found"}
    assert callback(client, "nagad", payment_ref_id="nope", status="Success")["reason"] == "not_found"


def test_post_callback_with_form_body(client, gw):
    order = buy(client)
    r = client.post("/payment/bkash/callback", data={"paymentID": pid(order), "status": "success"},
                    follow_redirects=False)
    assert r.status_code == 302
    assert "status=success" in r.headers["location"]


def test_subscriptions_stack(client, gw):
    first = buy(client, package="sub_7d")
    callback(client, "bkash", paymentID=pid(first), status="success")
    second = buy(client, package="sub_1m")
    callback(client, "bkash", paymentID=pid(second), status="success")
    sub = client.get("/payment/subscription/status", headers=ALICE).json()["subscription"]
    assert sub["daysRemaining"] == 37
    assert sub["packageName"] == "1 Month"


# -- Nagad callback --------------------------------------------------------------


def test_nagad_success(client, gw):
    order = buy(client, gateway="nagad", package="sub_3m")
    link = callback(client, "nagad", payment_ref_id=pid(order), status="Success")
    assert link == {"status": "success", "orderId": order["orderId"]}
    assert client.get("/payment/subscription/status", headers=ALICE).json()["subscription"]["packageName"] == "3 Months"


def test_nagad_verifies_the_stored_reference(client, gw, service):
    order = buy(client, gateway="nagad")
    ref = service.store.payment(order["orderId"])["reference_code"]
    # Found by order_id; the payment_ref_id in the URL is not ours and must
    # not be what gets verified.
    link = callback(client, "nagad", payment_ref_id="SOMEONE-ELSES", order_id=ref, status="Success")
    assert link["status"] == "success"
    assert gw[1].verified == [pid(order)]


def test_nagad_verify_failure_rejects(client, gw):
    gw[1].verify_status = "failed"
    order = buy(client, gateway="nagad")
    assert callback(client, "nagad", payment_ref_id=pid(order), status="Success")["reason"] == "verify_invalid"


def test_callback_for_the_wrong_gateway_is_not_found(client, gw):
    order = buy(client, gateway="bkash")
    assert callback(client, "nagad", payment_ref_id=pid(order), status="Success")["reason"] == "not_found"


# -- verify ----------------------------------------------------------------------


def test_verify_polls_and_settles(client, gw):
    order = buy(client)
    assert client.post("/payment/verify", json={"orderId": order["orderId"]}, headers=ALICE).json()["status"] == "pending"
    gw[0].query_status = "success"
    assert client.post("/payment/verify", json={"orderId": order["orderId"]}, headers=ALICE).json()["status"] == "success"
    assert client.get("/payment/subscription/status", headers=ALICE).json()["isActive"] is True
    gw[0].query_status = "failed"  # a settled payment is never reopened
    assert client.post("/payment/verify", json={"orderId": order["orderId"]}, headers=ALICE).json()["status"] == "success"


def test_verify_is_scoped_to_the_learner(client):
    order = buy(client)
    r = client.post("/payment/verify", json={"orderId": order["orderId"]}, headers=BOB)
    assert (r.status_code, r.json()["message"]) == (404, "Payment not found")


def test_webhook_routes_by_gateway(client, gw):
    order = buy(client)
    r = client.post("/payments/webhook", json={"gateway": "bKash", "paymentID": pid(order), "status": "success"})
    assert r.json() == {"status": "success", "orderId": order["orderId"]}
    r = client.post("/payment/callback", json={"paymentID": pid(order)})
    assert (r.status_code, r.json()["message"]) == (400, "Unsupported payment gateway")


# -- AI credits ------------------------------------------------------------------


def test_new_learner_gets_free_credits(client):
    assert client.get("/ai/credits/balance", headers=ALICE).json() == {
        "scope": "user", "totalCredits": 20, "usedCredits": 0, "availableCredits": 20,
    }
    assert client.get("/ai/credits/balance").status_code == 401


def test_consume_until_empty_then_402(client):
    for _ in range(20):
        r = client.post("/ai/credits/consume", json={"feature": "ai_chat"}, headers=ALICE)
        assert r.status_code == 200 and r.json()["code"] == "CREDIT_CONSUMED"
    assert r.json()["availableCredits"] == 0
    r = client.post("/ai/credits/consume", json={"feature": "ai_chat"}, headers=ALICE)
    assert r.status_code == 402
    assert r.json() == {"statusCode": 402, "message": "No AI credits remaining", "code": "INSUFFICIENT_USER_CREDIT"}


def test_refund_is_once_and_own_only(client):
    used = client.post("/ai/credits/consume", json={"feature": "ai_chat", "cost": 3}, headers=ALICE).json()
    assert used["availableCredits"] == 17
    assert client.post("/ai/credits/refund", json={"transactionId": used["transactionId"]}, headers=BOB).status_code == 409
    first = client.post("/ai/credits/refund", json={"transactionId": used["transactionId"]}, headers=ALICE).json()
    again = client.post("/ai/credits/refund", json={"transactionId": used["transactionId"]}, headers=ALICE).json()
    assert first["availableCredits"] == again["availableCredits"] == 20
    assert first["transactionId"] == again["transactionId"]
    # A refund is not itself refundable.
    assert client.post("/ai/credits/refund", json={"transactionId": first["transactionId"]}, headers=ALICE).status_code == 409


def test_credit_purchase_adds_credits_once(client, gw):
    order = buy(client, package="credits_300", path="/payment/credits/initiate")
    assert order["packageName"] == "Plus AI Credits"
    callback(client, "bkash", paymentID=pid(order), status="success")
    callback(client, "bkash", paymentID=pid(order), status="success")
    gw[0].query_status = "success"
    client.post("/payment/verify", json={"orderId": order["orderId"]}, headers=ALICE)
    assert client.get("/ai/credits/balance", headers=ALICE).json()["availableCredits"] == 320
    [item] = client.get("/payment/history", headers=ALICE).json()["items"]
    assert (item["kind"], item["status"], item["amount"]) == ("ai_credit", "success", 129)
    # And bought credits never show on a subscription.
    assert client.get("/payment/subscription/status", headers=ALICE).json()["isActive"] is False


def test_subscribers_chat_free(client, gw):
    order = buy(client)
    callback(client, "bkash", paymentID=pid(order), status="success")
    r = client.post("/ai/credits/consume", json={"feature": "ai_chat"}, headers=ALICE).json()
    assert (r["code"], r["transactionId"], r["availableCredits"]) == ("SUBSCRIPTION_ACTIVE", None, 20)


def test_expired_subscription_stops_counting(client, gw, service):
    order = buy(client, package="sub_7d")
    callback(client, "bkash", paymentID=pid(order), status="success")
    past = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat(timespec="milliseconds").replace("+00:00", "Z")
    service.store._conn.execute("UPDATE user_subscription SET end_date = ?", (past,))
    assert client.get("/payment/subscription/status", headers=ALICE).json() == {"isActive": False, "subscription": None}
    assert client.post("/ai/credits/consume", json={"feature": "ai_chat"}, headers=ALICE).json()["code"] == "CREDIT_CONSUMED"


# -- the real gateway clients, against a mock transport ----------------------------


def test_bkash_client_wire_format_and_token_cache():
    calls: list[tuple[str, dict, dict]] = []

    def handler(request: httpx.Request) -> httpx.Response:
        body = json.loads(request.content)
        calls.append((request.url.path, dict(request.headers), body))
        if request.url.path.endswith("/token/grant"):
            return httpx.Response(200, json={"id_token": "TOKEN", "expires_in": 3600})
        if request.url.path.endswith("/create"):
            return httpx.Response(200, json={"paymentID": "PID", "bkashURL": "https://pay/PID"})
        if request.url.path.endswith("/execute"):
            return httpx.Response(200, json={"transactionStatus": "Completed", "statusCode": "0000",
                                             "trxID": "TRX", "amount": "199.00"})
        return httpx.Response(200, json={"transactionStatus": "Initiated"})

    gateway = BkashGateway(
        BkashConfig(base_url="https://bk.test/v1.2.0-beta/", app_key="K", app_secret="S", username="u", password="p"),
        client=httpx.Client(transport=httpx.MockTransport(handler)),
    )
    created = gateway.create_payment(amount=199, invoice_number="SN-1", callback_url="https://api/cb")
    executed = gateway.execute_payment(created.payment_id)
    queried = gateway.query_payment(created.payment_id)

    paths = [c[0] for c in calls]
    assert paths.count("/v1.2.0-beta/tokenized/checkout/token/grant") == 1  # cached across calls
    _, headers, body = calls[1]
    assert headers["authorization"] == "TOKEN" and headers["x-app-key"] == "K"
    assert body == {"mode": "0011", "payerReference": "SN-1", "callbackURL": "https://api/cb", "amount": "199.00",
                    "currency": "BDT", "intent": "sale", "merchantInvoiceNumber": "SN-1"}
    assert (executed.status, executed.trx_id, executed.amount) == ("success", "TRX", "199.00")
    assert queried.status == "pending"


def test_bkash_client_unconfigured_and_html_errors():
    with pytest.raises(GatewayError, match="not configured"):
        BkashGateway(BkashConfig()).create_payment(amount=1, invoice_number="x", callback_url="y")

    html = httpx.Client(transport=httpx.MockTransport(lambda r: httpx.Response(502, text="<html>bad gateway")))
    gateway = BkashGateway(BkashConfig(app_key="K", app_secret="S", username="u", password="p"), client=html)
    with pytest.raises(GatewayError, match="token grant failed"):
        gateway.create_payment(amount=1, invoice_number="x", callback_url="y")


def _pem(key, public=False) -> str:
    if public:
        return key.public_key().public_bytes(
            serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo
        ).decode()
    return key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.TraditionalOpenSSL,
                             serialization.NoEncryption()).decode()


def _bare(key, public=False) -> str:
    """The panel's form: base64 DER, no PEM armour."""
    if public:
        der = key.public_key().public_bytes(serialization.Encoding.DER, serialization.PublicFormat.SubjectPublicKeyInfo)
    else:
        der = key.private_bytes(serialization.Encoding.DER, serialization.PrivateFormat.PKCS8,
                                serialization.NoEncryption())
    return base64.b64encode(der).decode()


@pytest.mark.parametrize("armour", [_pem, _bare])
def test_nagad_client_handshake(armour):
    merchant = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    nagad = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    seen: dict = {}

    def open_and_check(body: dict) -> dict:
        """What Nagad does: decrypt with its key, verify the merchant's signature."""
        plain = nagad.decrypt(base64.b64decode(body["sensitiveData"]), padding.PKCS1v15())
        merchant.public_key().verify(base64.b64decode(body["signature"]), plain, padding.PKCS1v15(), hashes.SHA256())
        assert b" " not in plain  # JSON.stringify spacing, or the signature fails upstream
        return json.loads(plain)

    def handler(request: httpx.Request) -> httpx.Response:
        path = request.url.path
        if "/check-out/initialize/" in path:
            assert request.headers["x-km-ip-v4"] == "203.0.113.9"
            body = json.loads(request.content)
            sensitive = open_and_check(body)
            seen["init"] = (path, body, sensitive)
            reply = json.dumps({"paymentReferenceId": "REF1", "challenge": "CH-FROM-NAGAD"}).encode()
            enc = merchant.public_key().encrypt(reply, padding.PKCS1v15())
            return httpx.Response(200, json={"sensitiveData": base64.b64encode(enc).decode(), "signature": "x"})
        if "/check-out/complete/REF1" in path:
            body = json.loads(request.content)
            seen["complete"] = (body, open_and_check(body))
            return httpx.Response(200, json={"callBackUrl": "https://nagad.test/pay/REF1", "status": "Success"})
        if "/verify/payment/REF1" in path:
            return httpx.Response(200, json={"status": "Success", "issuerPaymentRefNo": "ISS1", "amount": "499.00"})
        return httpx.Response(404)

    gateway = NagadGateway(
        NagadConfig(
            base_url="http://ng.test/api/dfs/",
            merchant_id="683002007104225",
            merchant_private_key=armour(merchant),
            pg_public_key=armour(nagad, public=True),
        ),
        client=httpx.Client(transport=httpx.MockTransport(handler)),
    )
    result = gateway.initiate(order_id="SN-ABC", amount=499, callback_url="https://api/cb", client_ip="203.0.113.9")
    assert (result.checkout_url, result.payment_reference_id) == ("https://nagad.test/pay/REF1", "REF1")

    path, body, init = seen["init"]
    assert path == "/api/dfs/check-out/initialize/683002007104225/SN-ABC"
    assert body["accountNumber"] == "683002007104225" and body["dateTime"] == init["datetime"]
    assert list(init) == ["merchantId", "datetime", "orderId", "challenge"]
    assert len(init["challenge"]) == 40
    # Dhaka local time, whatever the server's zone.
    stamp = datetime.strptime(init["datetime"], "%Y%m%d%H%M%S")
    dhaka_now = datetime.now(timezone(timedelta(hours=6))).replace(tzinfo=None)
    assert abs((dhaka_now - stamp).total_seconds()) < 120

    complete_body, complete = seen["complete"]
    assert complete == {"merchantId": "683002007104225", "orderId": "SN-ABC", "currencyCode": "050",
                        "amount": "499.00", "challenge": "CH-FROM-NAGAD"}
    assert complete_body["merchantCallbackURL"] == "https://api/cb"

    verified = gateway.verify("REF1")
    assert (verified.status, verified.transaction_id, verified.amount) == ("success", "ISS1", "499.00")


def test_nagad_client_unconfigured():
    with pytest.raises(GatewayError, match="not configured"):
        NagadGateway(NagadConfig()).initiate(order_id="x", amount=1, callback_url="y", client_ip="z")
