"""Community routes, against an in-memory database.

Checks the behaviour the mobile client depends on: response shapes, the
reaction toggle, sharing rules, reply validation, pagination and the
`message` error format.
"""

from __future__ import annotations

from urllib.parse import quote

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from sensei import community
from sensei.learner import LearnerStore

ALICE = {"X-Learner-Id": "l_alice", "X-Learner-Name": quote("অ্যালিস")}
BOB = {"X-Learner-Id": "l_bob", "X-Learner-Name": "Bob"}
CAROL = {"X-Learner-Id": "l_carol"}


@pytest.fixture
def client() -> TestClient:
    learners = LearnerStore(":memory:")
    app = FastAPI()
    community.install(app, community.CommunityStore(learners.connection))
    return TestClient(app)


def attempt_body(selected: list[int | None]) -> dict:
    return {
        "questionSet": {
            "id": "physics",
            "name": "Physics Mock Test",
            "year": "2026",
            "subject": {"id": "physics", "name": "Physics"},
        },
        "timeTaken": 312,
        "answers": [
            {
                "questionId": f"q{i}",
                "selectedIndex": s,
                "question": {
                    "text": f"Question {i}",
                    "options": ["A", "B", "C", "D"],
                    "correctIndex": 1,
                    "explanation": "Because B.",
                },
            }
            for i, s in enumerate(selected)
        ],
    }


def share(client: TestClient, who: dict, selected=(1, 1, 0, None)) -> dict:
    attempt = client.post("/mocktest/attempts", json=attempt_body(list(selected)), headers=who)
    assert attempt.status_code == 201, attempt.text
    post = client.post("/community/share", json={"mocktestAttemptId": attempt.json()["id"]}, headers=who)
    assert post.status_code == 201, post.text
    return post.json()


def test_attempt_is_scored_on_the_server(client):
    res = client.post("/mocktest/attempts", json=attempt_body([1, 1, 0, None]), headers=ALICE)
    assert res.status_code == 201
    body = res.json()
    assert (body["score"], body["total"], body["percentage"], body["timeTaken"]) == (2, 4, 50, 312)
    assert body["questionSetId"] == "physics"


def test_share_returns_the_post_shape_and_is_idempotent(client):
    attempt = client.post("/mocktest/attempts", json=attempt_body([1]), headers=ALICE).json()
    first = client.post("/community/share", json={"mocktestAttemptId": attempt["id"]}, headers=ALICE).json()
    again = client.post("/community/share", json={"mocktestAttemptId": attempt["id"]}, headers=ALICE).json()

    assert first["id"] == again["id"]
    assert first["createdAt"] == again["createdAt"]
    assert first["user"] == {"id": "l_alice", "name": "অ্যালিস", "avatarUrl": None}
    assert first["attempt"]["questionSet"]["subject"] == {"id": "physics", "name": "Physics"}
    assert first["reactions"] == [] and first["commentsCount"] == 0 and first["myReaction"] is None


def test_cannot_share_someone_elses_attempt(client):
    attempt = client.post("/mocktest/attempts", json=attempt_body([1]), headers=ALICE).json()
    res = client.post("/community/share", json={"mocktestAttemptId": attempt["id"]}, headers=BOB)
    assert res.status_code == 403
    assert res.json()["message"] == "You can only share your own mocktest attempts"


def test_writes_need_a_learner_id_reads_do_not(client):
    assert client.post("/community/share", json={"mocktestAttemptId": "x"}).status_code == 401
    assert client.get("/community").status_code == 200


def test_reaction_toggles_switches_and_is_never_on_your_own_post(client):
    post = share(client, ALICE)
    react = lambda who, emoji: client.post(f"/community/{post['id']}/react", json={"emoji": emoji}, headers=who)

    assert react(ALICE, "FIRE").status_code == 403
    assert react(BOB, "FIRE").json() == {"myReaction": "FIRE", "reactions": [{"emoji": "FIRE", "count": 1}]}
    react(CAROL, "HEART")
    # Switching replaces, and the order is fixed with zero counts dropped.
    assert react(BOB, "WOW").json()["reactions"] == [
        {"emoji": "HEART", "count": 1},
        {"emoji": "WOW", "count": 1},
    ]
    # Same emoji again removes it.
    assert react(BOB, "WOW").json() == {"myReaction": None, "reactions": [{"emoji": "HEART", "count": 1}]}

    feed = client.get("/community", headers=CAROL).json()
    assert feed["data"][0]["myReaction"] == "HEART"
    assert client.get("/community").json()["data"][0]["myReaction"] is None


