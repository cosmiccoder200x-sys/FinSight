"""Portfolio schemas."""

from __future__ import annotations

import datetime as dt

from pydantic import ConfigDict, BaseModel, Field


class HoldingCreate(BaseModel):
    asset_type: str = Field(min_length=1, max_length=30)
    symbol: str = Field(min_length=1, max_length=20)
    name: str = Field(default="", max_length=120)
    quantity: float = Field(gt=0)
    avg_buy_price: float = Field(ge=0)
    purchase_date: dt.date | None = None
    notes: str | None = Field(default="", max_length=500)


class HoldingUpdate(BaseModel):
    asset_type: str | None = Field(default=None, max_length=30)
    symbol: str | None = Field(default=None, max_length=20)
    name: str | None = Field(default=None, max_length=120)
    quantity: float | None = Field(default=None, gt=0)
    avg_buy_price: float | None = Field(default=None, ge=0)
    purchase_date: dt.date | None = None
    notes: str | None = Field(default=None, max_length=500)


class HoldingOut(BaseModel):
    id: int
    asset_type: str
    symbol: str
    name: str
    quantity: float
    avg_buy_price: float
    purchase_date: dt.date | None
    notes: str
    current_price: float = 0
    invested: float = 0
    current_value: float = 0
    pnl: float = 0
    return_pct: float = 0
    weight: float = 0
    is_demo: bool = False

    model_config = ConfigDict(from_attributes=True)


class HoldingDetail(HoldingOut):
    pass


class PortfolioSummary(BaseModel):
    total_value: float = 0
    total_invested: float = 0
    total_pnl: float = 0
    today_pnl: float = 0
    return_pct: float = 0
    holdings_count: int = 0
    is_demo: bool = False


class AllocationSlice(BaseModel):
    name: str
    value: float
    pct: float
    color: str


class AllocationOut(BaseModel):
    slices: list[AllocationSlice]
    total: float


class PortfolioAnalytics(BaseModel):
    invested: float = 0
    current_value: float = 0
    pnl: float = 0
    return_pct: float = 0
    volatility_pct: float = 0
    sharpe_ratio: float = 0
    max_drawdown_pct: float = 0
    diversification_score: float = 0
    asset_concentration: list[dict] = []
    monthly_returns: list[dict] = []
    data_basis: str = "simulated"  # actual | simulated


class WatchlistSymbolOut(BaseModel):
    id: int
    symbol: str

    model_config = ConfigDict(from_attributes=True)


class WatchlistAdd(BaseModel):
    symbol: str = Field(min_length=1, max_length=20)


class FinancialGoalCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    target_amount: float = Field(gt=0, le=1_000_000_000_000)
    target_date: dt.date | None = None
    notes: str | None = Field(default="", max_length=500)


class FinancialGoalUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    target_amount: float | None = Field(default=None, gt=0, le=1_000_000_000_000)
    target_date: dt.date | None = None
    notes: str | None = Field(default=None, max_length=500)


class GoalContributionCreate(BaseModel):
    amount: float = Field(gt=0, le=1_000_000_000_000)


class FinancialGoalOut(BaseModel):
    id: int
    name: str
    target_amount: float
    target_date: dt.date | None
    notes: str
    saved_amount: float
    remaining_amount: float
    progress_pct: float
    monthly_contribution: float | None

    model_config = ConfigDict(from_attributes=True)
