"""Authentication and account tests."""

from __future__ import annotations


def test_register_login_me(client):
    r = client.post(
        "/api/auth/register",
        json={"email": "new@example.com", "password": "hunter22", "full_name": "New User"},
    )
    assert r.status_code == 201
    body = r.json()
    assert body["token_type"] == "bearer"
    assert body["user"]["email"] == "new@example.com"
    assert body["user"]["is_admin"] is False

    r = client.post("/api/auth/login", json={"email": "new@example.com", "password": "hunter22"})
    assert r.status_code == 200
    token = r.json()["access_token"]

    r = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["full_name"] == "New User"


def test_register_rejects_duplicate_email(client):
    payload = {"email": "dup@example.com", "password": "secret123", "full_name": "Dup"}
    assert client.post("/api/auth/register", json=payload).status_code == 201
    assert client.post("/api/auth/register", json=payload).status_code == 409


def test_login_invalid_credentials(client):
    r = client.post("/api/auth/login", json={"email": "nobody@example.com", "password": "wrongpass"})
    assert r.status_code == 401


def test_register_validates_password_length(client):
    r = client.post("/api/auth/register", json={"email": "short@example.com", "password": "123", "full_name": "S"})
    assert r.status_code == 422


def test_register_validates_email(client):
    r = client.post("/api/auth/register", json={"email": "not-an-email", "password": "secret123", "full_name": "S"})
    assert r.status_code == 422


def test_password_not_stored_in_plaintext(client):
    client.post("/api/auth/register", json={"email": "hash@example.com", "password": "secret123", "full_name": "H"})
    import sqlite3

    from app.core.config import settings

    path = settings.DATABASE_URL.replace("sqlite:///", "")
    con = sqlite3.connect(path)
    row = con.execute("select password_hash from users where email='hash@example.com'").fetchone()
    con.close()
    assert row is not None
    assert "secret123" not in row[0]
    assert row[0].startswith("$2")  # bcrypt


def test_me_rejects_missing_token(client):
    assert client.get("/api/auth/me").status_code == 401


def test_me_rejects_invalid_token(client):
    assert client.get("/api/auth/me", headers={"Authorization": "Bearer not.a.jwt"}).status_code == 401


def test_profile_get_and_update(client, auth_headers):
    r = client.get("/api/auth/profile", headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["monthly_income"] == 0

    r = client.patch("/api/auth/profile", json={"monthly_income": 100000, "emergency_fund": 50000}, headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["monthly_income"] == 100000
    assert r.json()["emergency_fund"] == 50000


def test_logout(client, auth_headers):
    assert client.post("/api/auth/logout", headers=auth_headers).status_code == 200
