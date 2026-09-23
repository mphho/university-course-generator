from enum import StrEnum

from pydantic import BaseModel, ConfigDict


def to_camel(value: str) -> str:
    first, *rest = value.split("_")
    return first + "".join(part.capitalize() for part in rest)


class ApiModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class ErrorCode(StrEnum):
    VALIDATION_ERROR = "VALIDATION_ERROR"
    NOT_FOUND = "NOT_FOUND"
    CONFLICT = "CONFLICT"
    PROVIDER_NOT_CONFIGURED = "PROVIDER_NOT_CONFIGURED"
    UPSTREAM_ERROR = "UPSTREAM_ERROR"
    UPSTREAM_INVALID_RESPONSE = "UPSTREAM_INVALID_RESPONSE"
    INTERNAL_ERROR = "INTERNAL_ERROR"


class ErrorDetail(ApiModel):
    error: "ErrorBody"


class ErrorBody(ApiModel):
    code: ErrorCode
    message: str
    details: list[str]
