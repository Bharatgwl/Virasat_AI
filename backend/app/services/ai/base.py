from dataclasses import dataclass
from typing import Protocol

from app.schemas.catalog import CatalogModelOutput


@dataclass(frozen=True)
class CatalogGenerationInput:
    artisan_name: str
    english_description: str
    image_bytes: bytes
    image_mime_type: str


class CatalogProvider(Protocol):
    name: str

    async def generate(self, request: CatalogGenerationInput) -> CatalogModelOutput:
        ...
