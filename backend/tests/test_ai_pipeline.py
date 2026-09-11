import asyncio

import httpx
import pytest
from fastapi.testclient import TestClient

from app.api import snaplist
from app.api.dependencies import current_seller
from app.core.errors import AppError
from app.main import app
from app.schemas.account import Account
from app.schemas.catalog import CatalogModelOutput
from app.services.ai.base import CatalogGenerationInput
from app.services.ai.factory import get_catalog_provider
from app.services.ai.json_parser import parse_catalog_json
from app.services.ai.ollama_provider import OllamaCatalogProvider
from app.services.sarvam_language import LanguageContext, SarvamLanguageService, normalize_language_code


client = TestClient(app)


class FakeLanguageService:
    async def prepare_input(self, *_args, **_kwargs) -> LanguageContext:
        return LanguageContext(
            original_text="नीली मिट्टी की कलमदानी",
            english_text="A blue pottery pen stand made from clay.",
            language_code="hi-IN",
            voice_transcript="नीली मिट्टी की कलमदानी",
        )

    async def localize_description(self, _description: str, _language_code: str) -> str:
        return "जयपुर की पारंपरिक नीली पॉटरी से बनी कलमदानी।"


class FakeCatalogProvider:
    name = "ollama"

    async def generate(self, request: CatalogGenerationInput) -> CatalogModelOutput:
        assert request.image_bytes == b"example-image"
        assert "blue pottery" in request.english_description.lower()
        return CatalogModelOutput(
            title="Handmade Blue Pottery Pen Stand",
            description="A handmade clay pen stand decorated in a traditional blue pottery style.",
            category="Home and Office",
            materials=["Clay"],
            suggested_price=450,
        )


@pytest.mark.parametrize(
    ("audio_filename", "audio_mime_type"),
    [
        ("description.webm", "audio/webm"),
        ("description.m4a", "audio/mp4"),
    ],
)
def test_multimodal_generation_uses_language_and_catalog_services(
    monkeypatch,
    audio_filename: str,
    audio_mime_type: str,
) -> None:
    monkeypatch.setattr(snaplist, "SarvamLanguageService", lambda: FakeLanguageService())
    monkeypatch.setattr(snaplist, "get_catalog_provider", lambda _name: FakeCatalogProvider())

    app.dependency_overrides[current_seller] = lambda: Account(
        id="9bededb1-fba2-4a34-9780-aa39418a084d", role="seller", display_name="Rani Devi"
    )
    response = client.post(
        "/api/seller/snaplist/generate",
        data={
            "artisan_name": "Rani Devi",
            "description": "नीली पॉटरी",
            "language_code": "hi-IN",
            "provider": "ollama",
        },
        files={
            "image": ("product.png", b"example-image", "image/png"),
            "audio": (audio_filename, b"example-audio", audio_mime_type),
        },
    )

    app.dependency_overrides.clear()
    assert response.status_code == 200
    body = response.json()
    assert body["ai_provider"] == "ollama"
    assert body["source_language"] == "hi-IN"
    assert body["transcript"] == "नीली मिट्टी की कलमदानी"
    assert body["local_description"].startswith("जयपुर")
    assert body["craft_title"] == "Handmade Blue Pottery Pen Stand"
    assert body["primary_material"] == "Clay"


def test_oversized_ai_request_is_rejected_before_multipart_processing() -> None:
    response = client.post(
        "/api/seller/snaplist/generate",
        content=b"",
        headers={"Content-Length": str(30 * 1024 * 1024)},
    )
    assert response.status_code == 413
    assert response.json()["error"]["code"] == "AI_REQUEST_TOO_LARGE"


def test_prerecorded_audio_duration_over_limit_is_rejected() -> None:
    app.dependency_overrides[current_seller] = lambda: Account(
        id="9bededb1-fba2-4a34-9780-aa39418a084d", role="seller", display_name="Rani Devi"
    )
    response = client.post(
        "/api/seller/snaplist/generate",
        data={
            "artisan_name": "Rani Devi",
            "description": "Clay pot",
            "audio_duration_seconds": "30.5",
        },
        files={
            "image": ("product.png", b"example-image", "image/png"),
            "audio": ("voice.m4a", b"example-audio", "audio/mp4"),
        },
    )

    app.dependency_overrides.clear()
    assert response.status_code == 422


