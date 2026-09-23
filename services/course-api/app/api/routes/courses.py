from fastapi import APIRouter, Depends, Request, status

from app.config import Settings, get_settings
from app.errors import ApiError
from app.models.common import ErrorCode
from app.models.course import Course, CourseBriefRequest, CourseListResponse, CourseResponse
from app.services.course_store import CourseStore
from app.services.generation_service import GenerationService

router = APIRouter()


def get_course_store(request: Request) -> CourseStore:
    return request.app.state.course_store


def get_generation_service(settings: Settings = Depends(get_settings)) -> GenerationService:
    return GenerationService(settings)


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
    store: CourseStore = Depends(get_course_store),
    generation: GenerationService = Depends(get_generation_service),
) -> CourseResponse:
    course = await generation.generate_course(request)
    store.add_course(course)
    return CourseResponse(course=course)


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
