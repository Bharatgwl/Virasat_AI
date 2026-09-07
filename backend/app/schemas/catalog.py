from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


LanguageCode = Literal["en", "hi", "gu", "mr", "ta", "te", "kn", "bn", "pa", "unknown", "en-IN", "hi-IN", "gu-IN", "mr-IN", "ta-IN", "te-IN", "kn-IN", "bn-IN", "pa-IN"]
AiProvider = Literal["openai", "ollama"]


class CatalogRequest(BaseModel):
    artisan_name: str = Field(min_length=2, max_length=120)
    description: str = Field(default="", max_length=2000)
    has_audio: bool = False

    @model_validator(mode="after")
    def require_description_source(self) -> "CatalogRequest":
        if not self.description.strip() and not self.has_audio:
            raise ValueError("Provide a voice or typed product description.")
        return self


class CatalogDraft(BaseModel):
    title: str
    description: str
    local_description: str = ""
    category: str
    materials: list[str]
    suggested_price: int = Field(gt=0)
    ai_provider: str = "mock"
    source_language_code: str = "en-IN"
    source_transcript: str = ""


class CatalogModelOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=3, max_length=180)
    description: str = Field(min_length=10, max_length=3000)
    category: str = Field(min_length=2, max_length=100)
    materials: list[str] = Field(min_length=1, max_length=20)
    suggested_price: int = Field(gt=0, le=10_000_000)


class GeneratedListing(BaseModel):
    model_config = ConfigDict(extra="forbid")

    craft_title: str = Field(min_length=3, max_length=180)
    craft_story: str = Field(min_length=30, max_length=3000)
    local_description: str = Field(default="", max_length=3000)
    primary_material: str = Field(min_length=2, max_length=120)
    secondary_materials: list[str] = Field(default_factory=list, max_length=20)
    craft_technique: str = Field(min_length=2, max_length=120)
    category: str = Field(min_length=2, max_length=100)
    hsn_tax_code: str | None = Field(default=None, min_length=4, max_length=8)
    price_inr: int = Field(gt=0, le=10_000_000)
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
    source_language: LanguageCode = "unknown"
    transcript: str = Field(default="", max_length=5000)
    translated_input: str = Field(default="", max_length=5000)
    ai_provider: AiProvider = "ollama"
    confidence: float = Field(default=0.65, ge=0, le=1)
    warnings: list[str] = Field(default_factory=list, max_length=20)

    @field_validator("secondary_materials", "tags", "warnings")
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
    def validate_market_price_range(self) -> "GeneratedListing":
        if self.market_price_min and self.market_price_max and self.market_price_min > self.market_price_max:
            raise ValueError("Market minimum price cannot be greater than maximum price.")
        return self


class ProviderStatus(BaseModel):
    selected: str
    providers: dict[str, bool]
    sarvam_configured: bool
