from typing import Annotated, Literal, Union

from pydantic import Field

from app.models.common import ApiModel


class AssignmentProblem(ApiModel):
    prompt: str
    learning_outcome: str
    points: int = Field(ge=1)
    difficulty: Literal["introductory", "intermediate", "advanced"]
    hints: list[str] = Field(min_length=1)
    expected_answer: str
    rubric: list[str] = Field(min_length=1)


class ExamQuestion(ApiModel):
    section: str
    prompt: str
    learning_outcome: str
    points: int = Field(ge=1)
    difficulty: Literal["introductory", "intermediate", "advanced"]
    expected_solution: str
    rubric: list[str] = Field(min_length=1)


class Assignment(ApiModel):
    id: str
    kind: Literal["assignment"]
    title: str
    coverage: str
    description: str
    status: Literal["Draft", "Ready"]
    problem_count: int
    points: int
    difficulty: Literal["introductory", "intermediate", "advanced"]
    rubric: list[str]
    problems: list[AssignmentProblem] = Field(default_factory=list)


class Exam(ApiModel):
    id: str
    kind: Literal["midterm", "final"]
    title: str
    coverage: str
    description: str
    status: Literal["Draft", "Ready"]
    question_count: int
    duration_minutes: int
    sections: list[str]
    questions: list[ExamQuestion] = Field(default_factory=list)


class AssignmentResponse(ApiModel):
    assessment: Assignment


class ExamResponse(ApiModel):
    assessment: Exam


Assessment = Annotated[Union[Assignment, Exam], Field(discriminator="kind")]
