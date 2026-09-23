from typing import Literal

from pydantic import Field

from app.models.common import ApiModel


class AssignmentRequest(ApiModel):
    topic: str = Field(min_length=2, max_length=160)
    difficulty: Literal["introductory", "intermediate", "advanced"]
    problem_count: int = Field(ge=1, le=20)


class ExamRequest(ApiModel):
    topics: list[str] = Field(min_length=1, max_length=20)
    coverage: str | None = Field(default=None, max_length=500)
    duration_minutes: int = Field(ge=15, le=240)
    question_count: int = Field(ge=1, le=50)


class FinalExamRequest(ApiModel):
    coverage: str = Field(min_length=2, max_length=500)
    duration_minutes: int = Field(ge=15, le=240)
    question_count: int = Field(ge=1, le=50)
