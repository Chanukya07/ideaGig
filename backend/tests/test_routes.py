"""Route tests. The OpenAI client is replaced by a fake; no real Groq calls."""

import json
import logging

import httpx2
import openai
import pytest
from fastapi.testclient import TestClient

from app.config import get_settings

from .conftest import CLIENT_B, load_fixture

VALID_REQUEST = {
    "skills": ["Python", "SQL"],
    "time_available": "weekend",
    "interest": "tools",
    "experience": "beginner",
}
MALFORMED = load_fixture("malformed_ideas.txt")


def provider_error(status: int) -> openai.APIStatusError:
    request = httpx2.Request("POST", "https://api.groq.com/openai/v1/chat/completions")
    response = httpx2.Response(status, request=request)
    cls = openai.RateLimitError if status == 429 else openai.InternalServerError
    return cls("provider error", response=response, body=None)


def saved_idea_payload(idea_id: str = "idea-1") -> dict:
    idea = json.loads(load_fixture("valid_ideas.json"))["ideas"][0]
    return {"id": idea_id, **idea}


# --- health and CORS ---------------------------------------------------------


def test_health(client: TestClient):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_cors_allows_only_the_frontend_origin(client: TestClient):
    allowed = client.get("/health", headers={"Origin": "http://localhost:3000"})
    assert allowed.headers["access-control-allow-origin"] == "http://localhost:3000"
    denied = client.get("/health", headers={"Origin": "https://evil.example"})
    assert "access-control-allow-origin" not in denied.headers


# --- generate ----------------------------------------------------------------


def test_generate_returns_three_ideas(client: TestClient, fake_openai, valid_ideas_json: str):
    fake = fake_openai(valid_ideas_json)
    response = client.post("/api/ideas/generate", json=VALID_REQUEST)
    assert response.status_code == 200
    ideas = response.json()["ideas"]
    assert len(ideas) == 3
    assert all(idea["id"] for idea in ideas)
    assert len(fake.calls) == 1


@pytest.mark.parametrize(
    "overrides",
    [
        {"time_available": "forever"},
        {"interest": "crypto"},
        {"experience": "guru"},
        {"skills": []},
        {"skills": [f"s{i}" for i in range(11)]},
    ],
)
def test_generate_rejects_invalid_input(client: TestClient, fake_openai, overrides: dict):
    fake = fake_openai()
    response = client.post("/api/ideas/generate", json={**VALID_REQUEST, **overrides})
    assert response.status_code == 422
    assert fake.calls == []


def test_generate_retries_once_with_error_appended(
    client: TestClient, fake_openai, valid_ideas_json: str
):
    fake = fake_openai(MALFORMED, valid_ideas_json)
    response = client.post("/api/ideas/generate", json=VALID_REQUEST)
    assert response.status_code == 200
    assert len(fake.calls) == 2
    retry_messages = fake.calls[1]["messages"]
    assert [m["role"] for m in retry_messages] == ["system", "user", "assistant", "user"]
    assert retry_messages[2]["content"] == MALFORMED
    assert "not valid JSON" in retry_messages[3]["content"]


def test_generate_retries_on_schema_violation(client: TestClient, fake_openai, valid_ideas_json):
    fake = fake_openai(load_fixture("two_ideas.json"), valid_ideas_json)
    response = client.post("/api/ideas/generate", json=VALID_REQUEST)
    assert response.status_code == 200
    assert "exactly 3" in fake.calls[1]["messages"][3]["content"]


def test_generate_returns_502_after_second_failure(client: TestClient, fake_openai):
    fake = fake_openai(MALFORMED, MALFORMED)
    response = client.post("/api/ideas/generate", json=VALID_REQUEST)
    assert response.status_code == 502
    assert "unusable answer" in response.json()["detail"]
    assert len(fake.calls) == 2


def test_generate_provider_rate_limit_is_friendly_and_not_retried(client: TestClient, fake_openai):
    fake = fake_openai(provider_error(429))
    response = client.post("/api/ideas/generate", json=VALID_REQUEST)
    assert response.status_code == 429
    assert "busy" in response.json()["detail"]
    assert len(fake.calls) == 1


