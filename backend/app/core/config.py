from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Viraasat AI API"
    environment: str = "development"
    supabase_url: str | None = None
    supabase_anon_key: str | None = None
    supabase_secret_key: str | None = None
    supabase_service_role_key: str | None = None
    app_session_secret: str | None = None
    frontend_origins: str = "http://localhost:3000"
    frontend_origin_regex: str | None = None
    auth_requests_per_minute: int = Field(default=20, ge=5, le=120)
    ai_provider: str = "ollama"
    ai_timeout_seconds: float = Field(default=45.0, ge=5, le=120)
    ai_request_deadline_seconds: float = Field(default=70.0, ge=10, le=180)
    ai_requests_per_minute: int = Field(default=5, ge=1, le=60)
    ai_requests_per_hour: int = Field(default=30, ge=1, le=1000)
    ai_max_account_concurrency: int = Field(default=1, ge=1, le=4)
    ai_max_global_concurrency: int = Field(default=4, ge=1, le=64)
    ai_cache_ttl_seconds: int = Field(default=300, ge=0, le=3600)
    ai_cache_max_entries: int = Field(default=128, ge=1, le=5000)
    ai_circuit_failure_threshold: int = Field(default=3, ge=1, le=20)
    ai_circuit_cooldown_seconds: int = Field(default=60, ge=5, le=600)
    ai_max_response_bytes: int = Field(default=524288, ge=1024, le=5_242_880)
    ai_max_request_bytes: int = Field(default=4_250_000, ge=1_048_576, le=52_428_800)
    ai_max_image_bytes: int = Field(default=3_000_000, ge=262_144, le=4_000_000)
    ai_max_audio_bytes: int = Field(default=750_000, ge=131_072, le=4_000_000)
    upload_max_image_bytes: int = Field(default=4_000_000, ge=262_144, le=4_250_000)
    upload_max_audio_bytes: int = Field(default=4_000_000, ge=131_072, le=4_250_000)
    openai_api_key: str | None = None
    openai_model: str = "gpt-4.1-mini"
    ollama_api_key: str | None = None
    ollama_model: str = "gemma4:31b"
    ollama_base_url: str = "https://ollama.com/api"
    sarvam_api_key: str | None = None
    sarvam_base_url: str = "https://api.sarvam.ai"
    sarvam_stt_model: str = "saaras:v3"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.frontend_origins.split(",") if origin.strip()]

    @property
    def supabase_backend_key(self) -> str | None:
        return self.supabase_secret_key or self.supabase_service_role_key

    @property
    def session_signing_key(self) -> str:
        key = self.app_session_secret or self.supabase_backend_key
        if not key:
            raise RuntimeError("APP_SESSION_SECRET or a Supabase backend key is required.")
        return key

    @property
    def ollama_is_local(self) -> bool:
        return self.ollama_base_url.startswith(("http://localhost", "http://127.0.0.1"))


@lru_cache
def get_settings() -> Settings:
    return Settings()
