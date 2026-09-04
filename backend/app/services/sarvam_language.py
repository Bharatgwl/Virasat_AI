from dataclasses import dataclass

import httpx

from app.core.config import Settings, get_settings
from app.core.errors import AppError


LANGUAGE_CODE_MAP = {
    "en": "en-IN",
    "hi": "hi-IN",
    "gu": "gu-IN",
    "mr": "mr-IN",
    "ta": "ta-IN",
    "te": "te-IN",
    "kn": "kn-IN",
    "bn": "bn-IN",
    "pa": "pa-IN",
}


def normalize_language_code(language_code: str) -> str:
    cleaned = (language_code or "unknown").strip()
    if not cleaned or cleaned.lower() == "unknown":
        return "unknown"
    return LANGUAGE_CODE_MAP.get(cleaned.lower(), cleaned)


@dataclass(frozen=True)
class LanguageContext:
    original_text: str
    english_text: str
    language_code: str
    voice_transcript: str


class SarvamLanguageService:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()

    def _require_key(self) -> str:
        if not self.settings.sarvam_api_key:
            raise AppError(
                "SARVAM_NOT_CONFIGURED",
                "Sarvam is required for voice and regional-language processing.",
                503,
            )
        return self.settings.sarvam_api_key

    async def transcribe(
        self,
        audio_bytes: bytes,
        filename: str,
        mime_type: str,
        language_code: str,
    ) -> tuple[str, str]:
        key = self._require_key()
        language_code = normalize_language_code(language_code)
        data = {
            "model": self.settings.sarvam_stt_model,
            "mode": "transcribe",
            "language_code": language_code,
        }
        try:
            async with httpx.AsyncClient(timeout=self.settings.ai_timeout_seconds) as client:
                response = await client.post(
                    f"{self.settings.sarvam_base_url.rstrip('/')}/speech-to-text",
                    headers={"api-subscription-key": key},
                    files={"file": (filename, audio_bytes, mime_type)},
                    data=data,
                )
                if len(response.content) > self.settings.ai_max_response_bytes:
                    raise AppError("SARVAM_RESPONSE_TOO_LARGE", "Sarvam returned an unexpectedly large response.", 502, True)
                if response.status_code == 429:
                    raise AppError("SARVAM_RATE_LIMITED", "Sarvam is temporarily rate limited.", 503, True, 30)
                response.raise_for_status()
        except AppError:
            raise
        except httpx.HTTPError as exc:
            raise AppError("SARVAM_STT_FAILED", "Sarvam could not transcribe the recording.", 502, True) from exc

        body = response.json()
        transcript = str(body.get("transcript") or "").strip()
        detected = str(body.get("language_code") or language_code or "unknown")
        if not transcript:
            raise AppError("EMPTY_TRANSCRIPT", "No speech was detected in the recording.")
        return transcript, detected

    async def translate(
        self,
        text: str,
        source_language_code: str,
        target_language_code: str,
    ) -> tuple[str, str]:
        source_language_code = normalize_language_code(source_language_code)
        target_language_code = normalize_language_code(target_language_code)
        if not text.strip() or source_language_code == target_language_code:
            return text.strip(), source_language_code
        key = self._require_key()
        try:
            async with httpx.AsyncClient(timeout=self.settings.ai_timeout_seconds) as client:
                response = await client.post(
                    f"{self.settings.sarvam_base_url.rstrip('/')}/translate",
                    headers={"api-subscription-key": key, "Content-Type": "application/json"},
                    json={
                        "input": text,
                        "source_language_code": "auto" if source_language_code == "unknown" else source_language_code,
                        "target_language_code": target_language_code,
                        "model": "sarvam-translate:v1",
                    },
                )
                if len(response.content) > self.settings.ai_max_response_bytes:
                    raise AppError("SARVAM_RESPONSE_TOO_LARGE", "Sarvam returned an unexpectedly large response.", 502, True)
                if response.status_code == 429:
                    raise AppError("SARVAM_RATE_LIMITED", "Sarvam is temporarily rate limited.", 503, True, 30)
                response.raise_for_status()
        except AppError:
            raise
        except httpx.HTTPError as exc:
            raise AppError("SARVAM_TRANSLATION_FAILED", "Sarvam could not translate the text.", 502, True) from exc

        body = response.json()
        translated = str(body.get("translated_text") or "").strip()
        detected = str(body.get("source_language_code") or source_language_code)
        if not translated:
            raise AppError("EMPTY_TRANSLATION", "Sarvam returned an empty translation.", 502, True)
        return translated, detected

    async def prepare_input(
        self,
        typed_description: str,
        language_code: str,
        audio_bytes: bytes | None = None,
        audio_filename: str = "recording.webm",
        audio_mime_type: str = "audio/webm",
    ) -> LanguageContext:
        language_code = normalize_language_code(language_code)
        voice_transcript = ""
        detected_language = language_code
        if audio_bytes:
            voice_transcript, detected_language = await self.transcribe(
                audio_bytes,
                audio_filename,
                audio_mime_type,
                language_code,
            )

        original_text = "\n".join(
            part for part in [typed_description.strip(), voice_transcript.strip()] if part
        )
        if not original_text:
            raise AppError("DESCRIPTION_REQUIRED", "Provide a voice or typed product description.")

        if detected_language == "en-IN":
            english_text = original_text
        elif not self.settings.sarvam_api_key and language_code == "unknown" and not audio_bytes:
            english_text = original_text
            detected_language = "en-IN"
        else:
            english_text, translated_source = await self.translate(
                original_text,
                detected_language,
                "en-IN",
            )
            if detected_language == "unknown":
                detected_language = translated_source

        return LanguageContext(
            original_text=original_text,
            english_text=english_text,
            language_code=detected_language,
            voice_transcript=voice_transcript,
        )

    async def localize_description(self, english_description: str, language_code: str) -> str:
        if language_code in {"unknown", "en-IN"}:
            return english_description
        translated, _ = await self.translate(english_description, "en-IN", language_code)
        return translated
