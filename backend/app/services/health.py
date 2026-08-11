"""Financial health scoring engine.

Each component produces a 0-100 score from user-entered data and actual
expense records. Scores are educational heuristics, not a diagnosis.
"""

from __future__ import annotations

import datetime as dt
import statistics

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Expense, Holding, Profile


def _clamp(score: float) -> int:
    return int(max(0.0, min(100.0, round(score))))


def _monthly_expenses(db: Session, user_id: int, months: int = 3) -> float:
    today = dt.date.today()
    start = dt.date(today.year, today.month, 1)
    for _ in range(months - 1):
        if start.month == 1:
            start = dt.date(start.year - 1, 12, 1)
        else:
            start = dt.date(start.year, start.month - 1, 1)
    rows = db.scalars(select(Expense).where(Expense.user_id == user_id, Expense.expense_date >= start)).all()
    return sum(float(r.amount) for r in rows) / months


def financial_health(db: Session, user_id: int) -> dict:
    profile = db.scalar(select(Profile).where(Profile.user_id == user_id))
    income = float(profile.monthly_income) if profile else 0.0
    debt = float(profile.monthly_debt_payments) if profile else 0.0
    emergency = float(profile.emergency_fund) if profile else 0.0
    avg_monthly_expenses = _monthly_expenses(db, user_id)

    components: list[dict] = []

    # 1. Savings rate
    if income > 0:
        savings_rate = (income - avg_monthly_expenses) / income
    else:
        savings_rate = 0.0
    savings_score = _clamp(savings_rate * 150)  # ~66% savings => 100
    if savings_rate <= 0:
        savings_score = 0
    components.append(
        {
            "key": "savings",
            "label": "Savings",
            "score": savings_score,
            "explanation": (
                f"You keep {savings_rate * 100:.1f}% of your monthly income. "
                "Aim to save at least 20% of income for long-term goals."
                if income > 0
                else "Add your monthly income in Settings to score savings."
            ),
        }
    )

    # 2. Emergency fund
    if avg_monthly_expenses > 0:
        months_covered = emergency / avg_monthly_expenses
    else:
        months_covered = 12 if emergency > 0 else 0
    emergency_score = _clamp(months_covered / 6 * 100)
    components.append(
        {
            "key": "emergency_fund",
            "label": "Emergency Fund",
            "score": emergency_score,
            "explanation": (
                f"Your emergency fund covers about {months_covered:.1f} months of expenses. "
                "A 3-6 month buffer is a common target."
                if avg_monthly_expenses > 0
                else "No monthly expenses recorded yet; add expenses to measure your buffer."
            ),
        }
    )

    # 3. Debt burden
    debt_ratio = (debt / income) if income > 0 else 0.0
    debt_score = _clamp(100 - debt_ratio * 277.8)  # 36% ratio => ~0
    components.append(
        {
            "key": "debt",
            "label": "Debt",
            "score": debt_score,
            "explanation": (
                f"Debt payments consume {debt_ratio * 100:.1f}% of income. "
                "Keeping debt under 36% of income is a common guideline."
                if income > 0
                else "Add your monthly income in Settings to score debt."
            ),
        }
    )

    # 4. Investment allocation (invested vs net worth) — derived from holdings
    from app.services.analytics import enrich_holdings
    from app.services.market_data import MarketDataService

    holdings = db.execute(select(Holding).where(Holding.user_id == user_id)).scalars().all()
    market = MarketDataService(db)
    enriched = enrich_holdings(holdings, market) if holdings else []
    invested = sum(e["invested"] for e in enriched)
    current = sum(e["current_value"] for e in enriched)
    net_worth_total = current + emergency
    alloc_ratio = invested / net_worth_total if net_worth_total > 0 else 0.0
    alloc_score = _clamp(alloc_ratio / 0.4 * 100)
    components.append(
        {
            "key": "investments",
            "label": "Investments",
            "score": alloc_score,
            "explanation": (
                f"Invested amount is {alloc_ratio * 100:.1f}% of your net worth. "
                "Gradually increasing this is a common long-term strategy."
            ),
        }
    )

    # 5. Cash flow
    buffer = income - avg_monthly_expenses - debt
    buffer_ratio = buffer / income if income > 0 else 0.0
    cashflow_score = _clamp(buffer_ratio / 0.2 * 100)
    components.append(
        {
            "key": "cashflow",
            "label": "Cash Flow",
            "score": cashflow_score,
            "explanation": (
                f"After expenses and debt you keep about ₹{buffer:,.0f} monthly. "
                "Positive cash flow each month is the foundation of saving."
                if income > 0
                else "Add your monthly income in Settings to score cash flow."
            ),
        }
    )

    # 6. Expense consistency
    today = dt.date.today()
    rows = db.scalars(select(Expense).where(Expense.user_id == user_id)).all()
    monthly: dict[str, float] = {}
    for r in rows:
        key = f"{r.expense_date.year}-{r.expense_date.month:02d}"
        monthly[key] = monthly.get(key, 0.0) + float(r.amount)
    totals = [v for v in monthly.values() if v > 0]
    consistency_score = 100
    mean = 0.0
    cv = 0.0
    if len(totals) >= 2:
        mean = statistics.mean(totals)
        if mean > 0:
            cv = statistics.stdev(totals) / mean
            consistency_score = _clamp(100 - cv * 200)
    components.append(
        {
            "key": "consistency",
            "label": "Expense Consistency",
            "score": consistency_score,
            "explanation": (
                f"Your monthly spending varies by a coefficient of {cv * 100:.0f}%. "
                "Lower variability makes budgeting easier."
                if mean > 0
                else "Add more monthly expense history to score consistency."
            ),
        }
    )

    weights = {
        "savings": 0.20,
        "emergency_fund": 0.20,
        "debt": 0.20,
        "investments": 0.15,
        "cashflow": 0.15,
        "consistency": 0.10,
    }
    overall = sum(c["score"] * weights[c["key"]] for c in components)
    overall_score = _clamp(overall)
    if overall_score >= 80:
        grade = "A"
    elif overall_score >= 65:
        grade = "B"
    elif overall_score >= 50:
        grade = "C"
    elif overall_score >= 35:
        grade = "D"
    else:
        grade = "E"

    summary = _build_summary(overall_score, components)
    return {
        "overall_score": overall_score,
        "grade": grade,
        "components": components,
        "summary": summary,
        "data_basis": "actual",
    }


def _build_summary(score: int, components: list[dict]) -> str:
    weakest = min(components, key=lambda c: c["score"])
    strongest = max(components, key=lambda c: c["score"])
    if score >= 75:
        return (
            f"Your financial foundation looks solid. {strongest['label']} is a strength "
            f"({strongest['score']}/100). Keep building momentum in {weakest['label']}."
        )
    if score >= 50:
        return (
            f"Your finances are on a reasonable track. Focus on improving {weakest['label']} "
            f"({weakest['score']}/100) — small monthly habits add up over time."
        )
    return (
        f"Getting started is the hardest part. Start with {weakest['label']} "
        f"({weakest['score']}/100) and build from there. This is educational guidance, "
        "not financial advice."
    )
