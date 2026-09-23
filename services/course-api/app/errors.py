from app.models.common import ErrorCode


class ApiError(Exception):
    def __init__(
        self,
        status_code: int,
        code: ErrorCode,
        message: str,
        details: list[str] | None = None,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details or []
