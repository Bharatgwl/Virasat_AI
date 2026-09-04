from uuid import UUID

from fastapi import APIRouter, Depends

from app.api.dependencies import current_artisan, current_buyer
from app.core.errors import AppError
from app.schemas.artisan import Artisan
from app.schemas.buyer import Buyer
from app.schemas.inquiry import Inquiry, InquiryCreate, InquiryDashboardItem, InquiryUpdate
from app.services.supabase_client import get_supabase


seller_router = APIRouter(prefix="/seller/inquiries", tags=["seller-inquiries"])
buyer_router = APIRouter(prefix="/buyer/inquiries", tags=["buyer-inquiries"])


def _seller_product_ids(artisan_id: UUID) -> list[str]:
    rows = get_supabase().table("products").select("id").eq("artisan_id", str(artisan_id)).execute().data or []
    return [str(row["id"]) for row in rows]


@seller_router.get("", response_model=list[InquiryDashboardItem])
def list_inquiries(artisan: Artisan = Depends(current_artisan)) -> list[dict]:
    product_ids = _seller_product_ids(artisan.id)
    if not product_ids:
        return []
    response = (
        get_supabase().table("inquiries").select("*, products(title)")
        .in_("product_id", product_ids).order("created_at", desc=True).execute()
    )
    return [{**item, "product_title": (item.get("products") or {}).get("title", "Product")} for item in (response.data or [])]


@seller_router.patch("/{inquiry_id}", response_model=Inquiry)
def update_inquiry(inquiry_id: UUID, request: InquiryUpdate, artisan: Artisan = Depends(current_artisan)) -> dict:
    product_ids = _seller_product_ids(artisan.id)
    if not product_ids:
        raise AppError("INQUIRY_NOT_FOUND", "The inquiry was not found for your seller account.", 404)
    owned = (
        get_supabase().table("inquiries").select("id, product_id")
        .eq("id", str(inquiry_id)).in_("product_id", product_ids).limit(1).execute()
    )
    if not owned.data:
        raise AppError("INQUIRY_NOT_FOUND", "The inquiry was not found for your seller account.", 404)
    response = get_supabase().table("inquiries").update(request.model_dump(mode="json")).eq("id", str(inquiry_id)).execute()
    return response.data[0]


@buyer_router.post("", response_model=Inquiry, status_code=201)
def create_inquiry(request: InquiryCreate, buyer: Buyer = Depends(current_buyer)) -> dict:
    product = (
        get_supabase().table("products").select("id").eq("id", str(request.product_id))
        .eq("status", "published").limit(1).execute()
    )
    if not product.data:
        raise AppError("PRODUCT_NOT_AVAILABLE", "The product is not available for inquiries.", 404)
    payload = request.model_dump(mode="json") | {
        "buyer_id": str(buyer.id),
        "buyer_name": buyer.buyer_name,
        "buyer_contact": buyer.email or buyer.phone,
    }
    response = get_supabase().table("inquiries").insert(payload).execute()
    if not response.data:
        raise AppError("INQUIRY_CREATE_FAILED", "The inquiry could not be submitted.", 500, True)
    return response.data[0]
