from functools import lru_cache

from supabase import Client, create_client

from app.core.config import get_settings
from app.core.errors import AppError


@lru_cache
def get_supabase() -> Client:
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_backend_key:
        raise AppError(
            "BACKEND_NOT_CONFIGURED",
            "Supabase is not configured on the Python backend.",
            status_code=503,
            retryable=True,
        )
    return create_client(settings.supabase_url, settings.supabase_backend_key)
