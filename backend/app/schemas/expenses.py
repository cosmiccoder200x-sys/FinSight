"""Expense and budget schemas."""

from __future__ import annotations

import datetime as dt

from pydantic import ConfigDict, BaseModel, Field


class ExpenseCreate(BaseModel):
    amount: float = Field(gt=0)
    category: str = Field(min_length=1, max_length=30)
    description: str | None = Field(default="", max_length=500)
    payment_method: str = Field(default="other", max_length=20)
    expense_date: dt.date = Field(default_factory=dt.date.today)


class ExpenseUpdate(BaseModel):
    amount: float | None = Field(default=None, gt=0)
    category: str | None = Field(default=None, max_length=30)
    description: str | None = Field(default=None, max_length=500)
    payment_method: str | None = Field(default=None, max_length=20)
    expense_date: dt.date | None = None


class ExpenseOut(BaseModel):
    id: int
    amount: float
    category: str
    description: str
    payment_method: str
    expense_date: dt.date

    model_config = ConfigDict(from_attributes=True)


class ExpenseSummary(BaseModel):
    total_this_month: float = 0
    total_last_month: float = 0
    monthly_avg: float = 0
    daily_avg: float = 0
    savings_rate: float | None = None
    category_breakdown: list[dict] = []
    daily_spending: list[dict] = []
    monthly_totals: list[dict] = []
    budget_status: list[dict] = []
    data_basis: str = "actual"


class BudgetOut(BaseModel):
    id: int
    category: str
    monthly_limit: float
    month: str

    model_config = ConfigDict(from_attributes=True)


class BudgetCreate(BaseModel):
    category: str = Field(min_length=1, max_length=30)
    monthly_limit: float = Field(gt=0)
    month: str = Field(min_length=7, max_length=7)
