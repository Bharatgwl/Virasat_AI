from uuid import UUID

from app.core.errors import AppError
from app.schemas.order import Cart, CartItem, CartItemCreate, Order, OrderCreate
from app.services.supabase_client import get_supabase


def _get_published_product(product_id: UUID) -> dict:
    response = (
        get_supabase()
        .table("products")
        .select("*")
        .eq("id", str(product_id))
        .eq("status", "published")
        .limit(1)
        .execute()
    )
    if not response.data:
        raise AppError("PRODUCT_NOT_AVAILABLE", "The product is not available for purchase.", 404)
    return response.data[0]


def _ensure_stock(product: dict, quantity: int) -> None:
    stock = product.get("available_stock")
    if stock is not None and quantity > int(stock):
        raise AppError("INSUFFICIENT_STOCK", "Requested quantity is greater than available stock.")


def get_cart(buyer_id: UUID) -> Cart:
    response = (
        get_supabase()
        .table("cart_items")
        .select("*, products(title, price_inr)")
        .eq("buyer_id", str(buyer_id))
        .execute()
    )
    items = []
    for row in response.data or []:
        product = row.get("products") or {}
        unit_price = int(product.get("price_inr") or 0)
        quantity = int(row["quantity"])
        items.append(
            CartItem(
                product_id=row["product_id"],
                quantity=quantity,
                product_title=product.get("title"),
                unit_price_inr=unit_price,
                line_total_inr=unit_price * quantity,
            )
        )
    return Cart(buyer_id=buyer_id, items=items, total_inr=sum(item.line_total_inr or 0 for item in items))


def add_cart_item(buyer_id: UUID, request: CartItemCreate) -> Cart:
    product = _get_published_product(request.product_id)
    _ensure_stock(product, request.quantity)
    existing = (
        get_supabase()
        .table("cart_items")
        .select("*")
        .eq("buyer_id", str(buyer_id))
        .eq("product_id", str(request.product_id))
        .limit(1)
        .execute()
    )
    if existing.data:
        next_quantity = int(existing.data[0]["quantity"]) + request.quantity
        _ensure_stock(product, next_quantity)
        get_supabase().table("cart_items").update({"quantity": next_quantity}).eq("id", existing.data[0]["id"]).execute()
    else:
        get_supabase().table("cart_items").insert(
            {"buyer_id": str(buyer_id), "product_id": str(request.product_id), "quantity": request.quantity}
        ).execute()
    return get_cart(buyer_id)


def update_cart_item(buyer_id: UUID, product_id: UUID, request: CartItemCreate) -> Cart:
    product = _get_published_product(product_id)
    _ensure_stock(product, request.quantity)
    response = (
        get_supabase()
        .table("cart_items")
        .update({"quantity": request.quantity})
        .eq("buyer_id", str(buyer_id))
        .eq("product_id", str(product_id))
        .execute()
    )
    if not response.data:
        raise AppError("CART_ITEM_NOT_FOUND", "The cart item was not found.", 404)
    return get_cart(buyer_id)


def remove_cart_item(buyer_id: UUID, product_id: UUID) -> Cart:
    get_supabase().table("cart_items").delete().eq("buyer_id", str(buyer_id)).eq("product_id", str(product_id)).execute()
    return get_cart(buyer_id)


def place_order(request: OrderCreate) -> Order:
    try:
        response = get_supabase().rpc(
            "place_buyer_order",
            {
                "p_buyer_id": str(request.buyer_id),
                "p_items": [item.model_dump(mode="json") for item in request.items],
                "p_delivery_address": request.delivery_address,
                "p_payment_mode": request.payment_mode,
                "p_idempotency_key": str(request.idempotency_key),
            },
        ).execute()
    except Exception as exc:
        message = str(exc)
        known_errors = {
            "BUYER_NOT_FOUND": ("BUYER_NOT_FOUND", "The buyer profile was not found.", 404),
            "PRODUCT_NOT_AVAILABLE": ("PRODUCT_NOT_AVAILABLE", "A product is no longer available.", 409),
            "INSUFFICIENT_STOCK": ("INSUFFICIENT_STOCK", "A product does not have enough stock.", 409),
            "DUPLICATE_ORDER_PRODUCT": ("INVALID_ORDER", "An order cannot contain the same product twice.", 400),
            "INVALID_ORDER_QUANTITY": ("INVALID_ORDER", "An order quantity is invalid.", 400),
        }
        for marker, (code, public_message, status) in known_errors.items():
            if marker in message:
                raise AppError(code, public_message, status) from exc
        raise AppError("ORDER_CREATE_FAILED", "The order could not be placed safely.", 500, True) from exc

    if not response.data:
        raise AppError("ORDER_CREATE_FAILED", "The order could not be placed safely.", 500, True)
    payload = response.data[0] if isinstance(response.data, list) else response.data
    return Order.model_validate(payload)


def list_orders(buyer_id: UUID | None = None) -> list[Order]:
    query = get_supabase().table("orders").select("*, order_items(*)").order("created_at", desc=True)
    if buyer_id:
        query = query.eq("buyer_id", str(buyer_id))
    response = query.execute()
    orders = []
    for row in response.data or []:
        orders.append(Order.model_validate({**row, "items": row.get("order_items") or []}))
    return orders
