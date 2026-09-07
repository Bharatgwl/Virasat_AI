from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, HttpUrl, field_validator, model_validator


ProductStatus = Literal["draft", "generated", "ready", "published"]
AiProvider = Literal["legacy", "openai", "ollama"]


class ProductCreate(BaseModel):
    artisan_id: UUID | None = None
    artisan_name: str = Field(min_length=2, max_length=120)
    title: str = Field(min_length=3, max_length=180)
    description: str = Field(min_length=10, max_length=3000)
    local_description: str = Field(default="", max_length=3000)
    category: str = Field(min_length=2, max_length=100)
    materials: list[str] = Field(min_length=1, max_length=20)
    price_inr: int = Field(gt=0, le=10_000_000)
    image_url: HttpUrl
    audio_url: str | None = Field(default=None, max_length=1000)
    source_language_code: str = Field(default="en", max_length=20)
    ai_provider: AiProvider = "ollama"
    craft_title: str | None = Field(default=None, min_length=3, max_length=180)
    craft_story: str | None = Field(default=None, min_length=10, max_length=3000)
    primary_material: str | None = Field(default=None, min_length=2, max_length=120)
    secondary_materials: list[str] = Field(default_factory=list, max_length=20)
    craft_technique: str | None = Field(default=None, min_length=2, max_length=120)
    hsn_tax_code: str | None = Field(default=None, min_length=4, max_length=8)
    market_price_min: int | None = Field(default=None, gt=0, le=10_000_000)
    market_price_max: int | None = Field(default=None, gt=0, le=10_000_000)
    available_stock: int = Field(default=1, ge=0, le=1_000_000)
    length_cm: float | None = Field(default=None, gt=0, le=100_000)
    width_cm: float | None = Field(default=None, gt=0, le=100_000)
    height_cm: float | None = Field(default=None, gt=0, le=100_000)
    weight_grams: float | None = Field(default=None, gt=0, le=10_000_000)
    color: str | None = Field(default=None, max_length=80)
    care_instructions: str | None = Field(default=None, max_length=1000)
    production_time_days: int | None = Field(default=None, ge=0, le=3650)
    artisan_location: str | None = Field(default=None, max_length=180)
    tags: list[str] = Field(default_factory=list, max_length=20)
    transcript: str | None = Field(default=None, max_length=5000)
    translated_input: str | None = Field(default=None, max_length=5000)
    ai_confidence: float | None = Field(default=None, ge=0, le=1)
    ai_warnings: list[str] = Field(default_factory=list, max_length=20)

    @field_validator("materials", "secondary_materials", "tags", "ai_warnings")
    @classmethod
    def normalize_text_list(cls, value: list[str]) -> list[str]:
        cleaned = [item.strip() for item in value if item and item.strip()]
        return list(dict.fromkeys(cleaned))

    @field_validator("hsn_tax_code")
    @classmethod
    def validate_hsn(cls, value: str | None) -> str | None:
        if not value:
            return None
        if not value.isdigit():
            raise ValueError("HSN tax code must contain only digits.")
        return value

    @model_validator(mode="after")
    def validate_market_price_range(self) -> "ProductCreate":
        if self.market_price_min and self.market_price_max and self.market_price_min > self.market_price_max:
            raise ValueError("Market minimum price cannot be greater than maximum price.")
        return self


class Product(ProductCreate):
    id: UUID
    status: ProductStatus
    created_at: datetime | None = None
    updated_at: datetime | None = None
    published_at: datetime | None = None


class ProductUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=180)
    description: str | None = Field(default=None, min_length=10, max_length=3000)
    local_description: str | None = Field(default=None, max_length=3000)
    category: str | None = Field(default=None, min_length=2, max_length=100)
    materials: list[str] | None = Field(default=None, min_length=1, max_length=20)
    price_inr: int | None = Field(default=None, gt=0, le=10_000_000)
    status: ProductStatus | None = None
    craft_title: str | None = Field(default=None, min_length=3, max_length=180)
    craft_story: str | None = Field(default=None, min_length=10, max_length=3000)
    primary_material: str | None = Field(default=None, min_length=2, max_length=120)
    secondary_materials: list[str] | None = Field(default=None, max_length=20)
    craft_technique: str | None = Field(default=None, min_length=2, max_length=120)
    hsn_tax_code: str | None = Field(default=None, min_length=4, max_length=8)
    market_price_min: int | None = Field(default=None, gt=0, le=10_000_000)
    market_price_max: int | None = Field(default=None, gt=0, le=10_000_000)
    available_stock: int | None = Field(default=None, ge=0, le=1_000_000)
    length_cm: float | None = Field(default=None, gt=0, le=100_000)
    width_cm: float | None = Field(default=None, gt=0, le=100_000)
    height_cm: float | None = Field(default=None, gt=0, le=100_000)
    weight_grams: float | None = Field(default=None, gt=0, le=10_000_000)
    color: str | None = Field(default=None, max_length=80)
    care_instructions: str | None = Field(default=None, max_length=1000)
    production_time_days: int | None = Field(default=None, ge=0, le=3650)
    artisan_location: str | None = Field(default=None, max_length=180)
    tags: list[str] | None = Field(default=None, max_length=20)

    @field_validator("hsn_tax_code")
    @classmethod
    def validate_hsn(cls, value: str | None) -> str | None:
        if not value:
            return None
        if not value.isdigit():
            raise ValueError("HSN tax code must contain only digits.")
        return value

    @field_validator("status")
    @classmethod
    def prevent_direct_publish(cls, value: ProductStatus | None) -> ProductStatus | None:
        if value == "published":
            raise ValueError("Use the publish endpoint to publish a product.")
        return value


def product_ready_for_publish(product: dict) -> bool:
    required_fields = [
        "title",
        "description",
        "category",
        "materials",
        "price_inr",
        "image_url",
        "artisan_name",
        "available_stock",
    ]
    return all(product.get(field) not in (None, "", []) for field in required_fields) and int(product.get("available_stock", 0)) > 0
