import asyncio
import json
from typing import Any

import httpx
import pytest
from fastapi.testclient import TestClient

from app.api.routes.courses import get_course_store, get_generation_service
from app.config import Settings, get_settings
from app.data.calculus_101 import CALCULUS_101
from app.errors import ApiError
from app.main import app
from app.models.course import CourseBriefRequest
from app.models.generation import (
    AssessmentBlueprintItem,
    ConceptDependency,
    CoursePlan,
    CourseUnit,
    LectureContextSections,
    LectureExpansion,
    LectureFoundations,
    LectureFormalSection,
    LecturePlan,
    LecturePractice,
    LectureSynthesis,
    WorkedExample,
)
from app.models.requests import AssignmentRequest, ExamRequest, FinalExamRequest
from app.services.course_store import CourseStore
from app.services.generation_service import GenerationService
from app.services.responses_client import ResponsesClient


def test_course_generation_returns_503_without_provider_credentials() -> None:
    app.dependency_overrides[get_settings] = lambda: Settings(openai_api_key=None)
    try:
        response = TestClient(app).post(
            "/api/courses/generate",
            json={
                "title": "Linear Algebra",
                "courseCode": "MATH 221",
                "level": "Undergraduate",
                "learningOutcomes": ["Solve linear systems and interpret their solution sets."],
                "testMode": True,
            },
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 503
    assert response.json()["error"] == {
        "code": "PROVIDER_NOT_CONFIGURED",
        "message": "Generation is unavailable until OPENAI_API_KEY is configured.",
        "details": [],
    }


def test_responses_client_sends_configured_model_and_parses_output_text() -> None:
    observed: dict[str, Any] = {}

    def respond(request: httpx.Request) -> httpx.Response:
        observed["url"] = str(request.url)
        observed["api_key"] = request.headers["api-key"]
        observed["authorization"] = request.headers.get("Authorization")
        observed["payload"] = json.loads(request.content)
        return httpx.Response(200, json={"output_text": '{"answer":"ready"}'})

    client = ResponsesClient(
        Settings(openai_api_key="test-key"),
        transport=httpx.MockTransport(respond),
    )

    result = asyncio.run(client.complete_json("system", "user"))

    assert result == {"answer": "ready"}
    assert observed["url"] == "https://apidev.hku.hk/openai/v1/responses"
    assert observed["api_key"] == "test-key"
    assert observed["authorization"] is None
    assert observed["payload"]["model"] == "gpt-6-luna"
    assert observed["payload"]["reasoning"] == {"effort": "xhigh"}


def test_responses_client_maps_invalid_output_to_stable_error() -> None:
    def respond(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"output_text": "not json"})

    client = ResponsesClient(
        Settings(openai_api_key="test-key"),
        transport=httpx.MockTransport(respond),
    )

    try:
        asyncio.run(client.complete_json("system", "user"))
    except Exception as error:
        assert getattr(error, "status_code") == 502
        assert getattr(error, "code").value == "UPSTREAM_INVALID_RESPONSE"
    else:
        raise AssertionError("Invalid provider output should fail validation")


def test_lecture_stage_repairs_response_missing_required_fields() -> None:
    expected = make_context_sections()
    client = QueueJsonClient(
        [
            {"applications": ["An application example."]},
            expected.model_dump(by_alias=True),
        ]
    )
    service = GenerationService(Settings(openai_api_key="test-key"), client)

    result = asyncio.run(
        service._generate_lecture_stage(
            LectureContextSections,
            "LectureContextSections",
            "Write applications and misconceptions.",
            {"title": "Linear Algebra"},
            {"title": "Vector spaces"},
        )
    )

    repair_request = json.loads(client.prompts[1])
    assert result == expected
    assert len(client.prompts) == 2
    assert repair_request["schemaName"] == "LectureContextSections"
    assert repair_request["invalidResponse"] == {"applications": ["An application example."]}
    assert any(
        "misconceptions: Field required" in item
        for item in repair_request["validationErrors"]
    )


