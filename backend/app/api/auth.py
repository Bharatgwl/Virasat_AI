from fastapi import APIRouter, Header

from app.schemas.account import AccountLogin, AccountSession, AccountSignup, AuthMe, GoogleAuthRequest
from app.services.account_service import account_from_session_token, authenticate_google, create_account, login_account


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=AccountSession, status_code=201)
def signup(request: AccountSignup) -> AccountSession:
    return create_account(request)


@router.post("/login", response_model=AccountSession)
def login(request: AccountLogin) -> AccountSession:
    return login_account(request)


@router.post("/google", response_model=AccountSession)
def google_auth(request: GoogleAuthRequest) -> AccountSession:
    return authenticate_google(request)


@router.post("/logout", response_model=dict)
def logout() -> dict:
    return {"ok": True}


@router.get("/me", response_model=AuthMe)
def me(authorization: str | None = Header(default=None)) -> dict:
    token = None
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()
    return {"account": account_from_session_token(token)}
