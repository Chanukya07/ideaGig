"""LLM access: one provider function, plus JSON parsing and the retry policy."""

import json
import logging
import re
import uuid
from collections.abc import Callable
from typing import TypeVar

from openai import APIError, OpenAI, RateLimitError
from pydantic import ValidationError

from . import prompts
from .config import GROQ_BASE_URL, get_settings
from .schemas import (
    IDEAS_PER_RESPONSE,
    GenerateRequest,
    Idea,
    IdeaDraft,
    RegenerateMode,
)

logger = logging.getLogger(__name__)

Message = dict[str, str]
T = TypeVar("T")

_FENCE_RE = re.compile(r"^\s*```[a-zA-Z0-9_-]*\s*\n?(.*?)\n?\s*```\s*$", re.DOTALL)
_MAX_ERROR_CHARS = 1200


class LLMError(Exception):
    """Base class for LLM failures."""


class LLMNotConfiguredError(LLMError):
    """GROQ_API_KEY is missing."""


class LLMRateLimitError(LLMError):
    """The provider answered HTTP 429."""


class LLMUpstreamError(LLMError):
    """The provider failed for a reason other than rate limiting."""


class LLMOutputError(LLMError):
    """The model's reply was not valid JSON or did not match the schema."""


def _chat(messages: list[Message]) -> str:
    """Send a chat request and return the raw reply text.

    This is the only provider-specific code. To move to OpenRouter (or any other
    OpenAI-compatible API) change the base URL, the key, and the model name here.
    """
    settings = get_settings()
    if not settings.groq_api_key:
        raise LLMNotConfiguredError("GROQ_API_KEY is not set.")

    client = OpenAI(api_key=settings.groq_api_key, base_url=GROQ_BASE_URL, timeout=30)
    try:
        completion = client.chat.completions.create(
            model=settings.llm_model,
            messages=messages,  # type: ignore[arg-type]
            response_format={"type": "json_object"},
            temperature=0.8,
        )
    except RateLimitError as exc:
        raise LLMRateLimitError("Rate limited by the LLM provider.") from exc
    except APIError as exc:
        # Log the error type only: provider messages can echo request content.
        logger.warning("LLM request failed: %s", type(exc).__name__)
        raise LLMUpstreamError("The LLM provider request failed.") from exc
    return completion.choices[0].message.content or ""


def strip_code_fences(text: str) -> str:
    """Remove a wrapping ```json ... ``` fence if the model added one."""
    match = _FENCE_RE.match(text)
    return (match.group(1) if match else text).strip()


def _load_object(raw: str) -> dict:
    try:
        data = json.loads(strip_code_fences(raw))
    except json.JSONDecodeError as exc:
        raise LLMOutputError(f"Reply is not valid JSON: {exc.msg} (line {exc.lineno}).") from exc
    if not isinstance(data, dict):
        raise LLMOutputError("Reply must be a JSON object.")
    return data


def _to_idea(item: object, idea_id: str | None = None) -> Idea:
    try:
        draft = IdeaDraft.model_validate(item)
    except ValidationError as exc:
        problems = "; ".join(
            f"{'.'.join(str(part) for part in err['loc']) or 'idea'}: {err['msg']}"
            for err in exc.errors()
        )
        raise LLMOutputError(f"Idea does not match the schema: {problems}") from exc
    # Ids are always assigned here; anything the model invents is ignored.
    return Idea(id=idea_id or str(uuid.uuid4()), **draft.model_dump())


def parse_ideas(raw: str) -> list[Idea]:
    """Parse a generate reply into exactly three validated ideas."""
    items = _load_object(raw).get("ideas")
    if not isinstance(items, list):
        raise LLMOutputError('Reply must contain an "ideas" array.')
    if len(items) != IDEAS_PER_RESPONSE:
        raise LLMOutputError(
            f'"ideas" must contain exactly {IDEAS_PER_RESPONSE} items, got {len(items)}.'
        )
    ideas = [_to_idea(item) for item in items]
    titles = {idea.title.casefold() for idea in ideas}
    if len(titles) != len(ideas):
        raise LLMOutputError("The ideas must all be different; two share a title.")
    return ideas


def parse_idea(raw: str, idea_id: str) -> Idea:
    """Parse a regenerate reply into one validated idea that keeps the given id."""
    data = _load_object(raw)
    return _to_idea(data.get("idea", data), idea_id)


def _complete(user_prompt: str, parse: Callable[[str], T]) -> T:
    """Call the model and parse the reply, retrying once with the error appended."""
    messages: list[Message] = [
        {"role": "system", "content": prompts.SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt},
    ]
    raw = _chat(messages)
    try:
        return parse(raw)
    except LLMOutputError as first_error:
        logger.info("LLM reply failed validation; retrying once.")
        messages += [
            {"role": "assistant", "content": raw},
            {
                "role": "user",
                "content": prompts.build_retry_prompt(str(first_error)[:_MAX_ERROR_CHARS]),
            },
        ]
    return parse(_chat(messages))


def generate_ideas(req: GenerateRequest) -> list[Idea]:
    logger.info(
        "Generating ideas: skills=%d time=%s interest=%s experience=%s",
        len(req.skills),
        req.time_available.value,
        req.interest.value,
        req.experience.value,
    )
    return _complete(prompts.build_generate_prompt(req), parse_ideas)


def regenerate_idea(idea: Idea, mode: RegenerateMode) -> Idea:
    logger.info("Regenerating idea: mode=%s", mode.value)
    return _complete(
        prompts.build_regenerate_prompt(idea, mode),
        lambda raw: parse_idea(raw, idea.id),
    )
