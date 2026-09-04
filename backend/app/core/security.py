from __future__ import annotations

import base64
import hashlib
import hmac
import os

from app.core.errors import AppError


def hash_password(password: str) -> str:
    if len(password) < 6:
        raise AppError("WEAK_PASSWORD", "Password must be at least 6 characters.")
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 210_000)
    return "pbkdf2_sha256$210000$" + base64.b64encode(salt).decode() + "$" + base64.b64encode(digest).decode()


def verify_password(password: str, password_hash: str) -> bool:
    try:
        scheme, rounds, salt_b64, digest_b64 = password_hash.split("$", maxsplit=3)
        if scheme != "pbkdf2_sha256":
            return False
        salt = base64.b64decode(salt_b64)
        expected = base64.b64decode(digest_b64)
        actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, int(rounds))
        return hmac.compare_digest(actual, expected)
    except (ValueError, TypeError):
        return False
