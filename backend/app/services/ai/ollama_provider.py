import base64
import logging

import httpx

from app.core.config import Settings
from app.core.errors import AppError
from app.schemas.catalog import CatalogModelOutput
from app.services.ai.base import CatalogGenerationInput
from app.services.ai.json_parser import parse_catalog_json
from app.services.ai.prompt import SYSTEM_PROMPT, build_user_prompt

logger = logging.getLogger(__name__)


class OllamaCatalogProvider:
    name = "ollama"

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    @property
    def base_url(self) -> str:
        base_url = self.settings.ollama_base_url.rstrip("/")
        if base_url.lower() in {"https://ollama.com", "https://www.ollama.com"}:
            return f"{base_url}/api"
        if base_url.lower().endswith("/api/chat"):
            return base_url[:-5]
        return base_url

    @property
    def model(self) -> str:
        model = self.settings.ollama_model.strip()
        # Ollama's local CLI uses names such as `gemma4:31b-cloud`, while the
        # direct https://ollama.com/api host exposes the same model without the
        # `-cloud` suffix.
        if not self.settings.ollama_is_local and model.endswith("-cloud"):
            return model.removesuffix("-cloud")
        return model

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
            "model": self.model,
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
        endpoint = f"{self.base_url}/chat"
        try:
            async with httpx.AsyncClient(timeout=self.settings.ai_timeout_seconds) as client:
                response = await client.post(endpoint, headers=headers, json=payload)
                if len(response.content) > self.settings.ai_max_response_bytes:
                    raise AppError("AI_RESPONSE_TOO_LARGE", "Ollama returned an unexpectedly large response.", 502, True)
                self._raise_for_provider_status(response)
        except AppError:
            raise
        except httpx.TimeoutException as exc:
            raise AppError(
                "AI_PROVIDER_TIMEOUT",
                "Ollama took too long to respond. Please try again.",
                504,
                True,
                15,
            ) from exc
        except httpx.ConnectError as exc:
            raise AppError(
                "AI_PROVIDER_UNREACHABLE",
                "The backend could not connect to Ollama. Please try again shortly.",
                503,
                True,
                15,
            ) from exc
        except httpx.HTTPError as exc:
            raise AppError(
                "AI_PROVIDER_FAILED",
                "Ollama could not generate the catalogue due to a network error.",
                502,
                True,
            ) from exc

        try:
            body = response.json()
        except ValueError as exc:
            raise AppError("AI_INVALID_RESPONSE", "Ollama returned an invalid response.", 502, True) from exc
        content = (body.get("message") or {}).get("content", "")
        if not isinstance(content, str) or not content.strip():
            raise AppError("AI_EMPTY_RESPONSE", "Ollama returned an empty catalogue response.", 502, True)
        return parse_catalog_json(content, "Ollama")

    def _raise_for_provider_status(self, response: httpx.Response) -> None:
        status = response.status_code
        if status < 400:
            return

        # Do not log the response body: an upstream error can echo request data.
        logger.warning(
            "Ollama request rejected: status=%s model=%s endpoint_host=%s",
            status,
            self.model,
            response.request.url.host if response.request else "unknown",
        )
        if status in {401, 403}:
            raise AppError(
                "AI_PROVIDER_AUTH_FAILED",
                "Ollama rejected the backend API key. Update OLLAMA_API_KEY and redeploy.",
                503,
            )
        if status == 404:
            raise AppError(
                "AI_MODEL_NOT_AVAILABLE",
                f"Ollama model '{self.model}' was not found at the configured endpoint. For Ollama Cloud use OLLAMA_BASE_URL=https://ollama.com/api and a direct-API vision model such as gemma4:31b.",
                503,
            )
        if status == 429:
            raise AppError(
                "AI_PROVIDER_RATE_LIMITED",
                "Ollama is temporarily rate limited. Please try again shortly.",
                503,
                True,
                30,
            )
        if status in {400, 422}:
            raise AppError(
                "AI_PROVIDER_REQUEST_REJECTED",
                f"Ollama rejected the image request for model '{self.model}'. Verify that it is an available direct-API vision model.",
                502,
            )
        if status >= 500:
            raise AppError(
                "AI_PROVIDER_UNAVAILABLE",
                "Ollama is temporarily unavailable. Please try again shortly.",
                503,
                True,
                30,
            )
        raise AppError("AI_PROVIDER_FAILED", "Ollama rejected the catalogue request.", 502)
