"""Expense and budget models."""

from __future__ import annotations

import datetime as dt

from sqlalchemy import Date, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.user import TimestampMixin

EXPENSE_CATEGORIES = (
    "food",
    "transport",
    "shopping",
    "education",
    "bills",
    "entertainment",
    "health",
    "investment",
    "other",
)

PAYMENT_METHODS = ("upi", "card", "bank_transfer", "cash", "other")


class Expense(Base, TimestampMixin):
    __tablename__ = "expenses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    amount: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    category: Mapped[str] = mapped_column(String(30), nullable=False, default="other", index=True)
    description: Mapped[str] = mapped_column(Text, nullable=True, default="")
    payment_method: Mapped[str] = mapped_column(String(20), nullable=False, default="other")
    expense_date: Mapped[dt.date] = mapped_column(Date, nullable=False, index=True)

    user: Mapped["User"] = relationship(back_populates="expenses")


class Budget(Base, TimestampMixin):
    __tablename__ = "budgets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    category: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    monthly_limit: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    month: Mapped[str] = mapped_column(String(7), nullable=False, default="")  # YYYY-MM

    user: Mapped["User"] = relationship(back_populates="budgets")
