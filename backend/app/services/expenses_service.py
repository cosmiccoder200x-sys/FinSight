"""Expense analytics service."""

from __future__ import annotations

import calendar
import datetime as dt
from collections import defaultdict

from sqlalchemy import extract, select
from sqlalchemy.orm import Session

from app.models import Budget, Expense, Profile

CATEGORY_LABELS = {
    "food": "Food",
    "transport": "Transport",
    "shopping": "Shopping",
    "education": "Education",
    "bills": "Bills",
    "entertainment": "Entertainment",
    "health": "Health",
    "investment": "Investment",
    "other": "Other",
}


def _month_bounds(year: int, month: int) -> tuple[dt.date, dt.date]:
    last = calendar.monthrange(year, month)[1]
    return dt.date(year, month, 1), dt.date(year, month, last)


def expense_summary(db: Session, user_id: int) -> dict:
    today = dt.date.today()
    this_start, this_end = _month_bounds(today.year, today.month)
    prev = today.month - 1 or 12
    prev_year = today.year - 1 if today.month == 1 else today.year
    last_start, last_end = _month_bounds(prev_year, prev)

    rows = db.scalars(select(Expense).where(Expense.user_id == user_id)).all()

    this_month = [r for r in rows if this_start <= r.expense_date <= this_end]
    last_month = [r for r in rows if last_start <= r.expense_date <= last_end]
    total_this = sum(float(r.amount) for r in this_month)
    total_last = sum(float(r.amount) for r in last_month)

    # Category breakdown (this month)
    cat_totals: dict[str, float] = defaultdict(float)
    for r in this_month:
        cat_totals[r.category] += float(r.amount)
    category_breakdown = [
        {
            "category": c,
            "label": CATEGORY_LABELS.get(c, c.title()),
            "amount": round(a, 2),
            "pct": round((a / total_this * 100), 1) if total_this > 0 else 0.0,
        }
        for c, a in sorted(cat_totals.items(), key=lambda kv: -kv[1])
    ]

    # Daily spending this month
    daily: dict[str, float] = defaultdict(float)
    for r in this_month:
        daily[r.expense_date.isoformat()] += float(r.amount)
    daily_spending = [{"date": d, "amount": round(a, 2)} for d, a in sorted(daily.items())]

    # Monthly totals (last 6 months, including current)
    monthly_map: dict[str, float] = defaultdict(float)
    for r in rows:
        key = f"{r.expense_date.year:04d}-{r.expense_date.month:02d}"
        monthly_map[key] += float(r.amount)
    last_six = []
    y, m = today.year, today.month
    for _ in range(6):
        key = f"{y:04d}-{m:02d}"
        last_six.append({"month": key, "amount": round(monthly_map.get(key, 0.0), 2)})
        m -= 1
        if m == 0:
            m, y = 12, y - 1
    last_six.reverse()
    month_totals = [v for v in monthly_map.values() if v > 0]
    monthly_avg = sum(month_totals) / len(month_totals) if month_totals else 0.0

    day_number = today.day
    daily_avg = total_this / day_number if day_number > 0 else 0.0

    # Savings rate
    profile = db.scalar(select(Profile).where(Profile.user_id == user_id))
    income = float(profile.monthly_income) if profile else 0.0
    savings_rate = None
    if income > 0:
        savings_rate = round((income - total_this) / income * 100, 1)

    # Budget vs actual
    budgets = db.scalars(select(Budget).where(Budget.user_id == user_id)).all()
    this_month_key = today.strftime("%Y-%m")
    budget_status = []
    for b in budgets:
        if b.month and b.month != this_month_key:
            continue
        actual = cat_totals.get(b.category, 0.0)
        limit = float(b.monthly_limit)
        budget_status.append(
            {
                "category": b.category,
                "label": CATEGORY_LABELS.get(b.category, b.category.title()),
                "budget": round(limit, 2),
                "actual": round(actual, 2),
                "remaining": round(limit - actual, 2),
                "pct_used": round((actual / limit * 100), 1) if limit > 0 else 0.0,
            }
        )

    return {
        "total_this_month": round(total_this, 2),
        "total_last_month": round(total_last, 2),
        "monthly_avg": round(monthly_avg, 2),
        "daily_avg": round(daily_avg, 2),
        "savings_rate": savings_rate,
        "category_breakdown": category_breakdown,
        "daily_spending": daily_spending,
        "monthly_totals": last_six,
        "budget_status": budget_status,
        "data_basis": "actual",
    }
