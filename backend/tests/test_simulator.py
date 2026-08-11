"""Investment simulator tests (pure math, verified against the annuity formula)."""

from __future__ import annotations

import math

import pytest

from app.services.simulator import SCENARIOS, simulate


def _future_value(initial, monthly, annual_pct, months) -> float:
    """Reference implementation: monthly-compounded future value."""
    r = annual_pct / 100.0 / 12.0
    if r == 0:
        return initial + monthly * months
    g = (1 + r) ** months
    return initial * g + monthly * ((g - 1) / r) * (1 + r)


def test_simulator_matches_reference_formula():
    res = simulate(initial_investment=100000, monthly_contribution=10000, annual_return_pct=10, inflation_pct=6, years=10)
    expected = _future_value(100000, 10000, 10, 120)
    assert res["estimated_final_value"] == pytest.approx(expected, rel=1e-6)
    assert res["total_contributions"] == pytest.approx(100000 + 10000 * 120)
    assert res["estimated_gains"] == pytest.approx(res["estimated_final_value"] - res["total_contributions"])


def test_simulator_zero_rate():
    res = simulate(initial_investment=0, monthly_contribution=5000, annual_return_pct=0, inflation_pct=0, years=5)
    assert res["estimated_final_value"] == pytest.approx(5000 * 60)
    assert res["estimated_gains"] == pytest.approx(0)


def test_inflation_adjusted_value_is_lower():
    res = simulate(initial_investment=1000, monthly_contribution=1000, annual_return_pct=12, inflation_pct=6, years=20)
    assert res["inflation_adjusted_value"] < res["estimated_final_value"]


def test_chart_growth_is_monotonic():
    res = simulate(initial_investment=0, monthly_contribution=10000, annual_return_pct=10, inflation_pct=6, years=15)
    values = [p["value"] for p in res["chart"]]
    assert values == sorted(values)
    assert len(res["chart"]) == 15
    assert res["chart"][-1]["year"] == 15


def test_scenarios_present():
    assert set(SCENARIOS) == {"conservative", "moderate", "aggressive"}
    for name, sc in SCENARIOS.items():
        assert 0 < sc["annual_return_pct"] < 30
        assert sc["inflation_pct"] >= 0


def test_simulator_endpoint(client, auth_headers):
    r = client.post(
        "/api/simulator",
        json={"initial_investment": 50000, "monthly_contribution": 5000, "annual_return_pct": 12, "inflation_pct": 6, "years": 8, "scenario_name": "moderate"},
        headers=auth_headers,
    )
    assert r.status_code == 200
    body = r.json()
    assert body["is_simulation"] is True
    assert body["years"] == 8
    assert body["estimated_final_value"] == pytest.approx(_future_value(50000, 5000, 12, 96), rel=1e-6)
    assert body["disclaimer"]


def test_simulator_validation(client, auth_headers):
    r = client.post("/api/simulator", json={"annual_return_pct": 120, "years": 100}, headers=auth_headers)
    assert r.status_code == 422


def test_simulator_scenarios_endpoint(client, auth_headers):
    r = client.get("/api/simulator/scenarios", headers=auth_headers)
    assert r.status_code == 200
    assert "moderate" in r.json()
