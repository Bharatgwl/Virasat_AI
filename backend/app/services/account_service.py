import base64
import hashlib
import hmac
import json
import time
from datetime import UTC, datetime
from uuid import UUID, uuid4

from postgrest.exceptions import APIError

from app.core.config import get_settings
from app.core.errors import AppError
from app.core.security import hash_password, verify_password
from app.schemas.account import Account, AccountLogin, AccountSession, AccountSignup, GoogleAuthRequest
from app.services.supabase_client import get_supabase


def _session_for(account: dict, token_type: str = "app", *, register: bool = True) -> AccountSession:
    session_id = uuid4()
    expires_at = int(time.time()) + (7 * 24 * 60 * 60)
    payload = {
        "sub": str(account["id"]),
        "role": account["role"],
        "sid": str(session_id),
        "exp": expires_at,
    }
    encoded = base64.urlsafe_b64encode(json.dumps(payload, separators=(",", ":")).encode()).decode().rstrip("=")
    signature = hmac.new(get_settings().session_signing_key.encode(), encoded.encode(), hashlib.sha256).digest()
    signed_token = f"v1.{encoded}.{base64.urlsafe_b64encode(signature).decode().rstrip('=')}"
    session = AccountSession(
        account=Account.model_validate(account),
        token_type=token_type,  # type: ignore[arg-type]
        access_token=signed_token,
    )
    if register:
        try:
            get_supabase().table("app_sessions").insert(
                {
                    "id": str(session_id),
                    "account_id": str(account["id"]),
                    "expires_at": datetime.fromtimestamp(expires_at, UTC).isoformat(),
                }
            ).execute()
        except APIError as exc:
            raise AppError(
                "SESSION_CREATE_FAILED",
                "A secure session could not be created. Please try signing in again.",
                503,
                True,
            ) from exc
    return session


def _decode_session_token(token: str) -> dict | None:
    try:
        version, encoded, provided_signature = token.split(".", maxsplit=2)
        if version != "v1":
            return None
        expected = hmac.new(get_settings().session_signing_key.encode(), encoded.encode(), hashlib.sha256).digest()
        signature = base64.urlsafe_b64decode(provided_signature + "=" * (-len(provided_signature) % 4))
        canonical_signature = base64.urlsafe_b64encode(signature).decode().rstrip("=")
        if not hmac.compare_digest(provided_signature, canonical_signature):
            return None
        if not hmac.compare_digest(signature, expected):
            return None
        payload = json.loads(base64.urlsafe_b64decode(encoded + "=" * (-len(encoded) % 4)))
        if int(payload["exp"]) <= int(time.time()):
            return None
        UUID(payload["sub"])
        UUID(payload["sid"])
        return payload
    except (ValueError, KeyError, TypeError, json.JSONDecodeError):
        return None


def _session_is_active(session_id: str, account_id: str) -> bool:
    try:
        response = (
            get_supabase().table("app_sessions").select("id")
            .eq("id", session_id).eq("account_id", account_id)
            .is_("revoked_at", "null").limit(1).execute()
        )
    except APIError as exc:
        raise AppError("SESSION_STORE_UNAVAILABLE", "The session service is temporarily unavailable.", 503, True) from exc
    return bool(response.data)


def account_from_session_token(token: str | None) -> Account | None:
    if not token:
        return None
    try:
        payload = _decode_session_token(token)
        if not payload or not _session_is_active(payload["sid"], payload["sub"]):
            return None
        account = get_account(UUID(payload["sub"]))
        return account if account.role == payload["role"] else None
    except AppError as exc:
        if exc.code == "ACCOUNT_NOT_FOUND":
            return None
        raise
    except (ValueError, KeyError, TypeError):
        return None


def revoke_session_token(token: str) -> None:
    payload = _decode_session_token(token)
    if not payload:
        return
    try:
        (
            get_supabase().table("app_sessions")
            .update({"revoked_at": datetime.now(UTC).isoformat()})
            .eq("id", payload["sid"]).eq("account_id", payload["sub"]).execute()
        )
    except APIError as exc:
        raise AppError("SESSION_REVOKE_FAILED", "Sign-out could not be completed securely.", 503, True) from exc


def create_account(request: AccountSignup) -> AccountSession:
    payload = request.model_dump(exclude={"password"}, mode="json")
    payload["password_hash"] = hash_password(request.password)
    payload["auth_provider"] = "password"
    try:
        response = get_supabase().table("accounts").insert(payload).execute()
    except APIError as exc:
        if exc.code == "23505":
            raise AppError("ACCOUNT_EXISTS", "An account already exists for this role and contact.", 409) from exc
        raise AppError("ACCOUNT_CREATE_FAILED", "The account could not be created.", 500, True) from exc
    if not response.data:
        raise AppError("ACCOUNT_CREATE_FAILED", "The account could not be created.", 500, True)
    return _session_for(response.data[0])


def login_account(request: AccountLogin) -> AccountSession:
    query = (
        get_supabase()
        .table("accounts")
        .select("*")
        .eq("role", request.role)
    )
    if "@" in request.identifier:
        query = query.eq("email", request.identifier.lower())
    else:
        query = query.eq("phone", request.identifier)
    response = query.limit(1).execute()
    if not response.data:
        raise AppError("INVALID_LOGIN", "Account was not found for this role.", 401)
    account = response.data[0]
    if not verify_password(request.password, account.get("password_hash", "")):
        raise AppError("INVALID_LOGIN", "Password is incorrect.", 401)
    return _session_for(account)


def get_account(account_id: UUID) -> Account:
    response = (
        get_supabase()
        .table("accounts")
        .select("*")
        .eq("id", str(account_id))
        .limit(1)
        .execute()
    )
    if not response.data:
        raise AppError("ACCOUNT_NOT_FOUND", "The account was not found.", 404)
    return Account.model_validate(response.data[0])


def authenticate_google(request: GoogleAuthRequest) -> AccountSession:
    settings_user = get_supabase().auth.get_user(request.access_token)
    user = getattr(settings_user, "user", None)
    if not user:
        raise AppError("GOOGLE_AUTH_FAILED", "Google login could not be verified.", 401)
    email = getattr(user, "email", None)
    metadata = getattr(user, "user_metadata", {}) or {}
    display_name = metadata.get("full_name") or metadata.get("name") or email or "Google user"
    if not email:
        raise AppError("GOOGLE_EMAIL_REQUIRED", "Google account must expose an email address.", 400)

    existing = (
        get_supabase()
        .table("accounts")
        .select("*")
        .eq("role", request.role)
        .eq("email", email.lower())
        .limit(1)
        .execute()
    )
    if existing.data:
        return _session_for(existing.data[0], "supabase")

    payload = {
        "role": request.role,
        "display_name": display_name,
        "phone": None,
        "email": email.lower(),
        "password_hash": "",
        "auth_provider": "google",
    }
    try:
        created = get_supabase().table("accounts").insert(payload).execute()
    except APIError as exc:
        if exc.code == "23505":
            raise AppError("ACCOUNT_EXISTS", "A Google account already exists for this role.", 409) from exc
        raise AppError("GOOGLE_ACCOUNT_CREATE_FAILED", "Google account could not be created.", 500, True) from exc
    if not created.data:
        raise AppError("GOOGLE_ACCOUNT_CREATE_FAILED", "Google account could not be created.", 500, True)
    return _session_for(created.data[0], "supabase")
