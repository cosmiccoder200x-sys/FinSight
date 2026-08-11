"""Portfolio calculations and holding CRUD tests."""

from __future__ import annotations

import pytest


@pytest.fixture()
def holding_payload():
    return {
        "asset_type": "stock",
        "symbol": "RELIANCE",
        "name": "Reliance Industries",
        "quantity": 10,
        "avg_buy_price": 2000,
        "purchase_date": "2025-01-10",
    }


def test_empty_portfolio(client, auth_headers):
    r = client.get("/api/portfolio", headers=auth_headers)
    assert r.status_code == 200
    assert r.json() == []

    r = client.get("/api/portfolio/summary", headers=auth_headers)
    assert r.json()["total_value"] == 0
    assert r.json()["holdings_count"] == 0


def test_create_holding(client, auth_headers, holding_payload):
    r = client.post("/api/portfolio/holdings", json=holding_payload, headers=auth_headers)
    assert r.status_code == 201
    body = r.json()
    assert body["symbol"] == "RELIANCE"
    assert body["invested"] == pytest.approx(20000.0)
    # Demo provider returns a non-zero simulated price.
    assert body["current_price"] > 0
    assert body["current_value"] == pytest.approx(body["quantity"] * body["current_price"])


def test_pnl_math_is_consistent(client, auth_headers, holding_payload):
    r = client.post("/api/portfolio/holdings", json=holding_payload, headers=auth_headers)
    h = r.json()
    invested = h["invested"]
    value = h["current_value"]
    assert h["pnl"] == pytest.approx(value - invested, abs=0.01)
    if invested > 0:
        assert h["return_pct"] == pytest.approx((value - invested) / invested * 100, abs=0.1)
    assert h["weight"] == pytest.approx(100.0, abs=0.01)  # single holding


def test_update_holding(client, auth_headers, holding_payload):
    r = client.post("/api/portfolio/holdings", json=holding_payload, headers=auth_headers)
    hid = r.json()["id"]
    r = client.put(f"/api/portfolio/holdings/{hid}", json={"quantity": 20, "avg_buy_price": 1800}, headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["quantity"] == 20
    assert r.json()["avg_buy_price"] == 1800
    assert r.json()["invested"] == pytest.approx(36000.0)


def test_update_holding_not_found(client, auth_headers):
    r = client.put("/api/portfolio/holdings/999999", json={"quantity": 5}, headers=auth_headers)
    assert r.status_code == 404


def test_delete_holding(client, auth_headers, holding_payload):
    r = client.post("/api/portfolio/holdings", json=holding_payload, headers=auth_headers)
    hid = r.json()["id"]
    assert client.delete(f"/api/portfolio/holdings/{hid}", headers=auth_headers).status_code == 204
    assert client.get("/api/portfolio", headers=auth_headers).json() == []


def test_portfolio_summary_aggregates(client, auth_headers, holding_payload):
    client.post("/api/portfolio/holdings", json=holding_payload, headers=auth_headers)
    client.post(
        "/api/portfolio/holdings",
        json={**holding_payload, "symbol": "TCS", "quantity": 5, "avg_buy_price": 3800},
        headers=auth_headers,
    )
    r = client.get("/api/portfolio/summary", headers=auth_headers)
    assert r.json()["holdings_count"] == 2
    assert r.json()["total_invested"] == pytest.approx(20000 + 5 * 3800, abs=0.01)


def test_portfolio_analytics_metrics(client, auth_headers, holding_payload):
    client.post("/api/portfolio/holdings", json=holding_payload, headers=auth_headers)
    r = client.get("/api/portfolio/analytics", headers=auth_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["invested"] == pytest.approx(20000.0)
    assert body["data_basis"] == "simulated"  # demo provider
    assert body["diversification_score"] == pytest.approx(0.0)  # single asset
    assert body["max_drawdown_pct"] <= 0


def test_portfolio_history_and_allocation(client, auth_headers, holding_payload):
    client.post("/api/portfolio/holdings", json=holding_payload, headers=auth_headers)
    r = client.get("/api/portfolio/history?period=3M", headers=auth_headers)
    assert r.status_code == 200
    assert len(r.json()) > 1
    r = client.get("/api/portfolio/allocation", headers=auth_headers)
    slices = r.json()["slices"]
    assert any(s["name"] == "Stocks" for s in slices)


def test_portfolio_isolated_between_users(client, auth_headers, holding_payload):
    client.post("/api/portfolio/holdings", json=holding_payload, headers=auth_headers)
    # Second user sees nothing.
    r = client.post(
        "/api/auth/register",
        json={"email": "second@finsight.app", "password": "secret123", "full_name": "Second"},
    )
    other_headers = {"Authorization": f"Bearer {r.json()['access_token']}"}
    assert client.get("/api/portfolio", headers=other_headers).json() == []
