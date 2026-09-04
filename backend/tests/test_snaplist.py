from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_generates_blue_pottery_listing() -> None:
    response = client.post(
        "/api/seller/snaplist/process",
        json={
            "artisan_name": "Rani Devi",
            "description": "Blue pottery pen stand made with clay",
            "has_audio": False,
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["title"] == "Handmade Blue Pottery Pen Stand"
    assert body["suggested_price"] > 0


def test_requires_description_source() -> None:
    response = client.post(
        "/api/seller/snaplist/process",
        json={"artisan_name": "Rani Devi", "description": "", "has_audio": False},
    )
    assert response.status_code == 422
