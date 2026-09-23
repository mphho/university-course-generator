from typing import Literal

from pydantic import Field

from app.models.assessment import Assessment
from app.models.common import ApiModel
from app.models.generation import (
    AssessmentBlueprintItem,
    ConceptDependency,
    CourseUnit,
    LectureContent,
    LecturePlan,
)


class Lecture(ApiModel):
    id: str
    number: int
    title: str
    duration_minutes: int
    role: Literal["Core", "Practice", "Assessment"]
    summary: str
    objectives: list[str]
    concepts: list[str] = Field(default_factory=list)
    content: LectureContent | None = None


class Course(ApiModel):
    id: str
    title: str
    course_code: str
    level: Literal["Undergraduate", "Graduate"]
    description: str
    learner_profile: str
    prerequisites: list[str]
    learning_outcomes: list[str]
    units: list[CourseUnit]
    lectures: list[Lecture]
    lecture_plan: list[LecturePlan] = Field(default_factory=list)
    concept_dependencies: list[ConceptDependency] = Field(default_factory=list)
    assessment_blueprint: list[AssessmentBlueprintItem] = Field(default_factory=list)
    scope_limits: list[str] = Field(default_factory=list)
    assessments: list[Assessment]
    content_review_status: Literal["draft", "reviewed"]


class CourseBriefRequest(ApiModel):
    title: str = Field(min_length=2, max_length=120)
    course_code: str = Field(min_length=2, max_length=32)
    level: Literal["Undergraduate", "Graduate"]
    learning_outcomes: list[str] = Field(min_length=1, max_length=12)
    test_mode: bool = False


class CourseResponse(ApiModel):
    course: Course


class CourseListResponse(ApiModel):
    courses: list[Course]


class HealthServices(ApiModel):
    local_api: Literal["available", "unavailable"]
    generation_provider: Literal["configured", "not-configured"]


class HealthResponse(ApiModel):
    status: Literal["ready", "degraded"]
    services: HealthServices
