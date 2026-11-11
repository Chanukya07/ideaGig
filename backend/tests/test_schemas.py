import json

import pytest
from pydantic import ValidationError

from app.schemas import GenerateRequest, Idea, IdeaResponse, RegenerateRequest

from .conftest import load_fixture


def idea_dict(**overrides: object) -> dict:
    idea = json.loads(load_fixture("valid_ideas.json"))["ideas"][0]
    return {"id": "idea-1", **idea, **overrides}


def request_dict(**overrides: object) -> dict:
    base = {
        "skills": ["Python", "SQL"],
        "time_available": "weekend",
        "interest": "tools",
        "experience": "beginner",
    }
    return {**base, **overrides}


def test_generate_request_accepts_valid_input():
    req = GenerateRequest.model_validate(request_dict())
    assert req.skills == ["Python", "SQL"]


def test_generate_request_allows_custom_skills_and_trims_and_dedupes():
    req = GenerateRequest.model_validate(request_dict(skills=["  Rust ", "rust", "Go"]))
    assert req.skills == ["Rust", "Go"]


@pytest.mark.parametrize(
    "overrides",
    [
        {"time_available": "one_year"},
        {"interest": "blockchain"},
        {"experience": "wizard"},
        {"skills": []},
        {"skills": [f"skill-{i}" for i in range(11)]},
        {"skills": ["   "]},
        {"skills": ["x" * 41]},
        {"unexpected": "field"},
    ],
)
def test_generate_request_rejects_invalid_input(overrides: dict):
    with pytest.raises(ValidationError):
        GenerateRequest.model_validate(request_dict(**overrides))


def test_generate_request_accepts_ten_skills():
    req = GenerateRequest.model_validate(request_dict(skills=[f"skill-{i}" for i in range(10)]))
    assert len(req.skills) == 10


def test_idea_accepts_valid_payload():
    assert Idea.model_validate(idea_dict()).id == "idea-1"


@pytest.mark.parametrize(
    "overrides",
    [
        {"title": "x" * 61},
        {"pitch": "x" * 161},
        {"difficulty": "impossible"},
        {"estimated_hours": 0},
        {"estimated_hours": "many"},
        {"stack": []},
        {"scope_in": ["a", "b"]},
        {"scope_in": ["a", "b", "c", "d", "e", "f"]},
        {"scope_out": ["a"]},
        {"scope_out": ["a", "b", "c", "d"]},
        {"milestones": [{"title": "t", "description": "d"}] * 3},
        {"milestones": [{"title": "t", "description": "d"}] * 7},
        {"milestones": [{"title": "t"}] * 4},
        {"portfolio_tip": ""},
        {"portfolio_tip": "x" * 601},
        {"problem_solved": "x" * 601},
        {"target_users": "x" * 601},
        {"stack": ["x" * 61]},
        {"scope_in": ["a", "b", "x" * 201]},
        {"scope_out": ["a", "x" * 201]},
        {"milestones": [{"title": "x" * 121, "description": "d"}] * 4},
        {"milestones": [{"title": "t", "description": "x" * 401}] * 4},
        {"id": "x" * 65},
    ],
)
def test_idea_rejects_out_of_bounds_fields(overrides: dict):
    with pytest.raises(ValidationError):
        Idea.model_validate(idea_dict(**overrides))


@pytest.mark.parametrize("count", [2, 4])
def test_idea_response_requires_exactly_three(count: int):
    ideas = [idea_dict(id=f"idea-{i}") for i in range(count)]
    with pytest.raises(ValidationError):
        IdeaResponse.model_validate({"ideas": ideas})


def test_regenerate_request_rejects_unknown_mode():
    with pytest.raises(ValidationError):
        RegenerateRequest.model_validate({"mode": "weirder", "idea": idea_dict()})
