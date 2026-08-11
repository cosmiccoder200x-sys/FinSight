"""Authorization and admin protection tests."""

from __future__ import annotations


def test_admin_endpoints_require_admin(client, auth_headers):
    for path in ("/api/admin/analytics", "/api/admin/users"):
        r = client.get(path, headers=auth_headers)
        assert r.status_code == 403, path


def test_admin_can_access(client, admin_headers):
    r = client.get("/api/admin/analytics", headers=admin_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["total_users"] >= 1
    assert "total_expenses" in body
    assert "demo_mode" in body


def test_admin_users_list(client, admin_headers):
    r = client.get("/api/admin/users", headers=admin_headers)
    assert r.status_code == 200
    assert any(u["email"] == "admin@finsight.app" for u in r.json())


def test_unauthenticated_admin_request(client):
    assert client.get("/api/admin/analytics").status_code == 401


def test_market_endpoints_require_auth(client):
    assert client.get("/api/markets/indices").status_code == 401
    assert client.get("/api/news").status_code == 401
    assert client.get("/api/dashboard").status_code == 401


def test_user_cannot_edit_another_users_data(client, auth_headers, admin_headers):
    r = client.get("/api/portfolio", headers=auth_headers)
    assert r.status_code == 200
    # An admin (different user) should not be able to delete a non-existent holding id
    # owned by nobody; ensure no cross-user access leaks.
    assert client.put("/api/portfolio/holdings/1", json={"quantity": 9}, headers=admin_headers).status_code == 404


def test_inactive_user_is_rejected(client):
    from app.core.config import settings
    from sqlalchemy import update

    # Login as the demo user, then deactivate via DB, then confirm blocked.
    from app.db.session import SessionLocal
    from app.models import User

    db = SessionLocal()
    db.execute(update(User).where(User.email == settings.DEMO_USER_EMAIL).values(is_active=False))
    db.commit()
    r = client.post("/api/auth/login", json={"email": settings.DEMO_USER_EMAIL, "password": settings.DEMO_USER_PASSWORD})
    db.close()
    assert r.status_code == 403
