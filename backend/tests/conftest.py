"""Pytest fixtures: isolated database + authenticated test client."""

from __future__ import annotations

import itertools
import os
import tempfile

import pytest

_tmpdir = tempfile.mkdtemp(prefix="finsight_tests_")
os.environ["DATABASE_URL"] = f"sqlite:///{_tmpdir}/test.db"
os.environ["DEMO_MODE"] = "true"
os.environ["RATE_LIMIT_ENABLED"] = "false"
os.environ["AI_ENABLED"] = "false"

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

_user_counter = itertools.count(1)


@pytest.fixture(scope="session")
def client() -> TestClient:
    with TestClient(app) as c:
        yield c


@pytest.fixture()
def auth_headers(client: TestClient) -> dict[str, str]:
    email = f"tester{n}@finsight.app" if (n := next(_user_counter)) else "tester@finsight.app"
    r = client.post("/api/auth/register", json={"email": email, "password": "secret123", "full_name": "Test User"})
    assert r.status_code == 201, r.text
    token = r.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def admin_headers(client: TestClient) -> dict[str, str]:
    r = client.post("/api/auth/login", json={"email": "admin@finsight.app", "password": "admin1234"})
    assert r.status_code == 200, r.text
    token = r.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
