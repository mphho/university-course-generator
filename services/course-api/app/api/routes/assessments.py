from fastapi import APIRouter, Depends, status

from app.api.routes.courses import get_course_store, get_generation_service
from app.errors import ApiError
from app.models.assessment import AssignmentResponse, ExamResponse
from app.models.common import ErrorCode
from app.models.course import Course
from app.models.requests import AssignmentRequest, ExamRequest, FinalExamRequest
from app.services.course_store import CourseStore
from app.services.generation_service import GenerationService

router = APIRouter()


def _find_course(store: CourseStore, course_id: str) -> Course:
    course = store.get_course(course_id)
    if course is None:
        raise ApiError(404, ErrorCode.NOT_FOUND, f"Course '{course_id}' was not found.")
    return course


@router.post(
    "/api/courses/{course_id}/assignments/generate",
    response_model=AssignmentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def generate_assignment(
    course_id: str,
    request: AssignmentRequest,
    store: CourseStore = Depends(get_course_store),
    generation: GenerationService = Depends(get_generation_service),
) -> AssignmentResponse:
    course = _find_course(store, course_id)
    number = 1 + sum(item.kind == "assignment" for item in course.assessments)
    assessment = await generation.generate_assignment(course, request, number)
    course.assessments.append(assessment)
    store.add_course(course)
    return AssignmentResponse(assessment=assessment)


@router.post(
    "/api/courses/{course_id}/midterms/generate",
    response_model=ExamResponse,
    status_code=status.HTTP_201_CREATED,
)
async def generate_midterm(
    course_id: str,
    request: ExamRequest,
    store: CourseStore = Depends(get_course_store),
    generation: GenerationService = Depends(get_generation_service),
) -> ExamResponse:
    course = _find_course(store, course_id)
    number = 1 + sum(item.kind == "midterm" for item in course.assessments)
    assessment = await generation.generate_midterm(course, request, number)
    course.assessments.append(assessment)
    store.add_course(course)
    return ExamResponse(assessment=assessment)


@router.post(
    "/api/courses/{course_id}/finals/generate",
    response_model=ExamResponse,
    status_code=status.HTTP_201_CREATED,
)
async def generate_final(
    course_id: str,
    request: FinalExamRequest,
    store: CourseStore = Depends(get_course_store),
    generation: GenerationService = Depends(get_generation_service),
) -> ExamResponse:
    course = _find_course(store, course_id)
    number = 1 + sum(item.kind == "final" for item in course.assessments)
    assessment = await generation.generate_final(course, request, number)
    course.assessments.append(assessment)
    store.add_course(course)
    return ExamResponse(assessment=assessment)
