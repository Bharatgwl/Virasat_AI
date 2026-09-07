from fastapi.testclient import TestClient
from uuid import uuid4

from app.main import app
from app.schemas.account import Account
from app.services import account_service


client = TestClient(app)


def test_seller_products_require_authentication() -> None:
    response = client.get("/api/seller/products")
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "AUTH_REQUIRED"


def test_buyer_marketplace_requires_authentication() -> None:
    response = client.get("/api/buyer/products")
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "AUTH_REQUIRED"


def test_shared_product_routes_are_not_exposed() -> None:
    assert client.get("/api/products").status_code == 404
    assert client.get("/api/products/manage").status_code == 404


def test_buyer_token_is_denied_from_seller_api(monkeypatch) -> None:
    account_id = uuid4()
    account = Account(id=account_id, role="buyer", display_name="Buyer User")
    token = account_service._session_for(account.model_dump(mode="json"), register=False).access_token
    monkeypatch.setattr(account_service, "get_account", lambda _account_id: account)
    monkeypatch.setattr(account_service, "_session_is_active", lambda _session_id, _account_id: True)

    response = client.get("/api/seller/products", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "ROLE_ACCESS_DENIED"


def test_seller_token_is_denied_from_buyer_api(monkeypatch) -> None:
    account_id = uuid4()
    account = Account(id=account_id, role="seller", display_name="Seller User")
    token = account_service._session_for(account.model_dump(mode="json"), register=False).access_token
    monkeypatch.setattr(account_service, "get_account", lambda _account_id: account)
    monkeypatch.setattr(account_service, "_session_is_active", lambda _session_id, _account_id: True)

    response = client.get("/api/buyer/products", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "ROLE_ACCESS_DENIED"
