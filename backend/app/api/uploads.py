from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, UploadFile

from app.api.dependencies import current_seller
from app.schemas.account import Account
from app.core.errors import AppError
from app.services.supabase_client import get_supabase
from app.core.config import get_settings


router = APIRouter(prefix="/seller/uploads", tags=["seller-uploads"])

IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
AUDIO_TYPES = {"audio/webm", "audio/ogg", "audio/mpeg", "audio/wav", "audio/x-wav"}
settings = get_settings()


async def store_file(file: UploadFile, kind: str) -> dict[str, str]:
    allowed_types = IMAGE_TYPES if kind == "image" else AUDIO_TYPES
    maximum_size = settings.upload_max_image_bytes if kind == "image" else settings.upload_max_audio_bytes
    bucket = "product-images" if kind == "image" else "product-audio"
    content_type = (file.content_type or "").split(";", maxsplit=1)[0].strip().lower()

    if content_type not in allowed_types:
        raise AppError("UNSUPPORTED_FILE", f"Unsupported {kind} file format.")

    content = await file.read(maximum_size + 1)
    if len(content) > maximum_size:
        raise AppError("FILE_TOO_LARGE", f"The {kind} file is too large.")

    suffix = Path(file.filename or "upload").suffix.lower() or (".jpg" if kind == "image" else ".webm")
    storage_path = f"{uuid4()}{suffix}"
    storage = get_supabase().storage.from_(bucket)
    storage.upload(storage_path, content, {"content-type": content_type, "upsert": "false"})

    if kind == "image":
        return {"url": storage.get_public_url(storage_path)}
    return {"url": f"{bucket}/{storage_path}"}


@router.post("/image")
async def upload_image(file: UploadFile = File(...), _account: Account = Depends(current_seller)) -> dict[str, str]:
    return await store_file(file, "image")


@router.post("/audio")
async def upload_audio(file: UploadFile = File(...), _account: Account = Depends(current_seller)) -> dict[str, str]:
    return await store_file(file, "audio")
