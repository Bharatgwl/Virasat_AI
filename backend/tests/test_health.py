from types import SimpleNamespace

from fastapi.testclient import TestClient

from app.api import health as health_api
from app.main import app


client = TestClient(app)


def test_health() -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_supabase_health_explains_missing_setup(monkeypatch) -> None:
    monkeypatch.setattr(
        health_api,
        "get_settings",
        lambda: SimpleNamespace(supabase_url=None, supabase_backend_key=None),
    )
    response = client.get("/api/health/supabase")
    assert response.status_code == 200
    assert response.json() == {
        "status": "setup_required",
        "configured": False,
        "connected": False,
    }
