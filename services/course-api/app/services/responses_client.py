import json
from typing import Any

import httpx

from app.config import Settings
from app.errors import ApiError
from app.models.common import ErrorCode


class ResponsesClient:
    def __init__(
        self,
        settings: Settings,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self._settings = settings
        self._transport = transport

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
            raise ApiError(
                502,
                ErrorCode.UPSTREAM_ERROR,
                "The generation provider timed out.",
            ) from error
        except httpx.HTTPError as error:
            raise ApiError(
                502,
                ErrorCode.UPSTREAM_ERROR,
                "The generation provider could not be reached.",
            ) from error

        if response.is_error:
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
            raise ApiError(
                502,
                ErrorCode.UPSTREAM_INVALID_RESPONSE,
                "The generation provider returned an invalid JSON response.",
            ) from error

        if not isinstance(result, dict):
            raise ApiError(
                502,
                ErrorCode.UPSTREAM_INVALID_RESPONSE,
                "The generation provider response must be a JSON object.",
            )
        return result

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
