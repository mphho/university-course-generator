from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_ENDPOINTS = {
    "responses": "https://apidev.hku.hk/openai/v1/responses",
    "chat_completions": "https://apidev.hku.hk/openai/v1/chat/completions",
}


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(Path(__file__).resolve().parents[2].parent / ".env", ".env"),
        extra="ignore",
    )

    openai_api_key: str | None = None
    openai_api_type: Literal["responses", "chat_completions"] = "responses"
    openai_base_url: str | None = None
    openai_model: str = "gpt-6-luna"
    openai_reasoning_effort: str = "xhigh"
    openai_timeout_seconds: float = 90
    course_archive_directory: Path = Path(__file__).resolve().parents[3] / "generated-courses"

    @property
    def generation_provider_configured(self) -> bool:
        return bool(self.openai_api_key and self.openai_api_key.strip())

    @property
    def openai_endpoint_url(self) -> str:
        return self.openai_base_url or DEFAULT_ENDPOINTS[self.openai_api_type]


def get_settings() -> Settings:
    return Settings()
