from fastapi import APIRouter, Depends

from app.config import Settings, get_settings
from app.models.course import HealthResponse

router = APIRouter()


@router.get("/api/health", response_model=HealthResponse)
async def get_health(settings: Settings = Depends(get_settings)) -> HealthResponse:
    configured = settings.generation_provider_configured
    return HealthResponse(
        status="ready" if configured else "degraded",
        services={
            "local_api": "available",
            "generation_provider": "configured" if configured else "not-configured",
        },
    )
