from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.schemas.buyer import LanguageCode


class ArtisanCreate(BaseModel):
    account_id: UUID | None = None
    artisan_name: str = Field(min_length=2, max_length=120)
    phone: str = Field(min_length=10, max_length=10)
    location: str = Field(min_length=2, max_length=180)
    craft_type: str = Field(min_length=2, max_length=120)
    preferred_language: LanguageCode = "hi"
    upi_id: str | None = Field(default=None, max_length=120)

    @field_validator("phone")
    @classmethod
    def validate_indian_mobile(cls, value: str) -> str:
        if not value.isdigit() or value[0] not in "6789":
            raise ValueError("Enter a valid 10 digit Indian mobile number.")
        return value

    @field_validator("upi_id")
    @classmethod
    def validate_upi(cls, value: str | None) -> str | None:
        if not value:
            return value
        if "@" not in value or len(value.split("@", maxsplit=1)[0]) < 2:
            raise ValueError("Enter a valid UPI ID.")
        return value


class Artisan(ArtisanCreate):
    id: UUID
    ondc_status: Literal["not_connected", "connected"] = "not_connected"
    created_at: datetime | None = None
    updated_at: datetime | None = None


class ArtisanUpdate(BaseModel):
    artisan_name: str | None = Field(default=None, min_length=2, max_length=120)
    phone: str | None = Field(default=None, min_length=10, max_length=10)
    location: str | None = Field(default=None, min_length=2, max_length=180)
    craft_type: str | None = Field(default=None, min_length=2, max_length=120)
    preferred_language: LanguageCode | None = None
    upi_id: str | None = Field(default=None, max_length=120)
