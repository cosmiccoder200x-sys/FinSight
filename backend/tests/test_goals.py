"""Savings-goal API tests."""

from __future__ import annotations

import datetime as dt


def test_goal_lifecycle_and_savings_pace(client, auth_headers):
    target_date = (dt.date.today() + dt.timedelta(days=180)).isoformat()
    response = client.post(
        "/api/goals",
        json={"name": "Emergency fund", "target_amount": 12000, "target_date": target_date},
        headers=auth_headers,
    )
    assert response.status_code == 201
    goal = response.json()
    assert goal["name"] == "Emergency fund"
    assert goal["saved_amount"] == 0
    assert goal["remaining_amount"] == 12000
    assert goal["progress_pct"] == 0
    assert goal["monthly_contribution"] == 2000

    contribution = client.post(
        f"/api/goals/{goal['id']}/contributions",
        json={"amount": 3000},
        headers=auth_headers,
    )
    assert contribution.status_code == 201
    assert contribution.json()["saved_amount"] == 3000
    assert contribution.json()["remaining_amount"] == 9000
    assert contribution.json()["progress_pct"] == 25

    updated = client.put(
        f"/api/goals/{goal['id']}",
        json={"target_amount": 6000, "notes": "Keep it accessible"},
        headers=auth_headers,
    )
    assert updated.status_code == 200
    assert updated.json()["progress_pct"] == 50
    assert updated.json()["notes"] == "Keep it accessible"

    assert client.delete(f"/api/goals/{goal['id']}", headers=auth_headers).status_code == 204
    assert client.get("/api/goals", headers=auth_headers).json() == []


def test_goal_validation_and_ownership(client, auth_headers):
    assert client.post(
        "/api/goals", json={"name": "No target", "target_amount": 0}, headers=auth_headers
    ).status_code == 422
    goal = client.post(
        "/api/goals",
        json={"name": "Trip", "target_amount": 5000},
        headers=auth_headers,
    ).json()

    response = client.post(
        f"/api/goals/{goal['id']}/contributions",
        json={"amount": -1},
        headers=auth_headers,
    )
    assert response.status_code == 422

    client.post(
        "/api/auth/register",
        json={"email": "goal-owner-test@finsight.app", "password": "secret123", "full_name": "Other User"},
    )
    login = client.post(
        "/api/auth/login",
        json={"email": "goal-owner-test@finsight.app", "password": "secret123"},
    )
    other_headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    assert client.get("/api/goals", headers=other_headers).json() == []
    assert client.post(
        f"/api/goals/{goal['id']}/contributions",
        json={"amount": 100},
        headers=other_headers,
    ).status_code == 404


def test_contribution_can_complete_goal(client, auth_headers):
    goal = client.post(
        "/api/goals", json={"name": "New laptop", "target_amount": 100}, headers=auth_headers
    ).json()
    completed = client.post(
        f"/api/goals/{goal['id']}/contributions",
        json={"amount": 125},
        headers=auth_headers,
    ).json()
    assert completed["saved_amount"] == 125
    assert completed["remaining_amount"] == 0
    assert completed["progress_pct"] == 100
    assert completed["monthly_contribution"] is None


def test_past_target_date_has_no_monthly_pace(client, auth_headers):
    goal = client.post(
        "/api/goals",
        json={
            "name": "Past goal",
            "target_amount": 1000,
            "target_date": (dt.date.today() - dt.timedelta(days=1)).isoformat(),
        },
        headers=auth_headers,
    ).json()
    assert goal["monthly_contribution"] is None
