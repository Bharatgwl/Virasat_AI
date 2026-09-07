from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, model_validator


PaymentMode = Literal["upi", "cod", "unpaid"]
OrderStatus = Literal["placed", "confirmed", "packed", "shipped", "delivered", "cancelled"]


class CartItemCreate(BaseModel):
    product_id: UUID
    quantity: int = Field(ge=1, le=1000)


class CartItem(CartItemCreate):
    product_title: str | None = None
    unit_price_inr: int | None = None
    line_total_inr: int | None = None


class Cart(BaseModel):
    buyer_id: UUID
    items: list[CartItem] = []
    total_inr: int = 0


class OrderCreate(BaseModel):
    buyer_id: UUID
    items: list[CartItemCreate] = Field(min_length=1, max_length=100)
    delivery_address: str = Field(min_length=5, max_length=500)
    payment_mode: Literal["upi", "cod"] = "cod"
    idempotency_key: UUID


class OrderItem(BaseModel):
    id: UUID | None = None
    order_id: UUID | None = None
    product_id: UUID
    artisan_id: UUID | None = None
    quantity: int = Field(ge=1)
    unit_price_inr: int = Field(gt=0)
    line_total_inr: int = Field(gt=0)
    product_title: str | None = None


class Order(BaseModel):
    id: UUID
    buyer_id: UUID | None = None
    buyer_name: str
    buyer_contact: str
    delivery_address: str
    items: list[OrderItem] = []
    total_inr: int = Field(ge=0)
    status: OrderStatus = "placed"
    payment_mode: PaymentMode = "unpaid"
    created_at: datetime | None = None
    updated_at: datetime | None = None

    @model_validator(mode="after")
    def validate_total(self) -> "Order":
        item_total = sum(item.line_total_inr for item in self.items)
        if self.items and item_total != self.total_inr:
            raise ValueError("Order total must match item totals.")
        return self


class OrderStatusUpdate(BaseModel):
    status: OrderStatus
