"""Idea generation routes."""

from collections.abc import Callable
from typing import TypeVar

from fastapi import APIRouter, HTTPException, Request, status

from .. import llm
from ..ratelimit import IDEAS_RATE_LIMIT, limiter
from ..schemas import GenerateRequest, Idea, IdeaResponse, RegenerateRequest

router = APIRouter(prefix="/api/ideas", tags=["ideas"])

T = TypeVar("T")


def _call_llm(action: Callable[[], T]) -> T:
    """Run an LLM call and translate its failures into HTTP errors."""
    try:
        return action()
    except llm.LLMNotConfiguredError as exc:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "The idea generator is not configured yet. Set GROQ_API_KEY on the server.",
        ) from exc
    except llm.LLMRateLimitError as exc:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            "The idea generator is busy right now. Wait a minute, then try again.",
        ) from exc
    except llm.LLMOutputError as exc:
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            "The idea generator returned an unusable answer twice. Please try again.",
        ) from exc
    except llm.LLMUpstreamError as exc:
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            "Could not reach the idea generator. Please try again shortly.",
        ) from exc


@router.post("/generate", response_model=IdeaResponse)
@limiter.limit(IDEAS_RATE_LIMIT)
def generate(request: Request, body: GenerateRequest) -> IdeaResponse:
    return IdeaResponse(ideas=_call_llm(lambda: llm.generate_ideas(body)))


@router.post("/regenerate/{idea_id}", response_model=Idea)
@limiter.limit(IDEAS_RATE_LIMIT)
def regenerate(request: Request, idea_id: str, body: RegenerateRequest) -> Idea:
    if idea_id != body.idea.id:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "The idea id in the URL does not match the body."
        )
    return _call_llm(lambda: llm.regenerate_idea(body.idea, body.mode))
