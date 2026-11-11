"""Shared fixtures. Environment is set before the app is imported."""

import os
import tempfile
from collections.abc import Iterator
from pathlib import Path
from types import SimpleNamespace

_TMP_DIR = tempfile.mkdtemp(prefix="ideagig-tests-")
os.environ["DATABASE_URL"] = f"sqlite:///{_TMP_DIR}/test.db"
os.environ["GROQ_API_KEY"] = "test-key-not-real"
os.environ["FRONTEND_ORIGIN"] = "http://localhost:3000"
os.environ["LLM_MODEL"] = "test-model"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app import llm  # noqa: E402
from app.db import Base, get_engine  # noqa: E402
from app.main import app  # noqa: E402
from app.ratelimit import limiter  # noqa: E402

FIXTURES = Path(__file__).parent / "fixtures"
CLIENT_A = {"X-Client-Id": "client-a-0000000000000001"}
CLIENT_B = {"X-Client-Id": "client-b-0000000000000002"}


def load_fixture(name: str) -> str:
    return (FIXTURES / name).read_text()


class FakeOpenAI:
    """Stands in for openai.OpenAI. Replies are served in order; exceptions are raised."""

    def __init__(self, replies: list[object]) -> None:
        self.replies = list(replies)
        self.calls: list[dict] = []
        self.init_kwargs: dict = {}
        self.chat = SimpleNamespace(completions=SimpleNamespace(create=self._create))

    def __call__(self, **kwargs: object) -> "FakeOpenAI":
        # llm._chat calls OpenAI(...); returning self keeps one call log.
        self.init_kwargs = kwargs
        return self

    def _create(self, **kwargs: object) -> SimpleNamespace:
        self.calls.append(kwargs)
        reply = self.replies.pop(0)
        if isinstance(reply, Exception):
            raise reply
        message = SimpleNamespace(content=reply)
        return SimpleNamespace(choices=[SimpleNamespace(message=message)])


@pytest.fixture
def fake_openai(monkeypatch: pytest.MonkeyPatch):
    """Returns a function that installs a FakeOpenAI with the given replies."""

    def install(*replies: object) -> FakeOpenAI:
        fake = FakeOpenAI(list(replies))
        monkeypatch.setattr(llm, "OpenAI", fake)
        return fake

    return install


@pytest.fixture
def client() -> Iterator[TestClient]:
    Base.metadata.drop_all(get_engine())
    limiter.reset()
    # Requests are made as browser A unless a test passes other headers.
    with TestClient(app, headers=CLIENT_A) as test_client:  # lifespan recreates the tables
        yield test_client


@pytest.fixture
def valid_ideas_json() -> str:
    return load_fixture("valid_ideas.json")


@pytest.fixture
def valid_idea_json() -> str:
    return load_fixture("valid_idea.json")
