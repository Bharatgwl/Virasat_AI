from fastapi import Depends, Header

from app.core.errors import AppError
from app.schemas.account import Account, AccountRole
from app.schemas.artisan import Artisan
from app.schemas.buyer import Buyer
from app.services.account_service import account_from_session_token
from app.services.artisan_service import get_artisan_by_account
from app.services.buyer_service import get_buyer_by_account


def current_account(authorization: str | None = Header(default=None)) -> Account:
    if not authorization or not authorization.startswith("Bearer "):
        raise AppError("AUTH_REQUIRED", "Sign in to continue.", 401)
    account = account_from_session_token(authorization.removeprefix("Bearer ").strip())
    if not account:
        raise AppError("INVALID_SESSION", "Your session is invalid or expired. Sign in again.", 401)
    return account


def require_role(account: Account, role: AccountRole) -> Account:
    if account.role != role:
        raise AppError(
            "ROLE_ACCESS_DENIED",
            f"This area is only available to {role} accounts.",
            403,
        )
    return account


def current_seller(account: Account = Depends(current_account)) -> Account:
    return require_role(account, "seller")


def current_buyer_account(account: Account = Depends(current_account)) -> Account:
    return require_role(account, "buyer")


def current_artisan(account: Account = Depends(current_seller)) -> Artisan:
    return get_artisan_by_account(account.id)


def current_buyer(account: Account = Depends(current_buyer_account)) -> Buyer:
    return get_buyer_by_account(account.id)
