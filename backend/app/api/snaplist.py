import hashlib

from fastapi import APIRouter, Depends, File, Form, UploadFile

from app.api.dependencies import current_seller
from app.schemas.account import Account
from app.core.errors import AppError
from app.schemas.catalog import CatalogDraft, CatalogRequest, GeneratedListing, ProviderStatus
from app.services.ai import get_catalog_provider, provider_status
from app.services.ai.base import CatalogGenerationInput
from app.services.ai_request_guard import AiRequestGuard
from app.services.mock_catalog import generate_mock_catalog
from app.services.sarvam_language import SarvamLanguageService
from app.core.config import get_settings


router = APIRouter(prefix="/seller/snaplist", tags=["seller-ai"])
settings = get_settings()
ai_request_guard = AiRequestGuard(settings)

IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
AUDIO_TYPES = {
    "audio/webm",
    "audio/ogg",
    "audio/mpeg",
    "audio/wav",
    "audio/x-wav",
    "audio/mp4",
    "audio/x-m4a",
    "audio/aac",
    "audio/x-aac",
}
if get_settings().environment.lower() in {"development", "test"}:
    @router.post("/process", response_model=CatalogDraft, include_in_schema=False)
    def process_product(request: CatalogRequest) -> CatalogDraft:
        """Legacy regression-only endpoint; unavailable in production."""
        return generate_mock_catalog(request)


@router.get("/providers", response_model=ProviderStatus)
def list_providers(_account: Account = Depends(current_seller)) -> dict:
    return provider_status()


@router.post("/generate", response_model=GeneratedListing)
async def generate_catalog(
    artisan_name: str = Form(min_length=2, max_length=120),
    description: str = Form(default="", max_length=2000),
    language_code: str = Form(default="unknown", max_length=20),
    provider: str | None = Form(default=None, max_length=30),
    image: UploadFile = File(...),
    audio: UploadFile | None = File(default=None),
    _account: Account = Depends(current_seller),
) -> GeneratedListing:
    artisan_name = " ".join(artisan_name.split())
    description = " ".join(description.replace("\x00", " ").split())
    image_type = (image.content_type or "").split(";", maxsplit=1)[0].lower()
    if image_type not in IMAGE_TYPES:
        raise AppError("UNSUPPORTED_IMAGE", "Use a JPEG, PNG, or WebP product image.")
    image_bytes = await image.read(settings.ai_max_image_bytes + 1)
    if len(image_bytes) > settings.ai_max_image_bytes:
        raise AppError(
            "IMAGE_TOO_LARGE",
            f"The product image must be {settings.ai_max_image_bytes // 1_000_000} MB or smaller.",
        )

    audio_bytes: bytes | None = None
    audio_type = "audio/webm"
    audio_name = "recording.webm"
    if audio:
        audio_type = (audio.content_type or "").split(";", maxsplit=1)[0].lower()
        if audio_type not in AUDIO_TYPES:
            raise AppError("UNSUPPORTED_AUDIO", "Use a WebM, OGG, MP3, WAV, M4A, or AAC recording.")
        audio_bytes = await audio.read(settings.ai_max_audio_bytes + 1)
        if len(audio_bytes) > settings.ai_max_audio_bytes:
            raise AppError("AUDIO_TOO_LARGE", "The recording is too large. Record a voice note under 30 seconds.")
        audio_name = audio.filename or audio_name

    ai_provider = get_catalog_provider(provider)
    fingerprint_hasher = hashlib.sha256()
    for part in [str(_account.id).encode(), ai_provider.name.encode(), artisan_name.encode(), description.encode(), language_code.encode(), image_bytes, audio_bytes or b""]:
        fingerprint_hasher.update(len(part).to_bytes(8, "big"))
        fingerprint_hasher.update(part)
    fingerprint = fingerprint_hasher.hexdigest()

    async def generate() -> GeneratedListing:
        language_service = SarvamLanguageService()
        language = await language_service.prepare_input(
            description,
            language_code,
            audio_bytes,
            audio_name,
            audio_type,
        )
        generated = await ai_provider.generate(
            CatalogGenerationInput(
                artisan_name=artisan_name,
                english_description=language.english_text,
                image_bytes=image_bytes,
                image_mime_type=image_type,
            )
        )
        local_description = await language_service.localize_description(
            generated.description,
            language.language_code,
        )
        return GeneratedListing(
            craft_title=generated.title,
            craft_story=generated.description,
            local_description=local_description,
            primary_material=generated.materials[0] if generated.materials else "Handmade material",
            secondary_materials=generated.materials[1:],
            craft_technique="Handmade craft technique",
            category=generated.category,
            hsn_tax_code=None,
            price_inr=generated.suggested_price,
            market_price_min=max(1, int(generated.suggested_price * 0.9)),
            market_price_max=int(generated.suggested_price * 1.15),
            available_stock=1,
            tags=generated.materials,
            source_language=language.language_code,
            transcript=language.voice_transcript,
            translated_input=language.english_text,
            ai_provider=ai_provider.name,
            confidence=0.78,
            warnings=["Review AI-filled fields before publishing."],
        )

    return await ai_request_guard.execute(
        account_id=str(_account.id),
        provider=ai_provider.name,
        fingerprint=fingerprint,
        operation=generate,
    )


