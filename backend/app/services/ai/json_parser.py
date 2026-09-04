import json

from pydantic import ValidationError

from app.core.errors import AppError
from app.schemas.catalog import CatalogModelOutput


def parse_catalog_json(raw: str, provider_name: str) -> CatalogModelOutput:
    text = raw.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        text = "\n".join(lines[1:-1]).strip()
    start = text.find("{")
    end = text.rfind("}")
    if start >= 0 and end > start:
        text = text[start : end + 1]

    try:
        return CatalogModelOutput.model_validate(json.loads(text))
    except (json.JSONDecodeError, ValidationError) as exc:
        raise AppError(
            "AI_INVALID_RESPONSE",
            f"{provider_name} returned an invalid catalogue. Please try again.",
            502,
            True,
        ) from exc
