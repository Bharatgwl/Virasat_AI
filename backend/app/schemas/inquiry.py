from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class InquiryCreate(BaseModel):
    product_id: UUID
    buyer_name: str = Field(min_length=2, max_length=120)
    buyer_contact: str = Field(min_length=5, max_length=180)
    quantity: int = Field(gt=0, le=1_000_000)
    message: str = Field(default="", max_length=2000)


class Inquiry(InquiryCreate):
    id: UUID
    status: Literal["new", "contacted", "closed"] = "new"
    created_at: datetime | None = None


class InquiryUpdate(BaseModel):
    status: Literal["new", "contacted", "closed"]


class InquiryDashboardItem(Inquiry):
    product_title: str = "Product"
