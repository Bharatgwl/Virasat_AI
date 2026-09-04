from fastapi import APIRouter

from app.core.config import get_settings
from app.services.supabase_client import get_supabase


router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "viraasat-ai-api"}


@router.get("/health/supabase")
def supabase_health() -> dict[str, bool | str]:
    settings = get_settings()
    configured = bool(settings.supabase_url and settings.supabase_backend_key)
    if not configured:
        return {
            "status": "setup_required",
            "configured": False,
            "connected": False,
        }

    try:
        get_supabase().table("products").select("id").limit(1).execute()
    except Exception:
        return {
            "status": "connection_failed",
            "configured": True,
            "connected": False,
        }

    return {"status": "ready", "configured": True, "connected": True}