class StubResponsesClient:
    def __init__(self) -> None:
        self.calls = 0
        self.system_prompts: list[str] = []

    async def complete_json(self, system_prompt: str, user_prompt: str) -> dict[str, Any]:
        self.calls += 1
        self.system_prompts.append(system_prompt)
        request = json.loads(user_prompt)
        if request.get("schemaName") == "LectureFoundations":
            return make_foundations().model_dump(by_alias=True)
        if request.get("schemaName", "").startswith("LectureFormalSection"):
            return make_formal_section(request["schemaName"]).model_dump(by_alias=True)
        if request.get("schemaName", "").startswith("WorkedExample"):
            return make_worked_example(request["schemaName"]).model_dump(by_alias=True)
        if request.get("schemaName") == "LectureContextSections":
            return make_context_sections().model_dump(by_alias=True)
        if request.get("schemaName") == "LectureSynthesis":
            return make_synthesis().model_dump(by_alias=True)
        if request.get("schemaName") == "LecturePractice":
            return make_practice().model_dump(by_alias=True)
        if request.get("schemaName") == "LectureExpansion":
            return make_expansion().model_dump(by_alias=True)
        if '"requiredLectureCount": 12' in user_prompt:
            return make_plan().model_dump(by_alias=True)
        raise AssertionError("Unexpected generation request")


class QueueJsonClient:
    def __init__(self, responses: list[dict[str, Any]]) -> None:
        self.responses = responses
        self.prompts: list[str] = []

    async def complete_json(self, _system_prompt: str, user_prompt: str) -> dict[str, Any]:
        self.prompts.append(user_prompt)
        return self.responses.pop(0)


def generated_exam_payload(outcome: str) -> dict[str, Any]:
    return {
        "description": "A structured exam draft.",
        "sections": ["Concepts"],
        "questions": [
            {
                "section": "Concepts",
                "prompt": "Explain the central idea and apply it to a new case.",
                "learningOutcome": outcome,
                "points": 10,
                "difficulty": "intermediate",
                "expectedSolution": "State assumptions, then justify each step.",
                "rubric": ["Correct reasoning", "Clear interpretation"],
            }
        ],
    }


def test_assignment_generation_enforces_requested_problem_count() -> None:
    outcome = CALCULUS_101.learning_outcomes[0]
    problem = {
        "prompt": "Evaluate a limit and explain the continuity conclusion.",
        "learningOutcome": outcome,
        "points": 4,
        "difficulty": "intermediate",
        "hints": ["Compare nearby values."],
        "expectedAnswer": "The two-sided limit exists and equals the function value.",
        "rubric": ["Valid limit strategy", "Clear explanation"],
    }
    client = QueueJsonClient(
        [
            {
                "description": "A limits assignment.",
                "rubric": ["Show reasoning."],
                "problems": [problem],
            }
        ]
    )
    service = GenerationService(Settings(openai_api_key="test-key"), client)

    with pytest.raises(ApiError, match="problemCount") as error:
        asyncio.run(
            service.generate_assignment(
                CALCULUS_101,
                AssignmentRequest(topic="Limits", difficulty="intermediate", problem_count=2),
                1,
            )
        )

    assert error.value.status_code == 502


def test_exam_generation_sends_only_material_within_exam_boundary() -> None:
    outcome = CALCULUS_101.learning_outcomes[0]
    client = QueueJsonClient([generated_exam_payload(outcome), generated_exam_payload(outcome)])
    service = GenerationService(Settings(openai_api_key="test-key"), client)

    midterm = asyncio.run(
        service.generate_midterm(
            CALCULUS_101,
            ExamRequest(
                topics=["Limits and Continuity"],
                duration_minutes=75,
                question_count=1,
            ),
            1,
        )
    )
    final = asyncio.run(
        service.generate_final(
            CALCULUS_101,
            FinalExamRequest(
                coverage="Cumulative course outcomes",
                duration_minutes=120,
                question_count=1,
            ),
            1,
        )
    )

    midterm_context, final_context = [json.loads(prompt) for prompt in client.prompts]
    assert midterm.kind == "midterm"
    assert [item["number"] for item in midterm_context["course"]["lectures"]] == list(range(1, 7))
    assert midterm_context["allowedThroughLecture"] == 6
    assert final.kind == "final"
    assert [item["number"] for item in final_context["course"]["lectures"]] == list(range(1, 13))
    assert final_context["allowedThroughLecture"] == 12


