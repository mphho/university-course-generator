import hashlib
import json
import os
import re
import tempfile
from pathlib import Path

from app.data.calculus_101 import CALCULUS_101
from app.models.course import Course


class CourseStore:
    def __init__(self, archive_directory: Path | None = None) -> None:
        self._courses: dict[str, Course] = {CALCULUS_101.id: CALCULUS_101.model_copy(deep=True)}
        self._archive_directory = archive_directory

    def list_courses(self) -> list[Course]:
        return [course.model_copy(deep=True) for course in self._courses.values()]

    def get_course(self, course_id: str) -> Course | None:
        course = self._courses.get(course_id)
        return course.model_copy(deep=True) if course else None

    def add_course(self, course: Course) -> None:
        stored_course = course.model_copy(deep=True)
        if self._archive_directory is not None:
            self._write_snapshot(stored_course)
        self._courses[course.id] = stored_course

    def _write_snapshot(self, course: Course) -> None:
        self._archive_directory.mkdir(parents=True, exist_ok=True)
        slug = re.sub(r"[^A-Za-z0-9_-]+", "-", course.id).strip("-_") or "course"
        identifier = hashlib.sha256(course.id.encode("utf-8")).hexdigest()[:12]
        destination = self._archive_directory / f"{slug}-{identifier}.json"
        temporary_path: Path | None = None
        try:
            with tempfile.NamedTemporaryFile(
                mode="w",
                encoding="utf-8",
                dir=self._archive_directory,
                prefix=f".{destination.name}.",
                suffix=".tmp",
                delete=False,
            ) as temporary_file:
                temporary_path = Path(temporary_file.name)
                json.dump(
                    course.model_dump(mode="json", by_alias=True),
                    temporary_file,
                    ensure_ascii=False,
                    indent=2,
                )
                temporary_file.write("\n")
            os.replace(temporary_path, destination)
        finally:
            if temporary_path is not None:
                temporary_path.unlink(missing_ok=True)
