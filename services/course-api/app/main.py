import time
from typing import Any

import structlog
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import assessments, courses, health
from app.config import get_settings
from app.errors import ApiError
from app.models.common import ErrorCode
from app.services.course_store import CourseStore

structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.add_log_level,
        structlog.processors.format_exc_info,
        structlog.processors.JSONRenderer(),
    ],
    logger_factory=structlog.PrintLoggerFactory(),
    cache_logger_on_first_use=True,
)
logger = structlog.get_logger(__name__)


def create_app() -> FastAPI:
    application = FastAPI(title="Course Studio API", version="0.1.0")
    application.state.course_store = CourseStore(
        archive_directory=get_settings().course_archive_directory
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["*"],
    )

    @application.middleware("http")
    async def log_request(request: Request, call_next: Any) -> Any:
        started = time.perf_counter()
        response = await call_next(request)
        logger.info(
            "http_request",
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            duration_ms=round((time.perf_counter() - started) * 1000, 2),
        )
        return response

    @application.exception_handler(ApiError)
    async def handle_api_error(_request: Request, error: ApiError) -> JSONResponse:
        return JSONResponse(
            status_code=error.status_code,
            content={
                "error": {
                    "code": error.code.value,
                    "message": error.message,
                    "details": error.details,
                }
            },
        )

    @application.exception_handler(RequestValidationError)
    async def handle_validation_error(
        _request: Request,
        error: RequestValidationError,
    ) -> JSONResponse:
        details = [
            f"{'.'.join(str(part) for part in item['loc'])}: {item['msg']}"
            for item in error.errors()
        ]
        return JSONResponse(
            status_code=422,
            content={
                "error": {
                    "code": ErrorCode.VALIDATION_ERROR.value,
                    "message": "Request validation failed.",
                    "details": details,
                }
            },
        )

    @application.exception_handler(Exception)
    async def handle_unexpected_error(_request: Request, _error: Exception) -> JSONResponse:
        logger.exception("Unhandled API error")
        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "code": ErrorCode.INTERNAL_ERROR.value,
                    "message": "An internal error occurred.",
                    "details": [],
                }
            },
        )

    application.include_router(health.router)
    application.include_router(courses.router)
    application.include_router(assessments.router)
    return application


app = create_app()
