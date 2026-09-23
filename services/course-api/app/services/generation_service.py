import json
import re
import uuid
from typing import Any, Protocol, TypeVar

from pydantic import BaseModel, ValidationError

from app.config import Settings
from app.errors import ApiError
from app.models.assessment import Assignment, Exam
from app.models.common import ErrorCode
from app.models.course import Course, CourseBriefRequest, Lecture
from app.models.generation import (
    CoursePlan,
    GeneratedAssignment,
    GeneratedExam,
    LectureContent,
    LectureExpansion,
    LectureFoundations,
    LecturePlan,
    LectureTeaching,
)
from app.models.requests import AssignmentRequest, ExamRequest, FinalExamRequest
from app.services.responses_client import ResponsesClient

ModelType = TypeVar("ModelType", bound=BaseModel)


class JsonCompletionClient(Protocol):
    async def complete_json(self, system_prompt: str, user_prompt: str) -> dict[str, Any]: ...


class GenerationService:
    def __init__(
        self,
        settings: Settings,
        client: JsonCompletionClient | None = None,
    ) -> None:
        self._settings = settings
        self._client = client or ResponsesClient(settings)

    async def generate_course(self, request: CourseBriefRequest) -> Course:
        self._require_provider()
        plan = self._validate_model(
            CoursePlan,
            await self._client.complete_json(
                """Design a coherent university course map. Return only JSON matching the schema.
Include measurable outcomes, prerequisites, a twelve-lecture sequence, concept dependencies,
and an assessment blueprint. Treat learning_outcomes as the canonical list: every outcome in
assessment_blueprint.learning_outcomes must exactly copy one string from learning_outcomes,
character-for-character; do not paraphrase or introduce outcomes there. Schedule the midterm
after lecture 6 and cumulative final after lecture 12. Map assessments only to canonical outcomes
and material taught by that point. Mark assumptions and scope limits; do not invent citations or
claim the content has been verified.""",
                json.dumps(
                    {
                        "schema": CoursePlan.model_json_schema(by_alias=True),
                        "brief": request.model_dump(by_alias=True),
                        "requiredLectureCount": 12,
                        "testMode": request.test_mode,
                    }
                ),
            ),
        )
        self._validate_course_plan(plan)

        course_id = self._course_id(request.course_code)
        selected_lectures = plan.lecture_plan[:1] if request.test_mode else plan.lecture_plan
        lectures: list[Lecture] = []
        for lecture_plan in selected_lectures:
            content = await self._generate_lecture_content(
                title=request.title,
                learning_outcomes=plan.learning_outcomes,
                prerequisites=plan.prerequisites,
                lecture_plan=plan.lecture_plan,
                lecture=lecture_plan,
            )
            lectures.append(self._lecture_from_plan(lecture_plan, content))

        return Course(
            id=course_id,
            title=request.title,
            course_code=request.course_code,
            level=request.level,
            description=plan.description,
            learner_profile=plan.learner_profile,
            prerequisites=plan.prerequisites,
            learning_outcomes=plan.learning_outcomes,
            units=plan.units,
            lectures=lectures,
            lecture_plan=plan.lecture_plan,
            concept_dependencies=plan.concept_dependencies,
            assessment_blueprint=plan.assessment_blueprint,
            scope_limits=plan.scope_limits,
            assessments=[],
            content_review_status="draft",
        )

    async def generate_next_lecture(self, course: Course) -> Course:
        generated_ids = {lecture.id for lecture in course.lectures if lecture.content is not None}
        lecture_plan = next(
            (item for item in course.lecture_plan if item.id not in generated_ids),
            None,
        )
        if lecture_plan is None:
            return course

        self._require_provider()
        content = await self._generate_lecture_content(
            title=course.title,
            learning_outcomes=course.learning_outcomes,
            prerequisites=course.prerequisites,
            lecture_plan=course.lecture_plan,
            lecture=lecture_plan,
        )
        lecture = self._lecture_from_plan(lecture_plan, content)
        lectures_by_id = {item.id: item for item in course.lectures}
        lectures_by_id[lecture.id] = lecture
        course.lectures = sorted(lectures_by_id.values(), key=lambda item: item.number)
        return course

    async def _generate_lecture_content(
        self,
        title: str,
        learning_outcomes: list[str],
        prerequisites: list[str],
        lecture_plan: list[LecturePlan],
        lecture: LecturePlan,
    ) -> LectureContent:
        course_context = {
            "title": title,
            "learningOutcomes": learning_outcomes,
            "prerequisites": prerequisites,
            "lecturePlan": [item.model_dump(by_alias=True) for item in lecture_plan],
        }
        lecture_context = lecture.model_dump(by_alias=True)
        foundations = self._validate_model(
            LectureFoundations,
            await self._client.complete_json(
                """Draft the foundation of a self-contained university lecture. Return only JSON.
Write all prose values as GitHub-flavored Markdown strings. Use clear paragraphs, nested headings
where useful, Markdown numbered or bulleted lists for genuine sequences, and fenced code blocks
for code. Do not return HTML. Teach accurately and in depth without repetition or filler.

Word budgets: prerequisiteCheck 350-500 words; intuitiveExplanation 900-1200 words;
formalDevelopment 1400-1800 words. Explain prerequisite gaps with a short bridge, develop the
idea from intuition to precise definitions or disciplinary methods, state assumptions and limits,
and connect each explanation to the listed learning objectives. Do not fabricate sources; mark
unsupported or interpretive claims for instructor review.""",
                json.dumps(
                    {
                        "schemaName": "LectureFoundations",
                        "schema": LectureFoundations.model_json_schema(by_alias=True),
                        "course": course_context,
                        "lecture": lecture_context,
                    }
                ),
            ),
        )
        teaching = self._validate_model(
            LectureTeaching,
            await self._client.complete_json(
                """Draft the remaining teaching material and self-paced practice for the same
university lecture. Return only JSON. Write prose values as GitHub-flavored Markdown strings;
use Markdown lists for genuine sequences, headings for subtopics, and no HTML. These sections
must add substantive instruction, not repeat the foundation draft.

Include 3-5 worked examples at about 450-600 words each. Show intermediate reasoning, explain
why each step is valid, and include a contrasting case or counterexample where appropriate.
Applications should total about 350-500 words. Misconceptions should include a diagnosis and
correction, totaling about 350-500 words. The optional extension should be about 500-700 words;
the summary should be about 200-300 words. Keep the combined lecture notes (excluding practice,
hints, solution, and rubric) within 5,000-8,000 words. Practice is separate: include one focused
transfer task, progressive hints that do not reveal the solution prematurely, a worked response,
and an aligned rubric. Do not fabricate sources; mark unsupported claims for review.""",
                json.dumps(
                    {
                        "schemaName": "LectureTeaching",
                        "schema": LectureTeaching.model_json_schema(by_alias=True),
                        "course": course_context,
                        "lecture": lecture_context,
                        "foundationAlreadyExplained": [
                            "prerequisiteCheck",
                            "intuitiveExplanation",
                            "formalDevelopment",
                        ],
                    }
                ),
            ),
        )
        content = LectureContent(
            motivating_question=teaching.motivating_question,
            prerequisite_check=foundations.prerequisite_check,
            intuitive_explanation=foundations.intuitive_explanation,
            formal_development=foundations.formal_development,
            worked_examples=teaching.worked_examples,
            applications=teaching.applications,
            misconceptions=teaching.misconceptions,
            extension=teaching.extension,
            summary=teaching.summary,
            practice=teaching.practice,
        )
        word_count = self._lecture_notes_word_count(content)
        if word_count < 5000:
            expansion = self._validate_model(
                LectureExpansion,
                await self._client.complete_json(
                    """Expand this lecture's Markdown notes with substantive explanation only
where the current draft is thin. Return JSON matching the schema. Add about the requested number
of words, up to 2,000, without repeating existing material. Strengthen intuitive explanation,
formal development, worked reasoning, applications, misconceptions, or optional extension as
needed. Keep examples step-by-step, state assumptions, use counterexamples where useful, and
write all prose as GitHub-flavored Markdown without HTML. Do not alter or regenerate practice.
Do not fabricate sources; flag unsupported claims for review.""",
                    json.dumps(
                        {
                            "schemaName": "LectureExpansion",
                            "schema": LectureExpansion.model_json_schema(by_alias=True),
                            "course": course_context,
                            "lecture": lecture_context,
                            "existingNotes": content.model_dump(
                                by_alias=True, exclude={"practice"}
                            ),
                            "requestedAdditionalWords": min(2000, 5500 - word_count),
                        }
                    ),
                ),
            )
            content.intuitive_explanation += "\n\n" + expansion.intuitive_explanation
            content.formal_development += "\n\n" + expansion.formal_development
            content.worked_examples.extend(expansion.worked_examples)
            content.applications.extend(expansion.applications)
            content.misconceptions.extend(expansion.misconceptions)
            content.extension += "\n\n" + expansion.extension
            word_count = self._lecture_notes_word_count(content)

        if not 5000 <= word_count <= 8000:
            raise ApiError(
                502,
                ErrorCode.UPSTREAM_INVALID_RESPONSE,
                "Generated lecture notes did not meet the 5,000-8,000 word target "
                f"(excluding practice); received {word_count} words.",
            )
        return content

    @staticmethod
    def _lecture_notes_word_count(content: LectureContent) -> int:
        note_sections = [
            content.motivating_question,
            content.prerequisite_check,
            content.intuitive_explanation,
            content.formal_development,
            content.extension,
            content.summary,
            *content.applications,
            *content.misconceptions,
            *(
                text
                for example in content.worked_examples
                for text in [example.prompt, *example.reasoning_steps, example.conclusion]
            ),
        ]
        return sum(len(re.findall(r"\b[\w’'-]+\b", section)) for section in note_sections)

    @staticmethod
    def _lecture_from_plan(lecture_plan: LecturePlan, content: LectureContent) -> Lecture:
        return Lecture(
            id=lecture_plan.id,
            number=lecture_plan.number,
            title=lecture_plan.title,
            duration_minutes=lecture_plan.duration_minutes,
            role=lecture_plan.role,
            summary=lecture_plan.summary,
            objectives=lecture_plan.objectives,
            concepts=lecture_plan.concepts,
            content=content,
        )

    async def generate_assignment(
        self,
        course: Course,
        request: AssignmentRequest,
        number: int,
    ) -> Assignment:
        self._require_provider()
        generated = self._validate_model(
            GeneratedAssignment,
            await self._client.complete_json(
                """Design a structured self-paced university assignment. Return only JSON matching
the schema. Use the requested problem count and difficulty. Map every problem to one exact course
learning outcome and taught topic. Include progressive hints, an expected answer, and a response
rubric; do not claim work is automatically graded or fabricate sources.""",
                json.dumps(
                    {
                        "schema": GeneratedAssignment.model_json_schema(by_alias=True),
                        "course": self._course_context(course, 12),
                        "request": request.model_dump(by_alias=True),
                    }
                ),
            ),
        )
        if len(generated.problems) != request.problem_count:
            raise self._invalid_assessment("The generated assignment did not match problemCount.")
        self._validate_outcomes(
            course, [problem.learning_outcome for problem in generated.problems]
        )
        if any(problem.difficulty != request.difficulty for problem in generated.problems):
            raise self._invalid_assessment(
                "Assignment problem difficulty did not match the request."
            )

        return Assignment(
            id=f"assignment-{number:02}-{uuid.uuid4().hex[:8]}",
            kind="assignment",
            title=f"Assignment {number:02}: {request.topic}",
            coverage=request.topic,
            description=generated.description,
            status="Draft",
            problem_count=len(generated.problems),
            points=sum(problem.points for problem in generated.problems),
            difficulty=request.difficulty,
            rubric=generated.rubric,
            problems=generated.problems,
        )

    async def generate_midterm(
        self,
        course: Course,
        request: ExamRequest,
        number: int,
    ) -> Exam:
        coverage = request.coverage or ", ".join(request.topics)
        return await self._generate_exam(
            course,
            kind="midterm",
            request=request,
            number=number,
            coverage=coverage,
            after_lecture=6,
            requested_topics=request.topics,
        )

    async def generate_final(
        self,
        course: Course,
        request: FinalExamRequest,
        number: int,
    ) -> Exam:
        return await self._generate_exam(
            course,
            kind="final",
            request=request,
            number=number,
            coverage=request.coverage,
            after_lecture=12,
            requested_topics=[lecture.title for lecture in course.lecture_plan],
        )

    async def _generate_exam(
        self,
        course: Course,
        kind: str,
        request: ExamRequest | FinalExamRequest,
        number: int,
        coverage: str,
        after_lecture: int,
        requested_topics: list[str],
    ) -> Exam:
        self._require_provider()
        generated = self._validate_model(
            GeneratedExam,
            await self._client.complete_json(
                """Design a fair, structured university exam. Return only JSON matching the schema.
Use the requested question count and duration, balance difficulty, estimate plausible completion
time, and map every question to an exact course learning outcome. Assess only material taught by
the allowed lecture limit. Include expected solution reasoning and a scoring rubric.""",
                json.dumps(
                    {
                        "schema": GeneratedExam.model_json_schema(by_alias=True),
                        "course": self._course_context(course, after_lecture),
                        "request": request.model_dump(by_alias=True),
                        "kind": kind,
                        "coverage": coverage,
                        "requestedTopics": requested_topics,
                        "allowedThroughLecture": after_lecture,
                    }
                ),
            ),
        )
        if len(generated.questions) != request.question_count:
            raise self._invalid_assessment("The generated exam did not match questionCount.")
        self._validate_outcomes(
            course, [question.learning_outcome for question in generated.questions]
        )
        if any(question.section not in generated.sections for question in generated.questions):
            raise self._invalid_assessment("Every exam question must belong to a declared section.")

        return Exam(
            id=f"{kind}-{number:02}-{uuid.uuid4().hex[:8]}",
            kind=kind,
            title="Final Exam" if kind == "final" else f"Midterm {number}",
            coverage=coverage,
            description=generated.description,
            status="Draft",
            question_count=len(generated.questions),
            duration_minutes=request.duration_minutes,
            sections=generated.sections,
            questions=generated.questions,
        )

    def _require_provider(self) -> None:
        if not self._settings.generation_provider_configured:
            raise ApiError(
                503,
                ErrorCode.PROVIDER_NOT_CONFIGURED,
                "Generation is unavailable until OPENAI_API_KEY is configured.",
            )

    @staticmethod
    def _validate_model(model: type[ModelType], value: dict[str, Any]) -> ModelType:
        try:
            return model.model_validate(value)
        except ValidationError as error:
            details = [
                f"{'.'.join(str(part) for part in item['loc'])}: {item['msg']}"
                for item in error.errors()
            ]
            raise ApiError(
                502,
                ErrorCode.UPSTREAM_INVALID_RESPONSE,
                "The generation provider response did not match the required schema.",
                details,
            ) from error

    @staticmethod
    def _validate_course_plan(plan: CoursePlan) -> None:
        if [item.number for item in plan.lecture_plan] != list(range(1, 13)):
            raise ApiError(
                502,
                ErrorCode.UPSTREAM_INVALID_RESPONSE,
                "The generated course plan must contain lectures numbered 1 through 12.",
            )

        planned_ids = {item.id for item in plan.lecture_plan}
        unit_ids = [lecture_id for unit in plan.units for lecture_id in unit.lecture_ids]
        if set(unit_ids) != planned_ids or len(unit_ids) != len(planned_ids):
            raise ApiError(
                502,
                ErrorCode.UPSTREAM_INVALID_RESPONSE,
                "Course units must reference each planned lecture exactly once.",
            )

        blueprint = {item.kind: item for item in plan.assessment_blueprint}
        if (
            "midterm" not in blueprint
            or blueprint["midterm"].scheduled_after_lecture != 6
            or "final" not in blueprint
            or blueprint["final"].scheduled_after_lecture != 12
        ):
            raise ApiError(
                502,
                ErrorCode.UPSTREAM_INVALID_RESPONSE,
                "The assessment blueprint must schedule its midterm after lecture 6 "
                "and final after lecture 12.",
            )

        outcomes = set(plan.learning_outcomes)
        if any(
            outcome not in outcomes
            for item in plan.assessment_blueprint
            for outcome in item.learning_outcomes
        ):
            raise ApiError(
                502,
                ErrorCode.UPSTREAM_INVALID_RESPONSE,
                "Every blueprint assessment must map to a course learning outcome.",
            )

    @staticmethod
    def _course_id(course_code: str) -> str:
        slug = re.sub(r"[^a-z0-9]+", "-", course_code.lower()).strip("-")
        return f"{slug}-{uuid.uuid4().hex[:8]}"

    @staticmethod
    def _course_context(course: Course, through_lecture: int) -> dict[str, Any]:
        lectures = [item for item in course.lecture_plan if item.number <= through_lecture]
        return {
            "title": course.title,
            "learningOutcomes": course.learning_outcomes,
            "prerequisites": course.prerequisites,
            "lectures": [item.model_dump(by_alias=True) for item in lectures],
        }

    @staticmethod
    def _validate_outcomes(course: Course, outcomes: list[str]) -> None:
        valid_outcomes = set(course.learning_outcomes)
        if any(outcome not in valid_outcomes for outcome in outcomes):
            raise GenerationService._invalid_assessment(
                "Generated assessment criteria must map to exact course learning outcomes."
            )

    @staticmethod
    def _invalid_assessment(message: str) -> ApiError:
        return ApiError(502, ErrorCode.UPSTREAM_INVALID_RESPONSE, message)
