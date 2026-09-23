from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(Path(__file__).resolve().parents[2].parent / ".env", ".env"),
        extra="ignore",
    )

    openai_api_key: str | None = None
    openai_base_url: str = "https://apidev.hku.hk/openai/v1/responses"
    openai_model: str = "gpt-6-luna"
    openai_reasoning_effort: str = "xhigh"
    openai_timeout_seconds: float = 90
    course_archive_directory: Path = Path(__file__).resolve().parents[3] / "generated-courses"

    @property
    def generation_provider_configured(self) -> bool:
        return bool(self.openai_api_key and self.openai_api_key.strip())


def get_settings() -> Settings:
    return Settings()
