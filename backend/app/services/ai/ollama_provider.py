import base64

import httpx

from app.core.config import Settings
from app.core.errors import AppError
from app.schemas.catalog import CatalogModelOutput
from app.services.ai.base import CatalogGenerationInput
from app.services.ai.json_parser import parse_catalog_json
from app.services.ai.prompt import SYSTEM_PROMPT, build_user_prompt


class OllamaCatalogProvider:
    name = "ollama"

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    async def generate(self, request: CatalogGenerationInput) -> CatalogModelOutput:
        if not self.settings.ollama_api_key and not self.settings.ollama_is_local:
            raise AppError("AI_PROVIDER_NOT_CONFIGURED", "Ollama Cloud is not configured on the backend.", 503)

        headers = {}
        if self.settings.ollama_api_key:
            headers["Authorization"] = f"Bearer {self.settings.ollama_api_key}"
        schema = CatalogModelOutput.model_json_schema()
        prompt = (
            f"{build_user_prompt(request)}\n\nReturn JSON only. It must follow this JSON Schema:\n{schema}"
        )
        payload = {
            "model": self.settings.ollama_model,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": prompt,
                    "images": [base64.b64encode(request.image_bytes).decode("ascii")],
                },
            ],
            "stream": False,
            "options": {"temperature": 0.1, "num_predict": 1200},
        }
        endpoint = f"{self.settings.ollama_base_url.rstrip('/')}/chat"
        try:
            async with httpx.AsyncClient(timeout=self.settings.ai_timeout_seconds) as client:
                response = await client.post(endpoint, headers=headers, json=payload)
                if len(response.content) > self.settings.ai_max_response_bytes:
                    raise AppError("AI_RESPONSE_TOO_LARGE", "Ollama returned an unexpectedly large response.", 502, True)
                if response.status_code == 429:
                    raise AppError("AI_PROVIDER_RATE_LIMITED", "Ollama is temporarily rate limited.", 503, True, 30)
                response.raise_for_status()
        except AppError:
            raise
        except httpx.HTTPError as exc:
            raise AppError("AI_PROVIDER_FAILED", "Ollama could not generate the catalogue.", 502, True) from exc

        try:
            body = response.json()
        except ValueError as exc:
            raise AppError("AI_INVALID_RESPONSE", "Ollama returned an invalid response.", 502, True) from exc
        content = (body.get("message") or {}).get("content", "")
        return parse_catalog_json(content, "Ollama")
