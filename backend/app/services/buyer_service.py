from uuid import UUID

from app.core.errors import AppError
from app.schemas.buyer import Buyer, BuyerCreate, BuyerUpdate
from app.services.supabase_client import get_supabase


def create_buyer(request: BuyerCreate) -> Buyer:
    response = get_supabase().table("buyers").insert(request.model_dump(mode="json")).execute()
    if not response.data:
        raise AppError("BUYER_CREATE_FAILED", "The buyer profile could not be created.", 500, True)
    return Buyer.model_validate(response.data[0])


def get_buyer(buyer_id: UUID) -> Buyer:
    response = get_supabase().table("buyers").select("*").eq("id", str(buyer_id)).limit(1).execute()
    if not response.data:
        raise AppError("BUYER_NOT_FOUND", "The buyer profile was not found.", 404)
    return Buyer.model_validate(response.data[0])


def get_buyer_by_account(account_id: UUID) -> Buyer:
    response = get_supabase().table("buyers").select("*").eq("account_id", str(account_id)).limit(1).execute()
    if not response.data:
        raise AppError("BUYER_NOT_FOUND", "The buyer profile was not found.", 404)
    return Buyer.model_validate(response.data[0])


def update_buyer(buyer_id: UUID, request: BuyerUpdate) -> Buyer:
    payload = request.model_dump(mode="json", exclude_none=True)
    if not payload:
        raise AppError("NO_CHANGES", "Provide at least one field to update.")
    response = get_supabase().table("buyers").update(payload).eq("id", str(buyer_id)).execute()
    if not response.data:
        raise AppError("BUYER_NOT_FOUND", "The buyer profile was not found.", 404)
    return Buyer.model_validate(response.data[0])
