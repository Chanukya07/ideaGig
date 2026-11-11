"""Request and response models. The frontend mirrors these in lib/types.ts."""

from datetime import datetime
from enum import Enum
from typing import Annotated, Any

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator

SUGGESTED_SKILLS: tuple[str, ...] = (
    "Python",
    "JavaScript",
    "TypeScript",
    "React",
    "SQL",
    "Data analysis",
    "Machine learning",
    "Design",
    "Node.js",
    "Java",
    "C++",
)

MAX_SKILLS = 10
IDEAS_PER_RESPONSE = 3

MAX_SAVED_PER_CLIENT = 50


def _text(max_length: int) -> Any:
    """A trimmed, non-empty string with an upper bound. Nothing is unbounded."""
    return Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=max_length)
    ]


Prose = _text(600)
ListItem = _text(200)
StackItem = _text(60)
Title = _text(60)
Pitch = _text(160)
MilestoneTitle = _text(120)
MilestoneText = _text(400)
IdeaId = _text(64)
Skill = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=40)]


class TimeAvailable(str, Enum):
    weekend = "weekend"
    two_weeks = "two_weeks"
    one_month = "one_month"


class Interest(str, Enum):
    ai = "ai"
    web = "web"
    data = "data"
    games = "games"
    tools = "tools"


class Experience(str, Enum):
    beginner = "beginner"
    intermediate = "intermediate"
    advanced = "advanced"


class Difficulty(str, Enum):
    easy = "easy"
    medium = "medium"
    hard = "hard"


class RegenerateMode(str, Enum):
    harder = "harder"
    easier = "easier"
    swap_stack = "swap_stack"


class GenerateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    skills: list[Skill] = Field(min_length=1, max_length=MAX_SKILLS)
    time_available: TimeAvailable
    interest: Interest
    experience: Experience

    @field_validator("skills")
    @classmethod
    def _dedupe_skills(cls, skills: list[str]) -> list[str]:
        seen: set[str] = set()
        unique: list[str] = []
        for skill in skills:
            key = skill.casefold()
            if key not in seen:
                seen.add(key)
                unique.append(skill)
        return unique


class Milestone(BaseModel):
    title: MilestoneTitle
    description: MilestoneText


class IdeaDraft(BaseModel):
    """An idea as the LLM writes it: everything except the server-assigned id."""

    title: Title
    pitch: Pitch
    problem_solved: Prose
    target_users: Prose
    difficulty: Difficulty
    estimated_hours: int = Field(gt=0, le=1000)
    stack: list[StackItem] = Field(min_length=1, max_length=12)
    scope_in: list[ListItem] = Field(min_length=3, max_length=5)
    scope_out: list[ListItem] = Field(min_length=2, max_length=3)
    milestones: list[Milestone] = Field(min_length=4, max_length=6)
    portfolio_tip: Prose


class Idea(IdeaDraft):
    id: IdeaId


class IdeaResponse(BaseModel):
    ideas: list[Idea] = Field(min_length=IDEAS_PER_RESPONSE, max_length=IDEAS_PER_RESPONSE)


class RegenerateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    mode: RegenerateMode
    idea: Idea


class SavedIdea(BaseModel):
    id: int
    idea: Idea
    created_at: datetime


class HealthResponse(BaseModel):
    status: str = "ok"
