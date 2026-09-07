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
FILE_SUFFIXES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "audio/webm": ".webm",
    "audio/ogg": ".ogg",
    "audio/mpeg": ".mp3",
    "audio/wav": ".wav",
    "audio/x-wav": ".wav",
}
settings = get_settings()


def _has_valid_signature(content: bytes, content_type: str) -> bool:
    if content_type == "image/jpeg":
        return content.startswith(b"\xff\xd8\xff")
    if content_type == "image/png":
        return content.startswith(b"\x89PNG\r\n\x1a\n")
    if content_type == "image/webp":
        return len(content) >= 12 and content.startswith(b"RIFF") and content[8:12] == b"WEBP"
    if content_type == "audio/webm":
        return content.startswith(b"\x1aE\xdf\xa3")
    if content_type == "audio/ogg":
        return content.startswith(b"OggS")
    if content_type == "audio/mpeg":
        return content.startswith(b"ID3") or (len(content) >= 2 and content[0] == 0xFF and content[1] & 0xE0 == 0xE0)
    if content_type in {"audio/wav", "audio/x-wav"}:
        return len(content) >= 12 and content.startswith(b"RIFF") and content[8:12] == b"WAVE"
    return False


async def store_file(file: UploadFile, kind: str) -> dict[str, str]:
    allowed_types = IMAGE_TYPES if kind == "image" else AUDIO_TYPES
    maximum_size = settings.upload_max_image_bytes if kind == "image" else settings.upload_max_audio_bytes
    bucket = "product-images" if kind == "image" else "product-audio"
    content_type = (file.content_type or "").split(";", maxsplit=1)[0].strip().lower()

    if content_type not in allowed_types:
        raise AppError("UNSUPPORTED_FILE", f"Unsupported {kind} file format.")

    content = await file.read(maximum_size + 1)
    if not content:
        raise AppError("EMPTY_FILE", f"The {kind} file is empty.")
    if len(content) > maximum_size:
        raise AppError("FILE_TOO_LARGE", f"The {kind} file is too large.")
    if not _has_valid_signature(content, content_type):
        raise AppError("INVALID_FILE_CONTENT", f"The uploaded file is not a valid {kind} file.")

    suffix = FILE_SUFFIXES[content_type]
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
