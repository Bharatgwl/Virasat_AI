from fastapi import APIRouter, Depends, Header, Request

from app.api.dependencies import current_account
from app.schemas.account import Account
from app.schemas.account import AccountLogin, AccountSession, AccountSignup, AuthMe, GoogleAuthRequest
from app.services.account_service import account_from_session_token, authenticate_google, create_account, login_account, revoke_session_token
from app.services.auth_request_guard import auth_request_guard


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=AccountSession, status_code=201)
def signup(request: AccountSignup, http_request: Request) -> AccountSession:
    auth_request_guard.check(_client_key(http_request, "signup"))
    return create_account(request)


@router.post("/login", response_model=AccountSession)
def login(request: AccountLogin, http_request: Request) -> AccountSession:
    auth_request_guard.check(_client_key(http_request, "login"))
    return login_account(request)


@router.post("/google", response_model=AccountSession)
def google_auth(request: GoogleAuthRequest, http_request: Request) -> AccountSession:
    auth_request_guard.check(_client_key(http_request, "google"))
    return authenticate_google(request)


@router.post("/logout", response_model=dict)
def logout(authorization: str | None = Header(default=None), _account: Account = Depends(current_account)) -> dict:
    revoke_session_token((authorization or "").removeprefix("Bearer ").strip())
    return {"ok": True}


@router.get("/me", response_model=AuthMe)
def me(authorization: str | None = Header(default=None)) -> dict:
    token = None
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()
    return {"account": account_from_session_token(token)}


def _client_key(request: Request, action: str) -> str:
    forwarded = request.headers.get("x-forwarded-for", "").split(",", maxsplit=1)[0].strip()
    address = forwarded or (request.client.host if request.client else "unknown")
    return f"{action}:{address}"
