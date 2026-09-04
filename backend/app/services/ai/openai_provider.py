import base64

import httpx

from app.core.config import Settings
from app.core.errors import AppError
from app.schemas.catalog import CatalogModelOutput
from app.services.ai.base import CatalogGenerationInput
from app.services.ai.json_parser import parse_catalog_json
from app.services.ai.prompt import SYSTEM_PROMPT, build_user_prompt


class OpenAICatalogProvider:
    name = "openai"

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    async def generate(self, request: CatalogGenerationInput) -> CatalogModelOutput:
        if not self.settings.openai_api_key:
            raise AppError("AI_PROVIDER_NOT_CONFIGURED", "OpenAI is not configured on the backend.", 503)

        image_data = base64.b64encode(request.image_bytes).decode("ascii")
        payload = {
            "model": self.settings.openai_model,
            "instructions": SYSTEM_PROMPT,
            "input": [
                {
                    "role": "user",
                    "content": [
                        {"type": "input_text", "text": build_user_prompt(request)},
                        {
                            "type": "input_image",
                            "image_url": f"data:{request.image_mime_type};base64,{image_data}",
                            "detail": "low",
                        },
                    ],
                }
            ],
            "text": {
                "format": {
                    "type": "json_schema",
                    "name": "catalog_draft",
                    "strict": True,
                    "schema": CatalogModelOutput.model_json_schema(),
                }
            },
            "store": False,
            "max_output_tokens": 1200,
        }
        try:
            async with httpx.AsyncClient(timeout=self.settings.ai_timeout_seconds) as client:
                response = await client.post(
                    "https://api.openai.com/v1/responses",
                    headers={"Authorization": f"Bearer {self.settings.openai_api_key}"},
                    json=payload,
                )
                if len(response.content) > self.settings.ai_max_response_bytes:
                    raise AppError("AI_RESPONSE_TOO_LARGE", "OpenAI returned an unexpectedly large response.", 502, True)
                if response.status_code == 429:
                    raise AppError("AI_PROVIDER_RATE_LIMITED", "OpenAI is temporarily rate limited.", 503, True, 30)
                response.raise_for_status()
        except AppError:
            raise
        except httpx.HTTPError as exc:
            raise AppError("AI_PROVIDER_FAILED", "OpenAI could not generate the catalogue.", 502, True) from exc

        try:
            body = response.json()
        except ValueError as exc:
            raise AppError("AI_INVALID_RESPONSE", "OpenAI returned an invalid response.", 502, True) from exc
        output_text = body.get("output_text") or ""
        if not output_text:
            for item in body.get("output", []):
                for content in item.get("content", []):
                    if content.get("type") == "output_text":
                        output_text += content.get("text", "")
        return parse_catalog_json(output_text, "OpenAI")