def make_plan() -> CoursePlan:
    outcome = "Explain core concepts and apply them to a new problem."
    lectures = [
        LecturePlan(
            id=f"lecture-{number:02}",
            number=number,
            title=f"Topic {number}",
            duration_minutes=50,
            role="Core",
            summary=f"Build understanding of topic {number}.",
            objectives=[outcome],
            concepts=[f"concept-{number}"],
        )
        for number in range(1, 13)
    ]
    return CoursePlan(
        description="A course organized around measurable outcomes.",
        learner_profile="Undergraduate learners with the stated prerequisites.",
        prerequisites=["Algebra"],
        learning_outcomes=[outcome],
        units=[
            CourseUnit(
                id=f"unit-{unit_number}",
                title=f"Unit {unit_number}",
                summary="A connected group of lectures.",
                lecture_ids=[lecture.id for lecture in lectures[start : start + 3]],
            )
            for unit_number, start in enumerate(range(0, 12, 3), start=1)
        ],
        lecture_plan=lectures,
        concept_dependencies=[
            ConceptDependency(
                concept=lecture.concepts[0],
                prerequisite_concepts=[],
                lecture_number=lecture.number,
            )
            for lecture in lectures
        ],
        assessment_blueprint=[
            AssessmentBlueprintItem(
                kind="midterm",
                title="Midterm",
                coverage="Lectures 1 through 6",
                scheduled_after_lecture=6,
                learning_outcomes=[outcome],
                question_count=10,
            ),
            AssessmentBlueprintItem(
                kind="final",
                title="Final",
                coverage="Cumulative",
                scheduled_after_lecture=12,
                learning_outcomes=[outcome],
                question_count=15,
            ),
        ],
        scope_limits=["Generated content requires instructor review."],
    )


def repeated_words(label: str, count: int) -> str:
    return " ".join([label] * count)


def make_foundations(short: bool = False) -> LectureFoundations:
    return LectureFoundations(
        motivating_question="How can we model a changing quantity?",
        prerequisite_check=repeated_words("Prerequisite", 400),
        intuitive_explanation=repeated_words("Intuitive", 1200 if not short else 1200),
    )


def make_formal_section(name: str, word_count: int = 900) -> LectureFormalSection:
    return LectureFormalSection(
        title=f"Formal module {name[-1]}",
        content=repeated_words("Formal", word_count),
    )


