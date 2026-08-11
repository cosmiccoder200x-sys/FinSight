"""Portfolio analytics and financial calculations.

These functions perform standard, textbook financial math:

- invested value   = quantity × average buy price
- current value    = quantity × current market price
- absolute P&L     = current value − invested value
- percentage return = (current value / invested value − 1) × 100
- volatility       = annualized std dev of daily portfolio returns
- Sharpe ratio     = (annualized return − risk-free rate) / volatility
- max drawdown     = largest peak-to-trough decline in the value series
- diversification  = 1 − Herfindahl index of the weight distribution

Sources of data are kept explicit: current prices come from the configured
market-data provider (demo data is labelled `simulated`).
"""

from __future__ import annotations

import datetime as dt
import math

from app.core.config import settings
from app.services.market_data import MarketDataService

RISK_FREE_RATE = 0.06  # conservative stand-in for a risk-free annual return

COLORS = ["#10B981", "#34D399", "#6EE7B7", "#A7F3D0", "#F59E0B", "#3B82F6", "#A78BFA", "#F87171"]


def _f(value) -> float:
    """Safely cast Decimal/float/int to float."""
    if value is None:
        return 0.0
    return float(value)


def enrich_holdings(holdings, market: MarketDataService) -> list[dict]:
    """Attach live prices and computed metrics to each holding."""
    enriched = []
    for h in holdings:
        symbol = h.symbol.strip().upper()
        quantity = _f(h.quantity)
        avg_price = _f(h.avg_buy_price)
        try:
            quote = market.get_quote(symbol)
            current_price = _f(quote.get("price", 0))
            change = _f(quote.get("change", 0))
            is_demo = bool(quote.get("is_demo", True))
        except Exception:
            current_price = avg_price
            change = 0.0
            is_demo = True

        invested = quantity * avg_price
        current_value = quantity * current_price
        pnl = current_value - invested
        return_pct = (pnl / invested * 100) if invested > 0 else 0.0
        enriched.append(
            {
                "id": h.id,
                "asset_type": h.asset_type,
                "symbol": symbol,
                "name": h.name or market.name_for(symbol),
                "quantity": quantity,
                "avg_buy_price": avg_price,
                "purchase_date": h.purchase_date,
                "notes": h.notes or "",
                "current_price": current_price,
                "change": change,
                "invested": invested,
                "current_value": current_value,
                "pnl": pnl,
                "return_pct": round(return_pct, 2),
                "weight": 0.0,
                "is_demo": is_demo,
            }
        )
    total = sum(e["current_value"] for e in enriched)
    for e in enriched:
        e["weight"] = round((e["current_value"] / total * 100), 2) if total > 0 else 0.0
    return enriched


def portfolio_summary(enriched: list[dict]) -> dict:
    total_value = round(sum(e["current_value"] for e in enriched), 2)
    total_invested = round(sum(e["invested"] for e in enriched), 2)
    total_pnl = round(total_value - total_invested, 2)
    today_pnl = round(sum(e["current_value"] / e["current_price"] * e["change"] for e in enriched if e["current_price"]) , 2)
    return_pct = (total_pnl / total_invested * 100) if total_invested > 0 else 0.0
    return {
        "total_value": total_value,
        "total_invested": total_invested,
        "total_pnl": total_pnl,
        "today_pnl": today_pnl,
        "return_pct": round(return_pct, 2),
        "holdings_count": len(enriched),
        "is_demo": any(e["is_demo"] for e in enriched),
    }


def allocation(enriched: list[dict]) -> dict:
    by_type: dict[str, float] = {}
    for e in enriched:
        by_type[e["asset_type"]] = by_type.get(e["asset_type"], 0.0) + e["current_value"]
    total = sum(by_type.values())
    slices = []
    labels = {
        "stock": "Stocks",
        "etf": "ETFs",
        "mutual_fund": "Mutual Funds",
        "crypto": "Crypto",
        "gold": "Gold",
        "cash": "Cash",
        "other": "Other",
    }
    for i, (key, value) in enumerate(sorted(by_type.items(), key=lambda kv: -kv[1])):
        slices.append(
            {
                "name": labels.get(key, key.title()),
                "value": round(value, 2),
                "pct": round((value / total * 100), 2) if total > 0 else 0.0,
                "color": COLORS[i % len(COLORS)],
            }
        )
    return {"slices": slices, "total": round(total, 2)}


