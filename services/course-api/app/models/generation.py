from typing import Literal

from pydantic import Field

from app.models.assessment import AssignmentProblem, ExamQuestion
from app.models.common import ApiModel


class CourseUnit(ApiModel):
    id: str
    title: str
    summary: str
    lecture_ids: list[str] = Field(min_length=1)


class LecturePlan(ApiModel):
    id: str
    number: int = Field(ge=1, le=12)
    title: str
    duration_minutes: int = Field(ge=1, le=180)
    role: Literal["Core", "Practice", "Assessment"]
    summary: str
    objectives: list[str] = Field(min_length=1)
    concepts: list[str] = Field(min_length=1)


class ConceptDependency(ApiModel):
    concept: str
    prerequisite_concepts: list[str]
    lecture_number: int = Field(ge=1, le=12)


class AssessmentBlueprintItem(ApiModel):
    kind: Literal["assignment", "midterm", "final"]
    title: str
    coverage: str
    scheduled_after_lecture: int = Field(ge=1, le=12)
    learning_outcomes: list[str] = Field(min_length=1)
    question_count: int = Field(ge=1)


class WorkedExample(ApiModel):
    prompt: str
    reasoning_steps: list[str] = Field(min_length=1)
    conclusion: str


class LecturePractice(ApiModel):
    prompt: str
    learning_outcome: str
    points: int = Field(ge=1)
    hints: list[str] = Field(min_length=1)
    solution: str
    rubric: list[str] = Field(min_length=1)


class LectureContent(ApiModel):
    motivating_question: str
    prerequisite_check: str
    intuitive_explanation: str
    formal_development: str
    worked_examples: list[WorkedExample] = Field(min_length=1)
    applications: list[str] = Field(min_length=1)
    misconceptions: list[str] = Field(min_length=1)
    extension: str
    summary: str
    practice: LecturePractice


class LectureFoundations(ApiModel):
    prerequisite_check: str
    intuitive_explanation: str
    formal_development: str


class LectureTeaching(ApiModel):
    motivating_question: str
    worked_examples: list[WorkedExample] = Field(min_length=3, max_length=5)
    applications: list[str] = Field(min_length=2)
    misconceptions: list[str] = Field(min_length=3)
    extension: str
    summary: str
    practice: LecturePractice


class LectureExpansion(ApiModel):
    intuitive_explanation: str
    formal_development: str
    worked_examples: list[WorkedExample] = Field(default_factory=list)
    applications: list[str] = Field(default_factory=list)
    misconceptions: list[str] = Field(default_factory=list)
    extension: str


class CoursePlan(ApiModel):
    description: str
    learner_profile: str
    prerequisites: list[str] = Field(min_length=1)
    learning_outcomes: list[str] = Field(min_length=1)
    units: list[CourseUnit] = Field(min_length=1)
    lecture_plan: list[LecturePlan] = Field(min_length=12, max_length=12)
    concept_dependencies: list[ConceptDependency] = Field(min_length=1)
    assessment_blueprint: list[AssessmentBlueprintItem] = Field(min_length=2)
    scope_limits: list[str] = Field(min_length=1)


class GeneratedAssignment(ApiModel):
    description: str
    rubric: list[str] = Field(min_length=1)
    problems: list[AssignmentProblem] = Field(min_length=1)


class GeneratedExam(ApiModel):
    description: str
    sections: list[str] = Field(min_length=1)
    questions: list[ExamQuestion] = Field(min_length=1)
