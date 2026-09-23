from fastapi.testclient import TestClient

from app.config import Settings, get_settings
from app.main import app


def test_health_is_available_without_provider_credentials() -> None:
    app.dependency_overrides[get_settings] = lambda: Settings(openai_api_key=None)
    try:
        response = TestClient(app).get("/api/health")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == {
        "status": "degraded",
        "services": {
            "localApi": "available",
            "generationProvider": "not-configured",
        },
    }
