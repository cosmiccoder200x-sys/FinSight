"""Financial health scoring tests."""

from __future__ import annotations

import datetime as dt


def _setup_profile(client, auth_headers, income, debt, emergency):
    client.patch(
        "/api/auth/profile",
        json={"monthly_income": income, "monthly_debt_payments": debt, "emergency_fund": emergency},
        headers=auth_headers,
    )


def _add_expense(client, auth_headers, amount, days_ago=0):
    d = (dt.date.today() - dt.timedelta(days=days_ago)).isoformat()
    client.post("/api/expenses", json={"amount": amount, "category": "other", "expense_date": d}, headers=auth_headers)


def test_health_without_data(client, auth_headers):
    r = client.get("/api/financial-health", headers=auth_headers)
    assert r.status_code == 200
    body = r.json()
    assert 0 <= body["overall_score"] <= 100
    assert len(body["components"]) >= 5
    assert body["data_basis"] == "actual"


def test_health_score_improves_with_savings(client, auth_headers):
    _setup_profile(client, auth_headers, income=100000, debt=0, emergency=300000)
    _add_expense(client, auth_headers, 20000)  # 20% spend -> 80% savings
    r = client.get("/api/financial-health", headers=auth_headers).json()
    savings = next(c for c in r["components"] if c["key"] == "savings")
    assert savings["score"] >= 80

    _add_expense(client, auth_headers, 150000)  # over-spend
    r2 = client.get("/api/financial-health", headers=auth_headers).json()
    savings2 = next(c for c in r2["components"] if c["key"] == "savings")
    assert savings2["score"] < savings["score"]


def test_health_emergency_fund(client, auth_headers):
    _setup_profile(client, auth_headers, income=50000, debt=0, emergency=0)
    _add_expense(client, auth_headers, 20000)
    r = client.get("/api/financial-health", headers=auth_headers).json()
    ef = next(c for c in r["components"] if c["key"] == "emergency_fund")
    assert ef["score"] == 0

    _setup_profile(client, auth_headers, income=50000, debt=0, emergency=120000)
    r = client.get("/api/financial-health", headers=auth_headers).json()
    ef = next(c for c in r["components"] if c["key"] == "emergency_fund")
    assert ef["score"] >= 90  # 6 months covered


def test_health_debt_burden(client, auth_headers):
    _setup_profile(client, auth_headers, income=100000, debt=50000, emergency=0)
    r = client.get("/api/financial-health", headers=auth_headers).json()
    debt = next(c for c in r["components"] if c["key"] == "debt")
    assert debt["score"] < 20  # 50% of income to debt is poor


def test_components_have_explanations(client, auth_headers):
    r = client.get("/api/financial-health", headers=auth_headers).json()
    for comp in r["components"]:
        assert comp["explanation"].strip()
