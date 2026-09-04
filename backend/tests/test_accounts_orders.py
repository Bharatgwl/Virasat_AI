from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.core.security import hash_password, verify_password
from app.schemas.account import Account
from app.schemas.account import AccountLogin, AccountSignup
from app.schemas.order import OrderCreate
from app.services import account_service


def test_password_hash_verification_round_trip() -> None:
    hashed = hash_password("secret123")
    assert hashed != "secret123"
    assert verify_password("secret123", hashed)
    assert not verify_password("wrong123", hashed)


def test_session_token_is_signed_and_rejects_tampering(monkeypatch) -> None:
    account_id = uuid4()
    row = {"id": account_id, "role": "seller", "display_name": "Rani Devi"}
    session = account_service._session_for(row)
    monkeypatch.setattr(
        account_service,
        "get_account",
        lambda _account_id: Account(id=account_id, role="seller", display_name="Rani Devi"),
    )

    verified = account_service.account_from_session_token(session.access_token)
    assert verified is not None
    assert verified.role == "seller"
    tampered = f"{session.access_token[:-1]}{'a' if session.access_token[-1] != 'a' else 'b'}"
    assert account_service.account_from_session_token(tampered) is None
    assert account_service.account_from_session_token(f"app:seller:{account_id}") is None


def test_account_signup_validates_mobile_and_password() -> None:
    with pytest.raises(ValidationError):
        AccountSignup(
            role="seller",
            display_name="Rani Devi",
            phone="12345",
            password="123",
        )


def test_account_login_requires_role_identifier_and_password() -> None:
    login = AccountLogin(role="buyer", identifier="buyer@example.com", password="secret123")
    assert login.role == "buyer"


def test_order_create_requires_items() -> None:
    with pytest.raises(ValidationError):
        OrderCreate(
            buyer_id=uuid4(),
            items=[],
            delivery_address="Jaipur, Rajasthan",
            payment_mode="demo",
        )
