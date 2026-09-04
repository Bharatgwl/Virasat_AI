from uuid import UUID

from fastapi import APIRouter, Depends

from app.api.dependencies import current_buyer
from app.schemas.buyer import Buyer
from app.schemas.order import Order, OrderCreate
from app.services.order_service import list_orders, place_order


router = APIRouter(prefix="/buyer/orders", tags=["buyer-orders"])


@router.post("", response_model=Order, status_code=201)
def create(request: OrderCreate, buyer: Buyer = Depends(current_buyer)) -> Order:
    return place_order(request.model_copy(update={"buyer_id": buyer.id}))


@router.get("", response_model=list[Order])
def list_buyer_orders(buyer: Buyer = Depends(current_buyer)) -> list[Order]:
    return list_orders(buyer.id)
