from uuid import UUID

from app.core.errors import AppError
from app.schemas.order import Cart, CartItem, CartItemCreate, Order, OrderCreate, OrderItem
from app.services.buyer_service import get_buyer
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
    buyer = get_buyer(request.buyer_id)
    order_items: list[OrderItem] = []
    total = 0
    for item in request.items:
        product = _get_published_product(item.product_id)
        _ensure_stock(product, item.quantity)
        unit_price = int(product["price_inr"])
        line_total = unit_price * item.quantity
        total += line_total
        order_items.append(
            OrderItem(
                product_id=item.product_id,
                artisan_id=product.get("artisan_id"),
                quantity=item.quantity,
                unit_price_inr=unit_price,
                line_total_inr=line_total,
                product_title=product.get("title"),
            )
        )

    order_payload = {
        "buyer_id": str(request.buyer_id),
        "buyer_name": buyer.buyer_name,
        "buyer_contact": buyer.phone,
        "delivery_address": request.delivery_address,
        "total_inr": total,
        "status": "placed",
        "payment_mode": request.payment_mode,
    }
    order_response = get_supabase().table("orders").insert(order_payload).execute()
    if not order_response.data:
        raise AppError("ORDER_CREATE_FAILED", "The order could not be placed.", 500, True)
    order = order_response.data[0]

    item_payloads = [
        {
            "order_id": order["id"],
            "product_id": str(item.product_id),
            "artisan_id": str(item.artisan_id) if item.artisan_id else None,
            "quantity": item.quantity,
            "unit_price_inr": item.unit_price_inr,
            "line_total_inr": item.line_total_inr,
        }
        for item in order_items
    ]
    inserted_items = get_supabase().table("order_items").insert(item_payloads).execute()
    saved_items = inserted_items.data or item_payloads
    get_supabase().table("cart_items").delete().eq("buyer_id", str(request.buyer_id)).execute()
    return Order.model_validate({**order, "items": saved_items})


def list_orders(buyer_id: UUID | None = None) -> list[Order]:
    query = get_supabase().table("orders").select("*, order_items(*)").order("created_at", desc=True)
    if buyer_id:
        query = query.eq("buyer_id", str(buyer_id))
    response = query.execute()
    orders = []
    for row in response.data or []:
        orders.append(Order.model_validate({**row, "items": row.get("order_items") or []}))
    return orders
