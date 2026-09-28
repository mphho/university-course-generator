from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, Header, Query, Request, status

from app.config import Settings, get_settings
from app.errors import ApiError
from app.models.common import ErrorCode
from app.models.course import Course, CourseBriefRequest, CourseListResponse, CourseResponse
from app.services.course_store import CourseStore
from app.services.generation_service import GenerationService
from app.services.responses_client import ResponsesClient

router = APIRouter()


def get_course_store(request: Request) -> CourseStore:
    return request.app.state.course_store


def get_generation_service(
    request: Request,
    generation_id: UUID | None = Header(default=None, alias="X-Generation-ID"),
    settings: Settings = Depends(get_settings),
) -> GenerationService:
    on_activity = None
    if generation_id is not None:
        progress_store = request.app.state.generation_progress
        generation_key = str(generation_id)

        def on_activity(activity: dict[str, Any]) -> None:
            progress_store.record_activity(generation_key, activity)

    return GenerationService(settings, client=ResponsesClient(settings, on_activity=on_activity))


@router.get("/api/courses", response_model=CourseListResponse)
async def list_courses(
    store: CourseStore = Depends(get_course_store),
) -> CourseListResponse:
    return CourseListResponse(courses=store.list_courses())


@router.post(
    "/api/courses/generate",
    response_model=CourseResponse,
    status_code=status.HTTP_201_CREATED,
)
async def generate_course(
    request: CourseBriefRequest,
    http_request: Request,
    generation_id: UUID | None = Header(default=None, alias="X-Generation-ID"),
    store: CourseStore = Depends(get_course_store),
    generation: GenerationService = Depends(get_generation_service),
) -> CourseResponse:
    generation_key = str(generation_id) if generation_id is not None else None
    progress_store = http_request.app.state.generation_progress
    if generation_key is not None:
        progress_store.start(generation_key)
    try:
        course = await generation.generate_course(request)
        store.add_course(course)
    except Exception:
        if generation_key is not None:
            progress_store.finish(generation_key, "failed")
        raise
    if generation_key is not None:
        progress_store.finish(generation_key, "completed")
    return CourseResponse(course=course)


@router.get("/api/generation/{generation_id}")
async def get_generation_progress(
    generation_id: UUID,
    request: Request,
    after: int = Query(default=0, ge=0),
) -> dict[str, object]:
    progress = request.app.state.generation_progress.get(str(generation_id), after)
    if progress is None:
        raise ApiError(404, ErrorCode.NOT_FOUND, "Generation progress was not found.")
    return progress


@router.post(
    "/api/courses/import",
    response_model=CourseResponse,
    status_code=status.HTTP_201_CREATED,
)
async def import_course(
    course: Course,
    store: CourseStore = Depends(get_course_store),
) -> CourseResponse:
    if store.get_course(course.id) is not None:
        raise ApiError(
            409,
            ErrorCode.CONFLICT,
            f"Course '{course.id}' already exists and was not replaced.",
        )
    store.add_course(course)
    return CourseResponse(course=course)


@router.post(
    "/api/courses/{course_id}/lectures/generate-next",
    response_model=CourseResponse,
)
async def generate_next_lecture(
    course_id: str,
    store: CourseStore = Depends(get_course_store),
    generation: GenerationService = Depends(get_generation_service),
) -> CourseResponse:
    course = store.get_course(course_id)
    if course is None:
        raise ApiError(404, ErrorCode.NOT_FOUND, f"Course '{course_id}' was not found.")
    course = await generation.generate_next_lecture(course)
    store.add_course(course)
    return CourseResponse(course=course)


@router.get("/api/courses/{course_id}", response_model=CourseResponse)
async def get_course(
    course_id: str,
    store: CourseStore = Depends(get_course_store),
) -> CourseResponse:
    course = store.get_course(course_id)
    if course is None:
        raise ApiError(404, ErrorCode.NOT_FOUND, f"Course '{course_id}' was not found.")
    return CourseResponse(course=course)
