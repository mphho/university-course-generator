import json
import time
from datetime import datetime, timezone
from typing import Any, Callable
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
from uuid import uuid4

import httpx

from app.config import Settings
from app.errors import ApiError
from app.models.common import ErrorCode


class ResponsesClient:
    def __init__(
        self,
        settings: Settings,
        transport: httpx.AsyncBaseTransport | None = None,
        on_activity: Callable[[dict[str, Any]], None] | None = None,
    ) -> None:
        self._settings = settings
        self._transport = transport
        self._on_activity = on_activity

    async def complete_json(self, system_prompt: str, user_prompt: str) -> dict[str, Any]:
        if not self._settings.generation_provider_configured:
            raise ApiError(
                503,
                ErrorCode.PROVIDER_NOT_CONFIGURED,
                "Generation is unavailable until OPENAI_API_KEY is configured.",
            )

        payload = {
            "model": self._settings.openai_model,
            "reasoning": {"effort": self._settings.openai_reasoning_effort},
            "input": [
                {"role": "system", "content": [{"type": "input_text", "text": system_prompt}]},
                {"role": "user", "content": [{"type": "input_text", "text": user_prompt}]},
            ],
            "text": {"format": {"type": "json_object"}},
        }
        activity_id = uuid4().hex
        started_at = time.perf_counter()
        self._report_activity(
            {
                "id": activity_id,
                "label": self._request_label(payload),
                "method": "POST",
                "url": self._redact_url(self._settings.openai_base_url),
                "status": "pending",
                "startedAt": datetime.now(timezone.utc).isoformat(),
                "requestBody": payload,
            }
        )
        try:
            async with httpx.AsyncClient(
                transport=self._transport,
                timeout=self._settings.openai_timeout_seconds,
            ) as client:
                response = await client.post(
                    self._settings.openai_base_url,
                    headers={"api-key": self._settings.openai_api_key},
                    json=payload,
                )
        except httpx.TimeoutException as error:
            self._finish_activity(activity_id, started_at, "failed", error="Timed out")
            raise ApiError(
                502,
                ErrorCode.UPSTREAM_ERROR,
                "The generation provider timed out.",
            ) from error
        except httpx.HTTPError as error:
            self._finish_activity(activity_id, started_at, "failed", error="Connection failed")
            raise ApiError(
                502,
                ErrorCode.UPSTREAM_ERROR,
                "The generation provider could not be reached.",
            ) from error

        if response.is_error:
            self._finish_activity(
                activity_id,
                started_at,
                "failed",
                status_code=response.status_code,
                error=f"Provider returned HTTP {response.status_code}",
            )
            raise ApiError(
                502,
                ErrorCode.UPSTREAM_ERROR,
                f"The generation provider returned HTTP {response.status_code}.",
            )

        try:
            response_data = response.json()
            output_text = self._extract_output_text(response_data)
            result = json.loads(output_text)
        except (ValueError, TypeError, KeyError) as error:
            self._finish_activity(
                activity_id,
                started_at,
                "failed",
                status_code=response.status_code,
                error="Provider response was not valid JSON output",
            )
            raise ApiError(
                502,
                ErrorCode.UPSTREAM_INVALID_RESPONSE,
                "The generation provider returned an invalid JSON response.",
            ) from error

        if not isinstance(result, dict):
            self._finish_activity(
                activity_id,
                started_at,
                "failed",
                status_code=response.status_code,
                error="Provider response was not a JSON object",
            )
            raise ApiError(
                502,
                ErrorCode.UPSTREAM_INVALID_RESPONSE,
                "The generation provider response must be a JSON object.",
            )
        self._finish_activity(
            activity_id,
            started_at,
            "completed",
            status_code=response.status_code,
        )
        return result

    def _report_activity(self, activity: dict[str, Any]) -> None:
        if self._on_activity is not None:
            self._on_activity(activity)

    def _finish_activity(
        self,
        activity_id: str,
        started_at: float,
        status: str,
        status_code: int | None = None,
        error: str | None = None,
    ) -> None:
        update: dict[str, Any] = {
            "id": activity_id,
            "status": status,
            "elapsedMs": round((time.perf_counter() - started_at) * 1000, 1),
        }
        if status_code is not None:
            update["statusCode"] = status_code
        if error is not None:
            update["error"] = error
        self._report_activity(update)

    @staticmethod
    def _request_label(payload: dict[str, Any]) -> str:
        try:
            user_text = payload["input"][-1]["content"][0]["text"]
            request_data = json.loads(user_text)
        except (KeyError, IndexError, TypeError, ValueError):
            return "Responses API request"
        if isinstance(request_data, dict):
            schema_name = request_data.get("schemaName")
            if isinstance(schema_name, str):
                return schema_name
            schema = request_data.get("schema")
            if isinstance(schema, dict) and isinstance(schema.get("title"), str):
                return schema["title"]
        return "Responses API request"

    @staticmethod
    def _redact_url(url: str) -> str:
        parts = urlsplit(url)
        sensitive_names = ("key", "token", "secret", "password", "authorization")
        query = [
            (name, "[redacted]" if any(term in name.lower() for term in sensitive_names) else value)
            for name, value in parse_qsl(parts.query, keep_blank_values=True)
        ]
        return urlunsplit(parts._replace(query=urlencode(query)))

    @staticmethod
    def _extract_output_text(response_data: Any) -> str:
        if not isinstance(response_data, dict):
            raise TypeError("Provider response must be an object")
        output_text = response_data.get("output_text")
        if isinstance(output_text, str):
            return output_text
        for item in response_data.get("output", []):
            if not isinstance(item, dict):
                continue
            for content in item.get("content", []):
                if not isinstance(content, dict):
                    continue
                if content.get("type") in {"output_text", "text"}:
                    text = content.get("text")
                    if isinstance(text, str):
                        return text
        raise KeyError("No text output was returned")