def test_bad_emoji_is_a_400_with_message(client):
    post = share(client, ALICE)
    res = client.post(f"/community/{post['id']}/react", json={"emoji": "THUMBS"}, headers=BOB)
    assert res.status_code == 400
    assert res.json()["message"] == "Validation failed"


def test_comments_replies_and_counts(client):
    post = share(client, ALICE)
    top = client.post(f"/community/{post['id']}/comment", json={"content": "  nice  "}, headers=BOB)
    assert top.status_code == 201
    top = top.json()
    assert top["content"] == "nice" and top["parentCommentId"] is None and top["reactions"] == []

    reply = client.post(
        f"/community/{post['id']}/comment",
        json={"content": "thanks", "replyToCommentId": top["id"]},
        headers=ALICE,
    ).json()
    assert reply["parentCommentId"] == top["id"]

    listing = client.get(f"/community/{post['id']}/comments").json()
    # Flat and newest first, replies included.
    assert [c["id"] for c in listing["data"]] == [reply["id"], top["id"]]
    assert client.get(f"/community/{post['id']}").json()["commentsCount"] == 2


def test_comment_validation_and_reply_must_stay_on_its_post(client):
    post = share(client, ALICE)
    other = share(client, BOB)
    url = f"/community/{post['id']}/comment"

    assert client.post(url, json={"content": "   "}, headers=BOB).status_code == 400
    assert client.post(url, json={"content": "x" * 501}, headers=BOB).status_code == 400

    foreign = client.post(f"/community/{other['id']}/comment", json={"content": "hi"}, headers=ALICE).json()
    res = client.post(url, json={"content": "hi", "replyToCommentId": foreign["id"]}, headers=BOB)
    assert res.status_code == 404
    assert res.json()["message"] == f"Community comment {foreign['id']} not found"


def test_comment_reactions(client):
    post = share(client, ALICE)
    comment = client.post(f"/community/{post['id']}/comment", json={"content": "hi"}, headers=BOB).json()
    url = f"/community/comments/{comment['id']}/react"

    assert client.post(url, json={"emoji": "PARTY"}, headers=BOB).status_code == 403
    assert client.post(url, json={"emoji": "PARTY"}, headers=ALICE).json()["myReaction"] == "PARTY"
    assert client.post("/community/comments/nope/react", json={"emoji": "PARTY"}, headers=ALICE).status_code == 404


def test_detail_has_the_attempt_snapshot(client):
    post = share(client, ALICE, selected=(1, 0))
    detail = client.get(f"/community/{post['id']}").json()
    answers = detail["attemptDetail"]["answers"]
    assert [a["isCorrect"] for a in answers] == [True, False]
    assert answers[0]["question"] == {
        "id": "q0",
        "text": "Question 0",
        "options": ["A", "B", "C", "D"],
        "correctIndex": 1,
        "explanation": "Because B.",
    }
    assert client.get("/community/nope").status_code == 404


def test_feed_pages_newest_first_without_overlap(client):
    ids = [share(client, ALICE)["id"] for _ in range(5)]
    first = client.get("/community", params={"limit": 2}).json()
    assert first["limit"] == 2 and first["nextCursor"]
    second = client.get("/community", params={"limit": 2, "cursor": first["nextCursor"]}).json()
    third = client.get("/community", params={"limit": 2, "cursor": second["nextCursor"]}).json()

    seen = [p["id"] for page in (first, second, third) for p in page["data"]]
    assert seen == list(reversed(ids))
    assert third["nextCursor"] is None


def test_limits_are_clamped(client):
    assert client.get("/community", params={"limit": 999}).json()["limit"] == 30
    assert client.get("/community", params={"limit": "abc"}).json()["limit"] == 10
