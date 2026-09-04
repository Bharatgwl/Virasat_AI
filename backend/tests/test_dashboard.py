from types import SimpleNamespace
from uuid import uuid4

from fastapi.testclient import TestClient

from app.api import inquiries, products
from app.api.dependencies import current_artisan
from app.main import app
from app.schemas.artisan import Artisan


client = TestClient(app)


class FakeQuery:
    def __init__(self, data: list[dict]) -> None:
        self.data = data

    def select(self, *_args, **_kwargs) -> "FakeQuery":
        return self

    def order(self, *_args, **_kwargs) -> "FakeQuery":
        return self

    def eq(self, *_args, **_kwargs) -> "FakeQuery":
        return self

    def in_(self, *_args, **_kwargs) -> "FakeQuery":
        return self

    def execute(self) -> SimpleNamespace:
        return SimpleNamespace(data=self.data)


class FakeSupabase:
    def __init__(self, rows: dict[str, list[dict]]) -> None:
        self.rows = rows

    def table(self, name: str) -> FakeQuery:
        return FakeQuery(self.rows[name])


def test_dashboard_lists_drafts_and_published_products(monkeypatch) -> None:
    product_id = str(uuid4())
    fake = FakeSupabase(
        {
            "products": [
                {
                    "id": product_id,
                    "artisan_name": "Rani Devi",
                    "title": "Blue Pottery Pen Stand",
                    "description": "A handmade blue pottery pen stand from Jaipur.",
                    "category": "Home and Office",
                    "materials": ["Clay"],
                    "price_inr": 450,
                    "image_url": "https://example.com/product.jpg",
                    "audio_url": None,
                    "status": "draft",
                    "created_at": "2026-09-01T10:00:00Z",
                }
            ]
        }
    )
    monkeypatch.setattr(products, "get_supabase", lambda: fake)

    artisan_id = uuid4()
    app.dependency_overrides[current_artisan] = lambda: Artisan(
        id=artisan_id,
        account_id=uuid4(),
        artisan_name="Rani Devi",
        phone="9876543210",
        location="Jaipur",
        craft_type="Pottery",
    )
    response = client.get("/api/seller/products")
    app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json()[0]["id"] == product_id
    assert response.json()[0]["status"] == "draft"


def test_dashboard_flattens_product_title_for_inquiries(monkeypatch) -> None:
    inquiry_id = str(uuid4())
    product_id = str(uuid4())
    fake = FakeSupabase(
        {
            "products": [{"id": product_id}],
            "inquiries": [
                {
                    "id": inquiry_id,
                    "product_id": product_id,
                    "buyer_name": "Asha Stores",
                    "buyer_contact": "buyer@example.com",
                    "quantity": 20,
                    "message": "Please share delivery time.",
                    "status": "new",
                    "created_at": "2026-09-01T11:00:00Z",
                    "products": {"title": "Blue Pottery Pen Stand"},
                }
            ]
        }
    )
    monkeypatch.setattr(inquiries, "get_supabase", lambda: fake)

    app.dependency_overrides[current_artisan] = lambda: Artisan(
        id=uuid4(),
        account_id=uuid4(),
        artisan_name="Rani Devi",
        phone="9876543210",
        location="Jaipur",
        craft_type="Pottery",
    )
    response = client.get("/api/seller/inquiries")
    app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json()[0]["product_title"] == "Blue Pottery Pen Stand"
    assert response.json()[0]["status"] == "new"
