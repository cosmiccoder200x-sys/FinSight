"""Market, dashboard, health, simulator, AI, news, and admin schemas."""

from __future__ import annotations

import datetime as dt

from pydantic import ConfigDict, BaseModel, Field


# ---------------------------------------------------------------------------
# Market
# ---------------------------------------------------------------------------
class QuoteOut(BaseModel):
    symbol: str
    name: str
    price: float
    change: float
    change_pct: float
    market_cap: float | None = None
    pe_ratio: float | None = None
    fifty_two_week_high: float | None = None
    fifty_two_week_low: float | None = None
    currency: str = "INR"
    is_demo: bool = True
    source: str = "demo"


class HistoryPoint(BaseModel):
    date: str
    price: float


class StockDetail(BaseModel):
    quote: QuoteOut
    history: list[HistoryPoint]
    fundamentals: dict = {}
    is_demo: bool = True


class SearchResult(BaseModel):
    symbol: str
    name: str
    type: str = "stock"


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------
class KpiCard(BaseModel):
    label: str
    value: float
    display: str
    change: float | None = None


class RecentTransaction(BaseModel):
    id: int
    date: str
    description: str
    category: str
    amount: float


class TopHolding(BaseModel):
    symbol: str
    name: str
    value: float
    pnl: float
    weight: float


class MarketSnapshotItem(BaseModel):
    symbol: str
    name: str
    price: float
    change_pct: float


class AITip(BaseModel):
    text: str
    generated: bool = False
    basis: str = "local"


class DashboardOut(BaseModel):
    net_worth: float
    invested: float
    total_pnl: float
    pnl_pct: float
    monthly_savings: float | None = None
    portfolio_history: list[HistoryPoint]
    allocation: list[AllocationSliceShallow]
    health_preview: dict = {}
    recent_transactions: list[RecentTransaction]
    top_holdings: list[TopHolding]
    market_snapshot: list[MarketSnapshotItem]
    ai_insight: AITip | None = None
    data_basis: str = "simulated"


class AllocationSliceShallow(BaseModel):
    name: str
    value: float
    pct: float
    color: str


# ---------------------------------------------------------------------------
# Financial health
# ---------------------------------------------------------------------------
class HealthComponent(BaseModel):
    key: str
    label: str
    score: int
    explanation: str


class FinancialHealthOut(BaseModel):
    overall_score: int
    grade: str
    components: list[HealthComponent]
    summary: str
    data_basis: str = "actual"


# ---------------------------------------------------------------------------
# Simulator
# ---------------------------------------------------------------------------
class SimulateRequest(BaseModel):
    initial_investment: float = Field(default=0, ge=0)
    monthly_contribution: float = Field(default=0, ge=0)
    annual_return_pct: float = Field(ge=0, le=100)
    inflation_pct: float = Field(default=6, ge=0, le=30)
    years: int = Field(gt=0, le=60)
    scenario_name: str = Field(default="custom", max_length=40)


class YearPoint(BaseModel):
    year: int
    age: int | None = None
    contributed: float
    value: float
    gains: float
    real_value: float


class SimulateResponse(BaseModel):
    scenario_name: str
    total_contributions: float
    estimated_final_value: float
    estimated_gains: float
    inflation_adjusted_value: float
    years: int
    annual_return_pct: float
    inflation_pct: float
    chart: list[YearPoint]
    is_simulation: bool = True
    disclaimer: str = "This is a simulation based on historical average assumptions, not a prediction or financial advice."


# ---------------------------------------------------------------------------
# AI
# ---------------------------------------------------------------------------
class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    conversation_id: int | None = None


class ChatMessageOut(BaseModel):
    id: int
    role: str
    content: str
    created_at: dt.datetime


class ChatResponse(BaseModel):
    reply: str
    conversation_id: int
    model: str
    mode: str = "ai"  # ai | local
    sources: list[str] = []
    disclaimer: str = (
        "FinSight is an educational tool, not a licensed financial advisor. "
        "Information is provided for informational purposes only and does not constitute financial advice."
    )


class ConversationOut(BaseModel):
    id: int
    title: str
    messages: list[ChatMessageOut]

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# News
# ---------------------------------------------------------------------------
class NewsItem(BaseModel):
    id: str
    headline: str
    source: str
    published_at: str
    related_symbol: str | None = None
    sentiment: str = "neutral"  # positive | neutral | negative
    url: str | None = None
    is_demo: bool = True


# ---------------------------------------------------------------------------
# Admin
# ---------------------------------------------------------------------------
class AdminUserOut(BaseModel):
    id: int
    email: str
    full_name: str
    is_active: bool
    is_admin: bool
    created_at: dt.datetime
    last_login_at: dt.datetime | None = None
    holdings_count: int = 0
    expenses_count: int = 0


class AdminAnalyticsOut(BaseModel):
    total_users: int
    active_users: int
    total_holdings: int
    total_expenses: int
    total_ai_requests: int
    total_simulations: int
    new_users_7d: int
    demo_mode: bool
    provider: str
    recent_registrations: list[AdminUserOut] = []