def test_generate_provider_failure_returns_502(client: TestClient, fake_openai):
    fake = fake_openai(provider_error(500))
    response = client.post("/api/ideas/generate", json=VALID_REQUEST)
    assert response.status_code == 502
    assert len(fake.calls) == 1


def test_generate_without_api_key_returns_503(client: TestClient, fake_openai, monkeypatch):
    fake = fake_openai()
    monkeypatch.setattr(get_settings(), "groq_api_key", "")
    response = client.post("/api/ideas/generate", json=VALID_REQUEST)
    assert response.status_code == 503
    assert fake.calls == []


def test_generate_is_rate_limited_per_ip(client: TestClient, fake_openai, valid_ideas_json: str):
    fake_openai(*[valid_ideas_json] * 10)
    for _ in range(10):
        assert client.post("/api/ideas/generate", json=VALID_REQUEST).status_code == 200
    blocked = client.post("/api/ideas/generate", json=VALID_REQUEST)
    assert blocked.status_code == 429
    assert "Too many requests" in blocked.json()["detail"]


def test_info_logs_hold_no_user_input_or_key(
    client: TestClient, fake_openai, valid_ideas_json: str, caplog: pytest.LogCaptureFixture
):
    fake_openai(MALFORMED, valid_ideas_json)
    body = {**VALID_REQUEST, "skills": ["Python", "SecretCustomSkill"]}
    with caplog.at_level(logging.INFO):
        assert client.post("/api/ideas/generate", json=body).status_code == 200
    assert "Generating ideas" in caplog.text
    assert "SecretCustomSkill" not in caplog.text
    assert "test-key-not-real" not in caplog.text


# --- regenerate --------------------------------------------------------------


@pytest.mark.parametrize("mode", ["harder", "easier", "swap_stack"])
def test_regenerate_returns_one_idea_with_a_new_id(
    client: TestClient, fake_openai, valid_idea_json: str, mode: str
):
    fake = fake_openai(valid_idea_json)
    body = {"mode": mode, "idea": saved_idea_payload("abc-123")}
    response = client.post("/api/ideas/regenerate/abc-123", json=body)
    assert response.status_code == 200
    # A regenerated idea is a new idea, so it can be saved next to the original.
    assert response.json()["id"] not in ("", "abc-123")
    assert len(fake.calls) == 1


def test_regenerate_rejects_unknown_mode(client: TestClient, fake_openai):
    fake_openai()
    body = {"mode": "weirder", "idea": saved_idea_payload("abc")}
    assert client.post("/api/ideas/regenerate/abc", json=body).status_code == 422


def test_regenerate_rejects_incomplete_idea(client: TestClient, fake_openai):
    fake_openai()
    body = {"mode": "harder", "idea": {"id": "abc", "title": "Only a title"}}
    assert client.post("/api/ideas/regenerate/abc", json=body).status_code == 422


def test_regenerate_rejects_mismatched_id(client: TestClient, fake_openai):
    fake = fake_openai()
    body = {"mode": "harder", "idea": saved_idea_payload("abc")}
    assert client.post("/api/ideas/regenerate/other", json=body).status_code == 400
    assert fake.calls == []


def test_regenerate_retry_then_502(client: TestClient, fake_openai):
    fake = fake_openai(MALFORMED, '{"idea": {"title": "Too little"}}')
    body = {"mode": "easier", "idea": saved_idea_payload("abc")}
    response = client.post("/api/ideas/regenerate/abc", json=body)
    assert response.status_code == 502
    assert len(fake.calls) == 2


# --- saved -------------------------------------------------------------------


def test_saved_crud_round_trip(client: TestClient):
    assert client.get("/api/saved").json() == []

    created = client.post("/api/saved", json=saved_idea_payload("idea-1"))
    assert created.status_code == 201
    record = created.json()
    assert record["idea"]["id"] == "idea-1"
    assert isinstance(record["id"], int)
    assert record["created_at"]

    listed = client.get("/api/saved").json()
    assert [item["id"] for item in listed] == [record["id"]]

    assert client.delete(f"/api/saved/{record['id']}").status_code == 204
    assert client.get("/api/saved").json() == []


def test_saving_twice_returns_the_existing_record(client: TestClient):
    first = client.post("/api/saved", json=saved_idea_payload("idea-1"))
    second = client.post("/api/saved", json=saved_idea_payload("idea-1"))
    assert first.status_code == 201
    assert second.status_code == 200
    assert second.json()["id"] == first.json()["id"]
    assert len(client.get("/api/saved").json()) == 1


