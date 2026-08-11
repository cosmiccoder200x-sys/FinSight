import os

os.environ["DATABASE_URL"] = "sqlite:///./smoke.db"
os.environ["DEMO_MODE"] = "true"

from fastapi.testclient import TestClient

from app.main import app

with TestClient(app) as c:
    r = c.post("/api/auth/register", json={"email": "t@t.com", "password": "secret123", "full_name": "Tester"})
print("register", r.status_code, r.json().get("user", {}).get("email"))
tok = r.json()["access_token"]
h = {"Authorization": f"Bearer {tok}"}

r = c.get("/api/dashboard", headers=h)
print("dashboard", r.status_code, list(r.json().keys())[:8] if r.status_code == 200 else r.text[:200])

r = c.post(
    "/api/portfolio/holdings",
    headers=h,
    json={"asset_type": "stock", "symbol": "RELIANCE", "name": "Reliance", "quantity": 10, "avg_buy_price": 2500, "purchase_date": "2025-01-10"},
)
print("add holding", r.status_code, r.json().get("symbol"), r.json().get("current_price"))

r = c.get("/api/portfolio/summary", headers=h)
print("summary", r.status_code, r.json())

r = c.get("/api/portfolio/analytics", headers=h)
print("analytics", r.status_code, {k: r.json()[k] for k in ["volatility_pct", "sharpe_ratio", "max_drawdown_pct", "diversification_score"]} if r.status_code == 200 else r.text[:200])

r = c.post("/api/expenses", headers=h, json={"amount": 500, "category": "food", "description": "lunch", "payment_method": "upi", "expense_date": "2026-08-12"})
print("add expense", r.status_code)

r = c.get("/api/expenses/summary", headers=h)
print("expense summary", r.status_code, r.json().get("total_this_month"))

r = c.get("/api/financial-health", headers=h)
print("health", r.status_code, r.json().get("overall_score"))

r = c.post("/api/simulator", headers=h, json={"initial_investment": 100000, "monthly_contribution": 10000, "annual_return_pct": 10, "inflation_pct": 6, "years": 10})
print("simulator", r.status_code, r.json().get("estimated_final_value"))

r = c.post("/api/ai/chat", headers=h, json={"message": "How is my portfolio doing?"})
print("ai chat", r.status_code, r.json().get("mode"), r.json().get("reply", "")[:80])

r = c.get("/api/markets/quote/NIFTY%2050", headers=h)
print("market quote", r.status_code, r.json().get("price"))

r = c.get("/api/news", headers=h)
print("news", r.status_code, len(r.json()))

r = c.post("/api/auth/login", json={"email": "admin@finsight.app", "password": "admin1234"})
print("admin login", r.status_code)
ah = {"Authorization": f"Bearer {r.json()['access_token']}"}

r = c.get("/api/admin/analytics", headers=ah)
print("admin analytics", r.status_code, r.json().get("total_users"))

r = c.get("/api/admin/analytics", headers=h)
print("admin forbidden for normal user", r.status_code)

print("SMOKE TEST COMPLETE")
