from uuid import UUID

from app.core.errors import AppError
from app.schemas.artisan import Artisan, ArtisanCreate, ArtisanUpdate
from app.services.supabase_client import get_supabase


def create_artisan(request: ArtisanCreate) -> Artisan:
    response = get_supabase().table("artisans").insert(request.model_dump(mode="json")).execute()
    if not response.data:
        raise AppError("ARTISAN_CREATE_FAILED", "The artisan profile could not be created.", 500, True)
    return Artisan.model_validate(response.data[0])


def get_artisan(artisan_id: UUID) -> Artisan:
    response = get_supabase().table("artisans").select("*").eq("id", str(artisan_id)).limit(1).execute()
    if not response.data:
        raise AppError("ARTISAN_NOT_FOUND", "The artisan profile was not found.", 404)
    return Artisan.model_validate(response.data[0])


def get_artisan_by_account(account_id: UUID) -> Artisan:
    response = get_supabase().table("artisans").select("*").eq("account_id", str(account_id)).limit(1).execute()
    if not response.data:
        raise AppError("ARTISAN_NOT_FOUND", "The artisan profile was not found.", 404)
    return Artisan.model_validate(response.data[0])


def update_artisan(artisan_id: UUID, request: ArtisanUpdate) -> Artisan:
    payload = request.model_dump(mode="json", exclude_none=True)
    if not payload:
        raise AppError("NO_CHANGES", "Provide at least one field to update.")
    response = get_supabase().table("artisans").update(payload).eq("id", str(artisan_id)).execute()
    if not response.data:
        raise AppError("ARTISAN_NOT_FOUND", "The artisan profile was not found.", 404)
    return Artisan.model_validate(response.data[0])