def make_worked_example(name: str, word_count: int = 500) -> WorkedExample:
    return WorkedExample(
        prompt=repeated_words(f"Example{name[-1]}", word_count // 3),
        reasoning_steps=[repeated_words("Reasoning", word_count // 3)],
        conclusion=repeated_words("Conclusion", word_count - 2 * (word_count // 3)),
    )


def make_context_sections(short: bool = False) -> LectureContextSections:
    word_count = 2 if short else 220
    misconception_count = 3 if short else 150
    return LectureContextSections(
        applications=[repeated_words("Application", 220) for _ in range(2)],
        misconceptions=[repeated_words("Misconception", misconception_count) for _ in range(3)],
    )


def make_synthesis(short: bool = False) -> LectureSynthesis:
    return LectureSynthesis(
        extension="Short extension." if short else repeated_words("Advanced", 600),
        summary="Short summary." if short else repeated_words("Summary", 250),
    )


def make_practice() -> LecturePractice:
    return LecturePractice(
        prompt="Explain the method for a new example.",
        learning_outcome="Explain core concepts and apply them to a new problem.",
        points=4,
        hints=["Identify the relevant definition."],
        solution="Apply the definition and explain each step.",
        rubric=["Use correct notation.", "Justify the reasoning."],
    )


def make_expansion() -> LectureExpansion:
    return LectureExpansion(
        intuitive_explanation="",
        formal_development="",
        extension="",
    )


def make_staged_responses(short: bool = False) -> list[dict[str, Any]]:
    example_words = 4 if short else 500
    foundation = make_foundations(short)
    if short:
        foundation.intuitive_explanation = repeated_words("Intuitive", 1200)
    responses = [foundation.model_dump(by_alias=True)]
    responses.extend(
        make_formal_section(f"LectureFormalSection{index}", 700 if short else 900).model_dump(
            by_alias=True
        )
        for index in range(1, 3)
    )
    responses.extend(
        make_worked_example(f"WorkedExample{index}", example_words).model_dump(by_alias=True)
        for index in range(1, 4)
    )
    responses.append(make_context_sections(short).model_dump(by_alias=True))
    responses.append(make_synthesis(short).model_dump(by_alias=True))
    responses.append(make_practice().model_dump(by_alias=True))
    return responses


def make_expanded_short_responses() -> list[dict[str, Any]]:
    return [
        *make_staged_responses(short=True),
        LectureExpansion(
            intuitive_explanation=repeated_words("Insight", 1100),
            formal_development=repeated_words("Derivation", 1100),
            extension="",
        ).model_dump(by_alias=True),
    ]


def test_test_mode_preserves_twelve_lecture_map_and_drafts_one_lecture() -> None:
    client = StubResponsesClient()
    service = GenerationService(Settings(openai_api_key="test-key"), client)
    request = CourseBriefRequest(
        title="Linear Algebra",
        course_code="MATH 221",
        level="Undergraduate",
        learning_outcomes=["Solve linear systems."],
        test_mode=True,
    )

    course = asyncio.run(service.generate_course(request))

    assert len(course.lecture_plan) == 12
    assert len(course.lectures) == 1
    assert course.lectures[0].content is not None
    assert client.calls == 10
    assert "GitHub-flavored Markdown" in client.system_prompts[1]
    assert "LaTeX" in client.system_prompts[1]
    assert "750-950 words" in client.system_prompts[2]


def test_short_lecture_notes_get_one_expansion_and_practice_is_not_counted() -> None:
    plan = make_plan()
    client = QueueJsonClient(make_expanded_short_responses())
    service = GenerationService(Settings(openai_api_key="test-key"), client)

    content = asyncio.run(
        service._generate_lecture_content(
            title="Linear Algebra",
            learning_outcomes=plan.learning_outcomes,
            prerequisites=plan.prerequisites,
            lecture_plan=plan.lecture_plan,
            lecture=plan.lecture_plan[0],
        )
    )

    note_word_count = service._lecture_notes_word_count(content)
    content.practice.solution = repeated_words("Solution", 5000)

    assert 5000 <= note_word_count <= 8000
    assert service._lecture_notes_word_count(content) == note_word_count
    assert len(client.prompts) == 10


def test_generate_next_lecture_completes_test_mode_course_without_duplicates() -> None:
    initial_generation = GenerationService(
        Settings(openai_api_key="test-key"), StubResponsesClient()
    )
    course = asyncio.run(
        initial_generation.generate_course(
            CourseBriefRequest(
                title="Linear Algebra",
                course_code="MATH 221",
                level="Undergraduate",
                learning_outcomes=["Solve linear systems."],
                test_mode=True,
            )
        )
    )
    original_content = course.lectures[0].content.model_dump(by_alias=True)
    store = CourseStore()
    store.add_course(course)
    content_responses = [response for _ in range(11) for response in make_staged_responses()]
    response_client = QueueJsonClient(content_responses)
    generation = GenerationService(Settings(openai_api_key="test-key"), response_client)
    app.dependency_overrides[get_course_store] = lambda: store
    app.dependency_overrides[get_generation_service] = lambda: generation

    try:
        with TestClient(app) as test_client:
            for expected_count in range(2, 13):
                response = test_client.post(
                    f"/api/courses/{course.id}/lectures/generate-next"
                )
                assert response.status_code == 200
                generated_course = response.json()["course"]
                assert len(generated_course["lectures"]) == expected_count
                assert len({item["id"] for item in generated_course["lectures"]}) == expected_count
                assert generated_course["lectures"][0]["content"] == original_content

            completed_response = test_client.post(
                f"/api/courses/{course.id}/lectures/generate-next"
            )
    finally:
        app.dependency_overrides.clear()

    assert completed_response.status_code == 200
    assert len(completed_response.json()["course"]["lectures"]) == 12
    assert len(response_client.prompts) == 99