def test_empty_prerecorded_audio_is_rejected() -> None:
    app.dependency_overrides[current_seller] = lambda: Account(
        id="9bededb1-fba2-4a34-9780-aa39418a084d", role="seller", display_name="Rani Devi"
    )
    response = client.post(
        "/api/seller/snaplist/generate",
        data={
            "artisan_name": "Rani Devi",
            "description": "Clay pot",
            "audio_duration_seconds": "10",
        },
        files={
            "image": ("product.png", b"example-image", "image/png"),
            "audio": ("voice.m4a", b"", "audio/mp4"),
        },
    )

    app.dependency_overrides.clear()
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "EMPTY_AUDIO"


def test_ollama_json_parser_accepts_code_fence() -> None:
    result = parse_catalog_json(
        """```json
        {"title":"Clay Lamp","description":"A handmade decorative clay lamp.","category":"Home Decor","materials":["Clay"],"suggested_price":250}
        ```""",
        "Ollama",
    )
    assert result.title == "Clay Lamp"
    assert result.suggested_price == 250


def test_factory_rejects_unknown_provider() -> None:
    with pytest.raises(AppError) as error:
        get_catalog_provider("not-a-provider")
    assert error.value.code == "UNKNOWN_AI_PROVIDER"


@pytest.mark.parametrize(
    ("status_code", "expected_code", "retryable"),
    [
        (401, "AI_PROVIDER_AUTH_FAILED", False),
        (404, "AI_MODEL_NOT_AVAILABLE", False),
        (429, "AI_PROVIDER_RATE_LIMITED", True),
        (500, "AI_PROVIDER_UNAVAILABLE", True),
    ],
)
def test_ollama_provider_maps_safe_actionable_errors(
    status_code: int,
    expected_code: str,
    retryable: bool,
) -> None:
    provider = OllamaCatalogProvider(get_settings_for_ollama_test())
    request = httpx.Request("POST", "https://ollama.com/api/chat")
    response = httpx.Response(status_code, request=request, json={"error": "sensitive upstream detail"})

    with pytest.raises(AppError) as error:
        provider._raise_for_provider_status(response)

    assert error.value.code == expected_code
    assert error.value.retryable is retryable
    assert "sensitive upstream detail" not in error.value.message


def get_settings_for_ollama_test():
    from app.core.config import Settings

    return Settings(
        _env_file=None,
        ollama_api_key="test-key",
        ollama_model="gemma4:31b",
    )


def test_ollama_direct_cloud_configuration_is_normalized() -> None:
    from app.core.config import Settings

    provider = OllamaCatalogProvider(
        Settings(
            _env_file=None,
            ollama_api_key="test-key",
            ollama_base_url="https://ollama.com",
            ollama_model="gemma4:31b-cloud",
        )
    )

    assert provider.base_url == "https://ollama.com/api"
    assert provider.model == "gemma4:31b"


def test_ollama_chat_url_is_not_duplicated() -> None:
    from app.core.config import Settings

    provider = OllamaCatalogProvider(
        Settings(
            _env_file=None,
            ollama_api_key="test-key",
            ollama_base_url="https://ollama.com/api/chat",
        )
    )

    assert provider.base_url == "https://ollama.com/api"


@pytest.mark.parametrize(
    ("short_code", "sarvam_code"),
    [
        ("en", "en-IN"),
        ("hi", "hi-IN"),
        ("gu", "gu-IN"),
        ("mr", "mr-IN"),
        ("ta", "ta-IN"),
        ("te", "te-IN"),
        ("kn", "kn-IN"),
        ("bn", "bn-IN"),
        ("pa", "pa-IN"),
    ],
)
def test_short_ui_language_codes_are_normalized(short_code: str, sarvam_code: str) -> None:
    assert normalize_language_code(short_code) == sarvam_code


def test_short_english_code_skips_unnecessary_sarvam_translation() -> None:
    service = SarvamLanguageService()
    context = asyncio.run(
        service.prepare_input(
            typed_description="A handmade clay water pitcher.",
            language_code="en",
        )
    )

    assert context.english_text == "A handmade clay water pitcher."
    assert context.language_code == "en-IN"