def portfolio_history(holdings, market: MarketDataService, days: int = 365) -> list[dict]:
    """Approximate daily portfolio value series.

    Uses provider price history for each holding (real or clearly-labelled
    simulated) scaled by quantity. Holdings are included from their purchase
    date onwards. Cash-type holdings contribute a flat value.
    """
    if not holdings:
        return []
    today = dt.date.today()
    start = today - dt.timedelta(days=days)
    series: dict[str, float] = {}

    for h in holdings:
        symbol = h.symbol.strip().upper()
        quantity = _f(h.quantity)
        purchase_date = h.purchase_date or start
        if h.asset_type == "cash":
            value = _f(h.avg_buy_price) * quantity
            d = max(purchase_date, start)
            while d <= today:
                series[d.isoformat()] = series.get(d.isoformat(), 0.0) + value
                d += dt.timedelta(days=1)
            continue
        try:
            points = market.get_history(symbol, "1Y")
        except Exception:
            continue
        for pt in points:
            try:
                d = dt.date.fromisoformat(pt["date"])
            except (ValueError, TypeError):
                continue
            if d < start or d > today or d < purchase_date:
                continue
            series[d.isoformat()] = series.get(d.isoformat(), 0.0) + quantity * _f(pt["price"])

    return [{"date": date_str, "price": round(value, 2)} for date_str, value in sorted(series.items())]


def portfolio_analytics(holdings, market: MarketDataService) -> dict:
    """Compute risk metrics from the portfolio value series."""
    history = portfolio_history(holdings, market, days=365)
    current_value = sum(_f(h.avg_buy_price if h.asset_type == "cash" else 0) for h in holdings) if not history else history[-1]["price"]

    volatility = 0.0
    sharpe = 0.0
    max_drawdown = 0.0

    if len(history) > 2:
        prices = [p["price"] for p in history]
        returns = [(prices[i] / prices[i - 1]) - 1 for i in range(1, len(prices)) if prices[i - 1] > 0]
        if returns:
            mean = sum(returns) / len(returns)
            variance = sum((r - mean) ** 2 for r in returns) / (len(returns) - 1)
            std = math.sqrt(variance)
            volatility = std * math.sqrt(252) * 100
            if std > 0:
                sharpe = ((1 + mean) ** 252 - 1 - RISK_FREE_RATE) / (std * math.sqrt(252))
            peak = prices[0]
            for p in prices:
                peak = max(peak, p)
                if peak > 0:
                    dd = (p - peak) / peak
                    max_drawdown = min(max_drawdown, dd)

    enriched = enrich_holdings(holdings, market)
    weights = [e["current_value"] for e in enriched]
    total = sum(weights)
    norm_weights = [w / total for w in weights] if total > 0 else []
    herfindahl = sum(w ** 2 for w in norm_weights) if norm_weights else 0.0
    effective_assets = 1 / herfindahl if herfindahl > 0 else 0.0
    diversification_score = round(max(0.0, min(100.0, (1 - herfindahl) * 100)), 1)

    invested = sum(e["invested"] for e in enriched)
    pnl = sum(e["pnl"] for e in enriched)
    return_pct = (pnl / invested * 100) if invested > 0 else 0.0

    return {
        "invested": round(invested, 2),
        "current_value": round(total, 2),
        "pnl": round(pnl, 2),
        "return_pct": round(return_pct, 2),
        "volatility_pct": round(volatility, 2),
        "sharpe_ratio": round(sharpe, 2),
        "max_drawdown_pct": round(max_drawdown * 100, 2),
        "diversification_score": diversification_score,
        "effective_assets": round(effective_assets, 1),
        "asset_concentration": [
            {"name": e["symbol"], "weight_pct": e["weight"]} for e in sorted(enriched, key=lambda x: -x["weight"])[:8]
        ],
        "data_basis": "simulated" if market.is_demo else "actual",
    }


def net_worth(enriched: list[dict], profile) -> float:
    """Net worth = current market value of all holdings + emergency fund buffer."""
    total = sum(e["current_value"] for e in enriched)
    emergency = _f(profile.emergency_fund) if profile else 0.0
    return round(total + emergency, 2)
