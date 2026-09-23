from fastapi.testclient import TestClient

from app.api.routes.courses import get_course_store
from app.data.calculus_101 import CALCULUS_101
from app.main import app
from app.services.course_store import CourseStore


def test_starter_course_is_available_without_provider_credentials() -> None:
    response = TestClient(app).get("/api/courses/calculus-101")

    assert response.status_code == 200
    course = response.json()["course"]
    assert course["title"] == "Calculus 101"
    assert course["courseCode"] == "MATH 101"
    assert len(course["lectures"]) == 12
    assert len(course["assessments"]) == 3


def test_unknown_course_uses_the_standard_error_envelope() -> None:
    response = TestClient(app).get("/api/courses/missing-course")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"
    assert response.json()["error"]["details"] == []


def test_course_can_be_imported_and_duplicate_ids_are_not_overwritten() -> None:
    course = CALCULUS_101.model_dump(by_alias=True)
    course["id"] = "imported-calculus-101"
    store = CourseStore()
    app.dependency_overrides[get_course_store] = lambda: store

    try:
        with TestClient(app) as client:
            response = client.post("/api/courses/import", json=course)
            duplicate_response = client.post("/api/courses/import", json=course)
            imported_response = client.get("/api/courses/imported-calculus-101")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 201
    assert response.json()["course"]["id"] == "imported-calculus-101"
    assert duplicate_response.status_code == 409
    assert duplicate_response.json()["error"]["code"] == "CONFLICT"
    assert imported_response.status_code == 200


def test_invalid_course_import_uses_the_standard_validation_envelope() -> None:
    response = TestClient(app).post("/api/courses/import", json={"id": "incomplete"})

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"
