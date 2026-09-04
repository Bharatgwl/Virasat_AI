from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


LanguageCode = Literal["en", "hi", "gu", "mr", "ta", "te", "kn", "bn", "pa"]


class BuyerCreate(BaseModel):
    account_id: UUID | None = None
    buyer_name: str = Field(min_length=2, max_length=120)
    phone: str = Field(min_length=10, max_length=10)
    email: str | None = Field(default=None, max_length=180)
    delivery_address: str = Field(min_length=5, max_length=500)
    preferred_language: LanguageCode = "en"

    @field_validator("phone")
    @classmethod
    def validate_indian_mobile(cls, value: str) -> str:
        if not value.isdigit() or value[0] not in "6789":
            raise ValueError("Enter a valid 10 digit Indian mobile number.")
        return value

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str | None) -> str | None:
        if not value:
            return None
        if "@" not in value or "." not in value.rsplit("@", maxsplit=1)[-1]:
            raise ValueError("Enter a valid email.")
        return value.lower()


class Buyer(BuyerCreate):
    id: UUID
    created_at: datetime | None = None
    updated_at: datetime | None = None


class BuyerUpdate(BaseModel):
    buyer_name: str | None = Field(default=None, min_length=2, max_length=120)
    phone: str | None = Field(default=None, min_length=10, max_length=10)
    email: str | None = Field(default=None, max_length=180)
    delivery_address: str | None = Field(default=None, min_length=5, max_length=500)
    preferred_language: LanguageCode | None = None
