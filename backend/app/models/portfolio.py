"""Portfolio-related models: holdings, transactions, snapshots, goals."""

from __future__ import annotations

import datetime as dt

from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.user import TimestampMixin

ASSET_TYPES = ("stock", "etf", "mutual_fund", "crypto", "gold", "cash", "other")


class Holding(Base, TimestampMixin):
    __tablename__ = "holdings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    asset_type: Mapped[str] = mapped_column(String(30), nullable=False, default="stock", index=True)
    symbol: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    quantity: Mapped[float] = mapped_column(Numeric(18, 6), nullable=False, default=0)
    avg_buy_price: Mapped[float] = mapped_column(Numeric(18, 4), nullable=False, default=0)
    purchase_date: Mapped[dt.date | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str] = mapped_column(Text, nullable=True, default="")

    user: Mapped["User"] = relationship(back_populates="holdings")


class Transaction(Base, TimestampMixin):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    holding_id: Mapped[int | None] = mapped_column(
        ForeignKey("holdings.id", ondelete="SET NULL"), nullable=True, index=True
    )
    action: Mapped[str] = mapped_column(String(10), nullable=False, default="buy")  # buy | sell
    symbol: Mapped[str] = mapped_column(String(20), nullable=False, default="")
    asset_type: Mapped[str] = mapped_column(String(30), nullable=False, default="stock")
    quantity: Mapped[float] = mapped_column(Numeric(18, 6), nullable=False, default=0)
    price: Mapped[float] = mapped_column(Numeric(18, 4), nullable=False, default=0)
    amount: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False, default=0)
    transaction_date: Mapped[dt.date | None] = mapped_column(Date, nullable=True)

    user: Mapped["User"] = relationship(back_populates="transactions")


class PortfolioSnapshot(Base, TimestampMixin):
    __tablename__ = "portfolio_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    date: Mapped[dt.date] = mapped_column(Date, nullable=False, index=True)
    total_value: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False, default=0)
    invested: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False, default=0)

    user: Mapped["User"] = relationship(back_populates="snapshots")


class FinancialGoal(Base, TimestampMixin):
    __tablename__ = "financial_goals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    target_amount: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False, default=0)
    target_date: Mapped[dt.date | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str] = mapped_column(Text, nullable=True, default="")

    contributions: Mapped[list["GoalContribution"]] = relationship(
        back_populates="goal", cascade="all, delete-orphan"
    )


class GoalContribution(Base, TimestampMixin):
    __tablename__ = "goal_contributions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    goal_id: Mapped[int] = mapped_column(
        ForeignKey("financial_goals.id", ondelete="CASCADE"), nullable=False, index=True
    )
    amount: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False)
    contributed_at: Mapped[dt.date] = mapped_column(Date, nullable=False, default=dt.date.today)

    goal: Mapped[FinancialGoal] = relationship(back_populates="contributions")
