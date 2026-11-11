"""Parsing and prompt tests. Fixture JSON only; nothing touches the network."""

import json
import uuid

import pytest

from app import llm, prompts
from app.schemas import GenerateRequest, Idea, RegenerateMode

from .conftest import load_fixture


def test_parse_valid_json(valid_ideas_json: str):
    ideas = llm.parse_ideas(valid_ideas_json)
    assert len(ideas) == 3
    assert ideas[0].title == "Commit Message Coach for Student Repos"
    assert len({idea.id for idea in ideas}) == 3
    for idea in ideas:
        uuid.UUID(idea.id)  # raises if not a uuid


def test_parse_fenced_json():
    ideas = llm.parse_ideas(load_fixture("fenced_ideas.txt"))
    assert len(ideas) == 3


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ('```json\n{"a": 1}\n```', '{"a": 1}'),
        ('```\n{"a": 1}\n```', '{"a": 1}'),
        ('  ```JSON\n{"a": 1}\n```  \n', '{"a": 1}'),
        ('{"a": 1}', '{"a": 1}'),
        ('{"code": "```not a fence```"}', '{"code": "```not a fence```"}'),
    ],
)
def test_strip_code_fences(text: str, expected: str):
    assert llm.strip_code_fences(text) == expected


def test_parse_malformed_json_raises():
    with pytest.raises(llm.LLMOutputError, match="not valid JSON"):
        llm.parse_ideas(load_fixture("malformed_ideas.txt"))


def test_parse_wrong_count_raises():
    with pytest.raises(llm.LLMOutputError, match="exactly 3"):
        llm.parse_ideas(load_fixture("two_ideas.json"))


@pytest.mark.parametrize("raw", ["[]", '"text"', '{"ideas": "none"}', '{"other": []}'])
def test_parse_wrong_shape_raises(raw: str):
    with pytest.raises(llm.LLMOutputError):
        llm.parse_ideas(raw)


def test_parse_schema_violation_names_the_field(valid_ideas_json: str):
    data = json.loads(valid_ideas_json)
    data["ideas"][1]["title"] = "x" * 61
    with pytest.raises(llm.LLMOutputError, match="title"):
        llm.parse_ideas(json.dumps(data))


def test_parse_duplicate_titles_raises(valid_ideas_json: str):
    data = json.loads(valid_ideas_json)
    data["ideas"][2]["title"] = data["ideas"][0]["title"].upper()
    with pytest.raises(llm.LLMOutputError, match="different"):
        llm.parse_ideas(json.dumps(data))


def test_parse_ignores_ids_from_the_model(valid_ideas_json: str):
    data = json.loads(valid_ideas_json)
    data["ideas"][0]["id"] = "model-made-this-up"
    assert llm.parse_ideas(json.dumps(data))[0].id != "model-made-this-up"


def test_parse_idea_keeps_given_id(valid_idea_json: str):
    idea = llm.parse_idea(valid_idea_json, "keep-me")
    assert idea.id == "keep-me"


def test_parse_idea_accepts_unwrapped_object(valid_idea_json: str):
    unwrapped = json.dumps(json.loads(valid_idea_json)["idea"])
    assert llm.parse_idea(unwrapped, "keep-me").id == "keep-me"


def test_generate_prompt_contains_inputs_schema_and_rules():
    req = GenerateRequest(
        skills=["Python", "Rust"], time_available="weekend", interest="tools", experience="beginner"
    )
    prompt = prompts.build_generate_prompt(req)
    assert '["Python", "Rust"]' in prompt
    assert "one weekend" in prompt
    assert "developer and productivity tools" in prompt
    assert "beginner" in prompt
    for field in ("scope_in", "scope_out", "milestones", "portfolio_tip", "estimated_hours"):
        assert field in prompt
    assert "No vague titles" in prompt
    assert "time budget" in prompt
    assert "at most ONE skill" in prompt
    assert "no duplicates" in prompt


def test_regenerate_prompt_contains_idea_and_mode(valid_idea_json: str):
    idea = Idea(id="abc", **json.loads(valid_idea_json)["idea"])
    prompt = prompts.build_regenerate_prompt(idea, RegenerateMode.swap_stack)
    assert idea.title in prompt
    assert "SWAP THE STACK" in prompt
    assert '"id"' not in prompt


def test_chat_configures_groq_client(fake_openai, valid_ideas_json: str):
    fake = fake_openai(valid_ideas_json)
    llm._chat([{"role": "user", "content": "hi"}])
    assert fake.init_kwargs == {
        "api_key": "test-key-not-real",
        "base_url": "https://api.groq.com/openai/v1",
        "timeout": 30,
    }
    assert fake.calls[0]["model"] == "test-model"
    assert fake.calls[0]["response_format"] == {"type": "json_object"}