def test_saved_list_is_newest_first(client: TestClient):
    first = client.post("/api/saved", json=saved_idea_payload("idea-1")).json()
    second = client.post("/api/saved", json=saved_idea_payload("idea-2")).json()
    assert [item["id"] for item in client.get("/api/saved").json()] == [second["id"], first["id"]]


def test_save_rejects_invalid_idea(client: TestClient):
    payload = saved_idea_payload()
    payload["difficulty"] = "impossible"
    assert client.post("/api/saved", json=payload).status_code == 422


def test_delete_missing_saved_idea_returns_404(client: TestClient):
    assert client.delete("/api/saved/9999").status_code == 404


def test_saved_lists_are_private_to_each_browser(client: TestClient):
    mine = client.post("/api/saved", json=saved_idea_payload("idea-1")).json()

    assert client.get("/api/saved", headers=CLIENT_B).json() == []
    # B cannot delete A's record, and cannot tell that it exists.
    assert client.delete(f"/api/saved/{mine['id']}", headers=CLIENT_B).status_code == 404
    assert [item["id"] for item in client.get("/api/saved").json()] == [mine["id"]]


def test_two_browsers_can_save_the_same_idea(client: TestClient):
    first = client.post("/api/saved", json=saved_idea_payload("idea-1"))
    second = client.post("/api/saved", json=saved_idea_payload("idea-1"), headers=CLIENT_B)
    assert (first.status_code, second.status_code) == (201, 201)
    assert first.json()["id"] != second.json()["id"]


@pytest.mark.parametrize("client_id", [None, "short", "has spaces in it 0000", "x" * 65])
def test_saved_routes_require_a_valid_client_id(client: TestClient, client_id: str | None):
    client.headers.pop("X-Client-Id")
    headers = {"X-Client-Id": client_id} if client_id else {}
    assert client.get("/api/saved", headers=headers).status_code == 422
    assert client.post("/api/saved", json=saved_idea_payload(), headers=headers).status_code == 422
    assert client.delete("/api/saved/1", headers=headers).status_code == 422


def test_saved_ideas_are_capped_per_browser(client: TestClient, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr("app.routes.saved.MAX_SAVED_PER_CLIENT", 2)
    assert client.post("/api/saved", json=saved_idea_payload("idea-1")).status_code == 201
    assert client.post("/api/saved", json=saved_idea_payload("idea-2")).status_code == 201

    full = client.post("/api/saved", json=saved_idea_payload("idea-3"))
    assert full.status_code == 409
    assert "up to 2 ideas" in full.json()["detail"]
    # Re-saving an idea that is already saved still works at the cap.
    assert client.post("/api/saved", json=saved_idea_payload("idea-1")).status_code == 200
    # The cap is per browser.
    other = client.post("/api/saved", json=saved_idea_payload("idea-3"), headers=CLIENT_B)
    assert other.status_code == 201


def test_saved_writes_are_rate_limited(client: TestClient):
    for index in range(30):
        assert client.post("/api/saved", json=saved_idea_payload(f"idea-{index}")).status_code == 201
    blocked = client.post("/api/saved", json=saved_idea_payload("idea-30"))
    assert blocked.status_code == 429
    assert "Too many requests" in blocked.json()["detail"]


def test_save_rejects_oversized_text(client: TestClient):
    payload = saved_idea_payload()
    payload["problem_solved"] = "x" * 5000
    assert client.post("/api/saved", json=payload).status_code == 422


def test_regenerate_rejects_oversized_text_before_calling_the_llm(client: TestClient, fake_openai):
    fake = fake_openai()
    idea = saved_idea_payload("abc")
    idea["portfolio_tip"] = "x" * 5000
    response = client.post("/api/ideas/regenerate/abc", json={"mode": "harder", "idea": idea})
    assert response.status_code == 422
    assert fake.calls == []


def test_cors_preflight_allows_the_client_id_header(client: TestClient):
    response = client.options(
        "/api/saved",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "x-client-id",
        },
    )
    assert response.status_code == 200
    assert "x-client-id" in response.headers["access-control-allow-headers"].lower()
