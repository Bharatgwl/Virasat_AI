from fastapi import APIRouter, Depends

from app.api.dependencies import current_artisan
from app.schemas.artisan import Artisan
from app.services.supabase_client import get_supabase


router = APIRouter(prefix="/seller/dashboard", tags=["seller-dashboard"])


@router.get("/summary", response_model=dict)
def summary(artisan: Artisan = Depends(current_artisan)) -> dict:
    products = (
        get_supabase().table("products").select("*").eq("artisan_id", str(artisan.id))
        .order("created_at", desc=True).execute().data or []
    )
    product_ids = [str(product["id"]) for product in products]
    inquiries = []
    if product_ids:
        inquiries = (
            get_supabase().table("inquiries").select("*, products(title)")
            .in_("product_id", product_ids).order("created_at", desc=True).execute().data or []
        )
    return {
        "metrics": {
            "total_earnings": 0,
            "live_products": len([product for product in products if product.get("status") == "published"]),
            "inquiries_count": len(inquiries),
            "active_orders": 0,
        },
        "recent_products": products[:3],
        "recent_inquiries": inquiries[:3],
    }
