from app.core.config import Settings, get_settings
from app.core.errors import AppError
from app.services.ai.base import CatalogProvider
from app.services.ai.ollama_provider import OllamaCatalogProvider
from app.services.ai.openai_provider import OpenAICatalogProvider


def get_catalog_provider(name: str | None = None, settings: Settings | None = None) -> CatalogProvider:
    current = settings or get_settings()
    provider_name = (name or current.ai_provider).strip().lower()
    providers = {
        "openai": OpenAICatalogProvider,
        "ollama": OllamaCatalogProvider,
    }
    provider_class = providers.get(provider_name)
    if not provider_class:
        raise AppError(
            "UNKNOWN_AI_PROVIDER",
            f"Unknown AI provider '{provider_name}'. Choose openai or ollama.",
        )
    return provider_class(current)


def provider_status(settings: Settings | None = None) -> dict:
    current = settings or get_settings()
    return {
        "selected": current.ai_provider,
        "providers": {
            "openai": bool(current.openai_api_key),
            "ollama": bool(current.ollama_api_key or current.ollama_is_local),
        },
        "sarvam_configured": bool(current.sarvam_api_key),
    }
