from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.api.dependencies import current_artisan, current_buyer
from app.core.errors import AppError
from app.schemas.artisan import Artisan
from app.schemas.buyer import Buyer
from app.schemas.product import Product, ProductCreate, ProductUpdate, product_ready_for_publish
from app.services.supabase_client import get_supabase


seller_router = APIRouter(prefix="/seller/products", tags=["seller-products"])
buyer_router = APIRouter(prefix="/buyer/products", tags=["buyer-products"])


def _owned_product(product_id: UUID, artisan_id: UUID, editable: bool = False) -> dict:
    query = get_supabase().table("products").select("*").eq("id", str(product_id)).eq("artisan_id", str(artisan_id))
    if editable:
        query = query.in_("status", ["draft", "generated", "ready"])
    response = query.limit(1).execute()
    if not response.data:
        raise AppError("SELLER_PRODUCT_NOT_FOUND", "This product does not belong to your seller account.", 404)
    return response.data[0]


@seller_router.post("", response_model=Product, status_code=201)
def create_product(request: ProductCreate, artisan: Artisan = Depends(current_artisan)) -> dict:
    payload = request.model_dump(mode="json") | {
        "artisan_id": str(artisan.id),
        "artisan_name": artisan.artisan_name,
        "status": "draft",
    }
    response = get_supabase().table("products").insert(payload).execute()
    if not response.data:
        raise AppError("PRODUCT_CREATE_FAILED", "The product could not be saved.", 500, True)
    return response.data[0]


@seller_router.get("", response_model=list[Product])
def list_seller_products(status: str | None = Query(default=None), artisan: Artisan = Depends(current_artisan)) -> list[dict]:
    query = get_supabase().table("products").select("*").eq("artisan_id", str(artisan.id))
    if status:
        if status not in {"draft", "generated", "ready", "published"}:
            raise AppError("INVALID_PRODUCT_STATUS", "Unknown product status.")
        query = query.eq("status", status)
    return query.order("created_at", desc=True).execute().data or []


@seller_router.get("/{product_id}", response_model=Product)
def get_seller_product(product_id: UUID, artisan: Artisan = Depends(current_artisan)) -> dict:
    return _owned_product(product_id, artisan.id)


@seller_router.patch("/{product_id}", response_model=Product)
def update_product(product_id: UUID, request: ProductUpdate, artisan: Artisan = Depends(current_artisan)) -> dict:
    _owned_product(product_id, artisan.id, editable=True)
    payload = request.model_dump(mode="json", exclude_none=True)
    if not payload:
        raise AppError("NO_CHANGES", "Provide at least one field to update.")
    response = (
        get_supabase().table("products").update(payload)
        .eq("id", str(product_id)).eq("artisan_id", str(artisan.id))
        .in_("status", ["draft", "generated", "ready"]).execute()
    )
    if not response.data:
        raise AppError("EDITABLE_PRODUCT_NOT_FOUND", "The editable product was not found.", 404)
    return response.data[0]


@seller_router.post("/{product_id}/publish", response_model=Product)
def publish_product(product_id: UUID, artisan: Artisan = Depends(current_artisan)) -> dict:
    product = _owned_product(product_id, artisan.id)
    if product.get("status") != "ready":
        raise AppError("PRODUCT_NOT_READY", "Product must be marked ready before publishing.")
    if not product_ready_for_publish(product):
        raise AppError("PRODUCT_INCOMPLETE", "Complete title, description, category, price, image, artisan and stock before publishing.")
    response = (
        get_supabase().table("products")
        .update({"status": "published", "published_at": datetime.now(UTC).isoformat()})
        .eq("id", str(product_id)).eq("artisan_id", str(artisan.id)).eq("status", "ready").execute()
    )
    if not response.data:
        raise AppError("PRODUCT_PUBLISH_FAILED", "The product could not be published.", 500, True)
    return response.data[0]


@buyer_router.get("", response_model=list[Product])
def list_marketplace_products(category: str | None = Query(default=None, max_length=100), _buyer: Buyer = Depends(current_buyer)) -> list[dict]:
    query = get_supabase().table("products").select("*").eq("status", "published")
    if category:
        query = query.eq("category", category)
    return query.order("created_at", desc=True).execute().data or []


@buyer_router.get("/{product_id}", response_model=Product)
def get_marketplace_product(product_id: UUID, _buyer: Buyer = Depends(current_buyer)) -> dict:
    response = (
        get_supabase().table("products").select("*").eq("id", str(product_id))
        .eq("status", "published").limit(1).execute()
    )
    if not response.data:
        raise AppError("PRODUCT_NOT_FOUND", "The published product was not found.", 404)
    return response.data[0]
