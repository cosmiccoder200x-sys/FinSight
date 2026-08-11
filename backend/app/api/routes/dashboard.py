"""Dashboard endpoints: aggregated view of the user's financial data."""

from __future__ import annotations

import datetime as dt

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_profile, get_current_user
from app.db.session import get_db
from app.models import Expense, Holding, Transaction, User
from app.schemas import AITip, DashboardOut, RecentTransaction, TopHolding
from app.services import analytics as analytics_service
from app.services.ai_copilot import AICopilotService
from app.services.expenses_service import expense_summary
from app.services.market_data import MarketDataService

router = APIRouter(prefix="/api", tags=["dashboard"])


@router.get("/dashboard", response_model=DashboardOut)
def dashboard(
    user: User = Depends(get_current_user),
    profile=Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    market = MarketDataService(db)
    holdings = db.scalars(select(Holding).where(Holding.user_id == user.id)).all()
    enriched = analytics_service.enrich_holdings(holdings, market)
    summary = analytics_service.portfolio_summary(enriched)
    alloc = analytics_service.allocation(enriched)
    history = analytics_service.portfolio_history(holdings, market, days=182)

    net_worth = analytics_service.net_worth(enriched, profile)
    invested = summary["total_invested"]
    total_pnl = summary["total_pnl"]
    pnl_pct = summary["return_pct"]

    expenses = expense_summary(db, user.id)
    monthly_savings = None
    if profile.monthly_income and profile.monthly_income > 0:
        monthly_savings = round(float(profile.monthly_income) - expenses["total_this_month"], 2)

    recent_tx = db.scalars(
        select(Transaction).where(Transaction.user_id == user.id).order_by(Transaction.transaction_date.desc(), Transaction.created_at.desc()).limit(6)
    ).all()
    recent_transactions = [
        RecentTransaction(
            id=t.id,
            date=(t.transaction_date or t.created_at.date()).isoformat(),
            description=f"{'Bought' if t.action == 'buy' else 'Sold'} {t.symbol}",
            category=t.asset_type,
            amount=round(float(t.amount), 2),
        )
        for t in recent_tx
    ]

    top = sorted(enriched, key=lambda e: -e["current_value"])[:5]
    top_holdings = [
        TopHolding(symbol=e["symbol"], name=e["name"], value=round(e["current_value"], 2), pnl=round(e["pnl"], 2), weight=e["weight"])
        for e in top
    ]

    market_snapshot = []
    for idx in market.indices():
        market_snapshot.append(
            {"symbol": idx.get("symbol"), "name": idx.get("name"), "price": round(float(idx.get("price", 0)), 2), "change_pct": float(idx.get("change_pct", 0))}
        )

    # AI insight: prefer generated from data when possible.
    ai_insight = None
    if user.profile is not None or holdings or expenses["total_this_month"]:
        ai_insight = _build_insight(db, user, enriched, summary, expenses, market)

    return DashboardOut(
        net_worth=net_worth,
        invested=invested,
        total_pnl=total_pnl,
        pnl_pct=pnl_pct,
        monthly_savings=monthly_savings,
        portfolio_history=history,
        allocation=alloc["slices"],
        health_preview=analytics_service_health_preview(db, user.id),
        recent_transactions=recent_transactions,
        top_holdings=top_holdings,
        market_snapshot=market_snapshot,
        ai_insight=ai_insight,
        data_basis="simulated" if market.is_demo else "actual",
    )


def analytics_service_health_preview(db: Session, user_id: int) -> dict:
    from app.services.health import financial_health

    try:
        result = financial_health(db, user_id)
        return {"overall_score": result["overall_score"], "grade": result["grade"], "components": result["components"]}
    except Exception:
        return {"overall_score": 0, "grade": "-", "components": []}


def _build_insight(db: Session, user: User, enriched, summary, expenses, market) -> AITip:
    """Generate a short, data-grounded insight. Uses AI when configured."""
    from app.core.config import settings

    parts = []
    if summary["holdings_count"] > 0:
        top = sorted(enriched, key=lambda e: -e["current_value"])[0]
        parts.append(
            f"Your portfolio is {summary['return_pct']:+.1f}% overall "
            f"({summary['total_pnl']:+,.0f} INR). {top['name']} is your largest position "
            f"at {top['weight']:.1f}% of the portfolio."
        )
    if expenses["total_this_month"] > 0:
        cats = expenses["category_breakdown"]
        if cats:
            parts.append(
                f"This month you spent {expenses['total_this_month']:,.0f} INR; "
                f"{cats[0]['label']} is the largest category at {cats[0]['pct']:.0f}%."
            )
    if not parts:
        parts.append("Add holdings and expenses to unlock personalized insights.")
    text = " ".join(parts)

    generated = False
    basis = "local"
    if settings.ai_configured:
        try:
            ai = AICopilotService(db)
            response = ai.chat(user, "Give me a concise one-paragraph insight about my finances.", None)
            text = response["reply"].split("\n")[0]
            generated = True
            basis = "ai"
        except Exception:
            pass
    return AITip(text=text, generated=generated, basis=basis)
