from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.core.security import hash_password, verify_password
from app.schemas.account import Account
from app.schemas.account import AccountLogin, AccountSignup
from app.schemas.order import OrderCreate
from app.services import account_service
from app.services import order_service


def test_password_hash_verification_round_trip() -> None:
    hashed = hash_password("secret123")
    assert hashed != "secret123"
    assert verify_password("secret123", hashed)
    assert not verify_password("wrong123", hashed)


def test_session_token_is_signed_and_rejects_tampering(monkeypatch) -> None:
    account_id = uuid4()
    row = {"id": account_id, "role": "seller", "display_name": "Rani Devi"}
    session = account_service._session_for(row, register=False)
    monkeypatch.setattr(
        account_service,
        "get_account",
        lambda _account_id: Account(id=account_id, role="seller", display_name="Rani Devi"),
    )
    monkeypatch.setattr(account_service, "_session_is_active", lambda _session_id, _account_id: True)

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
            payment_mode="cod",
            idempotency_key=uuid4(),
        )


def test_order_creation_uses_atomic_idempotent_rpc(monkeypatch) -> None:
    buyer_id = uuid4()
    product_id = uuid4()
    order_id = uuid4()
    key = uuid4()
    captured: dict = {}

    class Response:
        data = {
            "id": str(order_id),
            "buyer_id": str(buyer_id),
            "buyer_name": "Aarav Sharma",
            "buyer_contact": "9876543210",
            "delivery_address": "Jaipur, Rajasthan",
            "items": [
                {
                    "product_id": str(product_id),
                    "quantity": 1,
                    "unit_price_inr": 500,
                    "line_total_inr": 500,
                }
            ],
            "total_inr": 500,
            "status": "placed",
            "payment_mode": "cod",
        }

    class Rpc:
        def execute(self):
            return Response()

    class Supabase:
        def rpc(self, name, params):
            captured.update({"name": name, "params": params})
            return Rpc()

    monkeypatch.setattr(order_service, "get_supabase", lambda: Supabase())
    order = order_service.place_order(
        OrderCreate(
            buyer_id=buyer_id,
            items=[{"product_id": product_id, "quantity": 1}],
            delivery_address="Jaipur, Rajasthan",
            payment_mode="cod",
            idempotency_key=key,
        )
    )

    assert order.id == order_id
    assert captured["name"] == "place_buyer_order"
    assert captured["params"]["p_idempotency_key"] == str(key)
