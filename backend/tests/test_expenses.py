"""Expense tracker tests."""

from __future__ import annotations

import datetime as dt

import pytest


def test_empty_expenses(client, auth_headers):
    r = client.get("/api/expenses", headers=auth_headers)
    assert r.status_code == 200
    assert r.json() == []


def test_create_and_summary(client, auth_headers):
    r = client.post(
        "/api/expenses",
        json={"amount": 1000, "category": "food", "description": "dinner", "payment_method": "upi"},
        headers=auth_headers,
    )
    assert r.status_code == 201
    expense = r.json()
    assert expense["amount"] == 1000

    summary = client.get("/api/expenses/summary", headers=auth_headers).json()
    assert summary["total_this_month"] == 1000
    assert summary["category_breakdown"][0]["category"] == "food"
    assert summary["data_basis"] == "actual"


def test_edit_expense(client, auth_headers):
    r = client.post("/api/expenses", json={"amount": 500, "category": "transport"}, headers=auth_headers)
    eid = r.json()["id"]
    r = client.put(f"/api/expenses/{eid}", json={"amount": 750, "category": "shopping"}, headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["amount"] == 750
    assert r.json()["category"] == "shopping"


def test_delete_expense(client, auth_headers):
    r = client.post("/api/expenses", json={"amount": 250, "category": "other"}, headers=auth_headers)
    eid = r.json()["id"]
    assert client.delete(f"/api/expenses/{eid}", headers=auth_headers).status_code == 204
    assert client.get("/api/expenses", headers=auth_headers).json() == []


def test_expense_not_found(client, auth_headers):
    assert client.delete("/api/expenses/999999", headers=auth_headers).status_code == 404


def test_monthly_comparison(client, auth_headers):
    today = dt.date.today()
    this_month = today.strftime("%Y-%m-%d")
    prev_month = (dt.date(today.year, today.month, 1) - dt.timedelta(days=1)).strftime("%Y-%m-15")
    client.post("/api/expenses", json={"amount": 1000, "category": "food", "expense_date": this_month}, headers=auth_headers)
    client.post("/api/expenses", json={"amount": 2000, "category": "food", "expense_date": prev_month}, headers=auth_headers)
    summary = client.get("/api/expenses/summary", headers=auth_headers).json()
    assert summary["total_this_month"] == 1000
    assert summary["total_last_month"] == 2000


def test_budget_flow(client, auth_headers):
    month = dt.date.today().strftime("%Y-%m")
    r = client.post("/api/budgets", json={"category": "food", "monthly_limit": 8000, "month": month}, headers=auth_headers)
    assert r.status_code == 201
    assert client.post("/api/budgets", json={"category": "food", "monthly_limit": 8000, "month": month}, headers=auth_headers).status_code == 409
    r = client.post("/api/expenses", json={"amount": 2000, "category": "food"}, headers=auth_headers)
    assert r.status_code == 201
    summary = client.get("/api/expenses/summary", headers=auth_headers).json()
    statuses = summary["budget_status"]
    assert statuses and statuses[0]["category"] == "food"
    assert statuses[0]["budget"] == 8000
    assert statuses[0]["pct_used"] == pytest.approx(25.0, abs=0.1)
