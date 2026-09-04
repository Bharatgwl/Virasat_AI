from uuid import UUID

from fastapi import APIRouter, Depends

from app.api.dependencies import current_buyer
from app.schemas.buyer import Buyer
from app.schemas.order import Cart, CartItemCreate
from app.services.order_service import add_cart_item, get_cart, remove_cart_item, update_cart_item


router = APIRouter(prefix="/buyer/cart", tags=["buyer-cart"])


@router.get("", response_model=Cart)
def detail(buyer: Buyer = Depends(current_buyer)) -> Cart:
    return get_cart(buyer.id)


@router.post("/items", response_model=Cart, status_code=201)
def add_item(request: CartItemCreate, buyer: Buyer = Depends(current_buyer)) -> Cart:
    return add_cart_item(buyer.id, request)


@router.patch("/items/{product_id}", response_model=Cart)
def update_item(product_id: UUID, request: CartItemCreate, buyer: Buyer = Depends(current_buyer)) -> Cart:
    return update_cart_item(buyer.id, product_id, request)


@router.delete("/items/{product_id}", response_model=Cart)
def remove_item(product_id: UUID, buyer: Buyer = Depends(current_buyer)) -> Cart:
    return remove_cart_item(buyer.id, product_id)
