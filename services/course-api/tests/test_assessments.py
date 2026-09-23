import json

from fastapi.testclient import TestClient

from app.api.routes.courses import get_course_store, get_generation_service
from app.config import Settings, get_settings
from app.main import app
from app.models.assessment import Assignment, Exam
from app.services.course_store import CourseStore


class StubAssessmentGeneration:
    async def generate_assignment(self, _course, request, number):
        return Assignment(
            id=f"assignment-{number}",
            kind="assignment",
            title=f"Assignment {number}: {request.topic}",
            coverage=request.topic,
            description="Generated assignment draft.",
            status="Draft",
            problem_count=request.problem_count,
            points=request.problem_count * 4,
            difficulty=request.difficulty,
            rubric=["Show the reasoning."],
        )

    async def generate_midterm(self, _course, request, number):
        return Exam(
            id=f"midterm-{number}",
            kind="midterm",
            title=f"Midterm {number}",
            coverage=request.coverage or ", ".join(request.topics),
            description="Generated midterm draft.",
            status="Draft",
            question_count=request.question_count,
            duration_minutes=request.duration_minutes,
            sections=["Concepts"],
        )

    async def generate_final(self, _course, request, number):
        return Exam(
            id=f"final-{number}",
            kind="final",
            title="Final Exam",
            coverage=request.coverage,
            description="Generated final draft.",
            status="Draft",
            question_count=request.question_count,
            duration_minutes=request.duration_minutes,
            sections=["Cumulative concepts"],
        )


def test_assessment_generation_requires_provider_key() -> None:
    app.dependency_overrides[get_settings] = lambda: Settings(openai_api_key=None)
    try:
        client = TestClient(app)
        responses = [
            client.post(
                "/api/courses/calculus-101/assignments/generate",
                json={"topic": "Limits", "difficulty": "introductory", "problemCount": 3},
            ),
            client.post(
                "/api/courses/calculus-101/midterms/generate",
                json={"topics": ["Limits"], "durationMinutes": 75, "questionCount": 10},
            ),
            client.post(
                "/api/courses/calculus-101/finals/generate",
                json={"coverage": "Cumulative", "durationMinutes": 120, "questionCount": 15},
            ),
        ]
    finally:
        app.dependency_overrides.clear()

    assert [response.status_code for response in responses] == [503, 503, 503]
    assert all(
        response.json()["error"]["code"] == "PROVIDER_NOT_CONFIGURED" for response in responses
    )


def test_assessment_route_checks_course_before_provider() -> None:
    app.dependency_overrides[get_settings] = lambda: Settings(openai_api_key=None)
    try:
        response = TestClient(app).post(
            "/api/courses/unknown/assignments/generate",
            json={"topic": "Limits", "difficulty": "introductory", "problemCount": 3},
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"


def test_all_assessment_routes_persist_generated_drafts(tmp_path) -> None:
    store = CourseStore(archive_directory=tmp_path)
    app.dependency_overrides[get_course_store] = lambda: store
    app.dependency_overrides[get_generation_service] = StubAssessmentGeneration
    try:
        client = TestClient(app)
        responses = [
            client.post(
                "/api/courses/calculus-101/assignments/generate",
                json={"topic": "Limits", "difficulty": "introductory", "problemCount": 3},
            ),
            client.post(
                "/api/courses/calculus-101/midterms/generate",
                json={"topics": ["Limits"], "durationMinutes": 75, "questionCount": 10},
            ),
            client.post(
                "/api/courses/calculus-101/finals/generate",
                json={"coverage": "Cumulative", "durationMinutes": 120, "questionCount": 15},
            ),
        ]
        course_response = client.get("/api/courses/calculus-101")
    finally:
        app.dependency_overrides.clear()

    assert [response.status_code for response in responses] == [201, 201, 201]
    assert course_response.status_code == 200
    persisted = course_response.json()["course"]["assessments"][-3:]
    assert [item["kind"] for item in persisted] == ["assignment", "midterm", "final"]
    assert all(item["status"] == "Draft" for item in persisted)
    snapshots = list(tmp_path.glob("*.json"))
    assert len(snapshots) == 1
    archived_course = json.loads(snapshots[0].read_text(encoding="utf-8"))
    assert [item["kind"] for item in archived_course["assessments"][-3:]] == [
        "assignment",
        "midterm",
        "final",
    ]
