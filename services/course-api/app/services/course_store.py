from app.data.calculus_101 import CALCULUS_101
from app.models.course import Course


class CourseStore:
    def __init__(self) -> None:
        self._courses: dict[str, Course] = {CALCULUS_101.id: CALCULUS_101.model_copy(deep=True)}

    def list_courses(self) -> list[Course]:
        return [course.model_copy(deep=True) for course in self._courses.values()]

    def get_course(self, course_id: str) -> Course | None:
        course = self._courses.get(course_id)
        return course.model_copy(deep=True) if course else None

    def add_course(self, course: Course) -> None:
        self._courses[course.id] = course.model_copy(deep=True)
