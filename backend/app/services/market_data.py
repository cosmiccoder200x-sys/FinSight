"""Market data service abstraction.

The application is NOT coupled to a single provider. A `MarketDataProvider`
interface is implemented by:

- `DemoMarketProvider`  — deterministic, clearly-labeled simulated data. Works offline.
- `FinnhubProvider`     — real market data when a Finnhub API key is configured.

The `MarketDataService` facade selects the configured provider and caches
responses in the `market_cache` table to limit external API calls.
"""

from __future__ import annotations

import datetime as dt
import hashlib
import math
import random
from abc import ABC, abstractmethod
from typing import Any

import httpx

from app.core.config import settings


# ---------------------------------------------------------------------------
# Symbol catalog (names only; prices are always simulated unless a real provider
# is configured). Used for demo search + readable names.
# ---------------------------------------------------------------------------
SYMBOL_CATALOG: dict[str, dict[str, str]] = {
    # Indian indices
    "NIFTY 50": {"name": "NIFTY 50 Index", "type": "index", "currency": "INR", "base": 24500},
    "SENSEX": {"name": "BSE SENSEX", "type": "index", "currency": "INR", "base": 80500},
    "NASDAQ": {"name": "NASDAQ Composite", "type": "index", "currency": "USD", "base": 18200},
    "S&P 500": {"name": "S&P 500", "type": "index", "currency": "USD", "base": 6050},
    # Indian stocks
    "RELIANCE": {"name": "Reliance Industries", "type": "stock", "currency": "INR", "base": 2950},
    "TCS": {"name": "Tata Consultancy Services", "type": "stock", "currency": "INR", "base": 4050},
    "HDFCBANK": {"name": "HDFC Bank", "type": "stock", "currency": "INR", "base": 1650},
    "INFY": {"name": "Infosys", "type": "stock", "currency": "INR", "base": 1890},
    "TATASTEEL": {"name": "Tata Steel", "type": "stock", "currency": "INR", "base": 160},
    "ITC": {"name": "ITC Limited", "type": "stock", "currency": "INR", "base": 460},
    "HINDUNILVR": {"name": "Hindustan Unilever", "type": "stock", "currency": "INR", "base": 2400},
    "ICICIBANK": {"name": "ICICI Bank", "type": "stock", "currency": "INR", "base": 1250},
    "SBIN": {"name": "State Bank of India", "type": "stock", "currency": "INR", "base": 820},
    "TATAMOTORS": {"name": "Tata Motors", "type": "stock", "currency": "INR", "base": 980},
    "BHARTIARTL": {"name": "Bharti Airtel", "type": "stock", "currency": "INR", "base": 1580},
    "WIPRO": {"name": "Wipro", "type": "stock", "currency": "INR", "base": 550},
    "LT": {"name": "Larsen & Toubro", "type": "stock", "currency": "INR", "base": 3700},
    # US stocks
    "AAPL": {"name": "Apple Inc.", "type": "stock", "currency": "USD", "base": 245},
    "MSFT": {"name": "Microsoft Corporation", "type": "stock", "currency": "USD", "base": 450},
    "TSLA": {"name": "Tesla Inc.", "type": "stock", "currency": "USD", "base": 420},
    "GOOGL": {"name": "Alphabet Inc.", "type": "stock", "currency": "USD", "base": 195},
    "AMZN": {"name": "Amazon.com Inc.", "type": "stock", "currency": "USD", "base": 225},
    "NVDA": {"name": "NVIDIA Corporation", "type": "stock", "currency": "USD", "base": 135},
    # Crypto
    "BTC": {"name": "Bitcoin", "type": "crypto", "currency": "USD", "base": 95000},
    "ETH": {"name": "Ethereum", "type": "crypto", "currency": "USD", "base": 3300},
    "SOL": {"name": "Solana", "type": "crypto", "currency": "USD", "base": 210},
    # ETFs / funds
    "NIFTYBEES": {"name": "Nippon India ETF Nifty 50", "type": "etf", "currency": "INR", "base": 250},
    "GOLDBEES": {"name": "Gold ETF", "type": "etf", "currency": "INR", "base": 62},
    "SGB": {"name": "Sovereign Gold Bond", "type": "etf", "currency": "INR", "base": 6800},
    "MF-DEBT": {"name": "Debt Mutual Fund (Demo)", "type": "mutual_fund", "currency": "INR", "base": 100},
}

PERIOD_DAYS = {"1D": 1, "1W": 7, "1M": 30, "3M": 90, "6M": 182, "1Y": 365, "5Y": 1825, "ALL": 1825}


def _seed_for(text: str) -> int:
    return int(hashlib.sha256(text.encode("utf-8")).hexdigest(), 16) % (2**32)


class MarketDataProvider(ABC):
    """Interface implemented by every market-data provider."""

    name: str = "base"

    @abstractmethod
    def get_quote(self, symbol: str) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def get_history(self, symbol: str, period: str = "1M") -> list[dict[str, Any]]:
        raise NotImplementedError

    @abstractmethod
    def get_company_profile(self, symbol: str) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def get_fundamentals(self, symbol: str) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def search(self, query: str, limit: int = 8) -> list[dict[str, Any]]:
        raise NotImplementedError


def _catalog_entry(symbol: str) -> dict[str, str]:
    entry = SYMBOL_CATALOG.get(symbol.upper())
    if entry:
        return entry
    return {
        "name": symbol.upper(),
        "type": "stock",
        "currency": "INR",
        "base": 100,
    }


class DemoMarketProvider(MarketDataProvider):
    """Deterministic simulated market data.

    Prices are generated from a seed derived from the symbol, so a symbol
    always produces the same series (stable across requests and restarts).
    This data is SIMULATED and is always labelled as such.
    """

    name = "demo"

    def _series(self, symbol: str, points: int = 260) -> list[float]:
        rng = random.Random(_seed_for(f"{symbol}:series"))
        entry = _catalog_entry(symbol)
        base = float(entry["base"])
        drift = rng.uniform(-0.0002, 0.0006)
        vol = rng.uniform(0.008, 0.03)
        start = base / math.exp(drift * points)
        values: list[float] = []
        price = start
        for _ in range(points):
            ret = rng.gauss(drift, vol)
            price *= math.exp(ret)
            values.append(price)
        # Scale so the final value equals the catalog base price.
        scale = base / values[-1]
        return [round(v * scale, 2) for v in values]

    def _intraday(self, symbol: str) -> list[float]:
        """Simulated intraday ticks (1D view)."""
        rng = random.Random(_seed_for(f"{symbol}:intraday"))
        entry = _catalog_entry(symbol)
        base = float(entry["base"])
        vals = [base * (1 + rng.uniform(-0.01, 0.01))]
        for _ in range(60):
            vals.append(vals[-1] * (1 + rng.gauss(0, 0.002)))
        return [round(v, 2) for v in vals]

    def get_quote(self, symbol: str) -> dict[str, Any]:
        entry = _catalog_entry(symbol)
        series = self._series(symbol)
        price = float(entry["base"])
        prev = series[-2] if len(series) > 1 else price
        change = round(price - prev, 2)
        change_pct = round((change / prev) * 100, 2) if prev else 0
        high52 = max(series)
        low52 = min(series)
        return {
            "symbol": symbol.upper(),
            "name": entry["name"],
            "price": round(price, 2),
            "change": change,
            "change_pct": change_pct,
            "market_cap": _demo_market_cap(symbol, price),
            "pe_ratio": _demo_pe(symbol),
            "fifty_two_week_high": round(high52, 2),
            "fifty_two_week_low": round(low52, 2),
            "currency": entry["currency"],
            "type": entry["type"],
            "is_demo": True,
            "source": "demo",
        }

    def get_history(self, symbol: str, period: str = "1M") -> list[dict[str, Any]]:
        entry = _catalog_entry(symbol)
        today = dt.date.today()
        if period == "1D":
            vals = self._intraday(symbol)
            start = today
            return [{"date": (start - dt.timedelta(minutes=int(i * 10))).isoformat(), "price": v} for i, v in enumerate(vals)][::-1]
        days = PERIOD_DAYS.get(period.upper(), PERIOD_DAYS["1M"])
        series = self._series(symbol, max(days, 60))
        n = min(days, len(series))
        points = series[-n:]
        return [{"date": (today - dt.timedelta(days=n - 1 - i)).isoformat(), "price": v} for i, v in enumerate(points)]

    def get_company_profile(self, symbol: str) -> dict[str, Any]:
        entry = _catalog_entry(symbol)
        return {
            "symbol": symbol.upper(),
            "name": entry["name"],
            "type": entry["type"],
            "currency": entry["currency"],
            "exchange": "NSE" if entry["currency"] == "INR" else "NASDAQ",
            "country": "India" if entry["currency"] == "INR" else "United States",
            "is_demo": True,
        }

    def get_fundamentals(self, symbol: str) -> dict[str, Any]:
        entry = _catalog_entry(symbol)
        rng = random.Random(_seed_for(f"{symbol}:fundamentals"))
        return {
            "pe_ratio": round(rng.uniform(8, 60), 1),
            "eps": round(rng.uniform(5, 500), 2),
            "dividend_yield": round(rng.uniform(0, 3.5), 2),
            "beta": round(rng.uniform(0.5, 2.0), 2),
            "market_cap": _demo_market_cap(symbol, float(entry["base"])),
            "52w_high": max(self._series(symbol)),
            "52w_low": min(self._series(symbol)),
            "sector": entry["type"],
            "is_demo": True,
        }

    def search(self, query: str, limit: int = 8) -> list[dict[str, Any]]:
        q = query.strip().upper()
        if not q:
            return []
        results = []
        for symbol, entry in SYMBOL_CATALOG.items():
            if q in symbol or q in entry["name"].upper():
                results.append({"symbol": symbol, "name": entry["name"], "type": entry["type"]})
                if len(results) >= limit:
                    break
        return results

    def indices(self) -> list[dict[str, Any]]:
        return [self.get_quote(s) for s in ("NIFTY 50", "SENSEX", "NASDAQ", "S&P 500")]


def _demo_market_cap(symbol: str, price: float) -> float:
    rng = random.Random(_seed_for(f"{symbol}:cap"))
    shares = rng.uniform(1e8, 8e9)
    return round(price * shares, 0)


def _demo_pe(symbol: str) -> float:
    rng = random.Random(_seed_for(f"{symbol}:pe"))
    return round(rng.uniform(8, 60), 1)


class FinnhubProvider(MarketDataProvider):
    """Real market data via the Finnhub REST API (free tier)."""

    name = "finnhub"
    base_url = "https://finnhub.io/api/v1"

    def __init__(self) -> None:
        self.api_key = settings.FINNHUB_API_KEY

    def _headers(self) -> dict[str, str]:
        return {"X-Finnhub-Token": self.api_key}

    def _get(self, path: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
        resp = httpx.get(f"{self.base_url}{path}", params=params or {}, headers=self._headers(), timeout=10)
        resp.raise_for_status()
        return resp.json()

    def get_quote(self, symbol: str) -> dict[str, Any]:
        q = self._get("/quote", {"symbol": symbol})
        return {
            "symbol": symbol.upper(),
            "name": symbol.upper(),
            "price": q.get("c", 0),
            "change": q.get("d", 0),
            "change_pct": q.get("dp", 0),
            "fifty_two_week_high": q.get("h"),
            "fifty_two_week_low": q.get("l"),
            "is_demo": False,
            "source": "finnhub",
        }

    def get_history(self, symbol: str, period: str = "1M") -> list[dict[str, Any]]:
        days = PERIOD_DAYS.get(period.upper(), PERIOD_DAYS["1M"])
        today = dt.date.today()
        start = today - dt.timedelta(days=max(days, 60) + 30)
        data = self._get("/stock/candle", {
            "symbol": symbol,
            "resolution": "D",
            "from": int(start.strftime("%s")),
            "to": int(today.strftime("%s")),
        })
        points = []
        if data.get("status") == "ok":
            for t, close in zip(data["t"], data["c"]):
                points.append({"date": dt.datetime.utcfromtimestamp(t).date().isoformat(), "price": close})
        return points[-days:]

    def get_company_profile(self, symbol: str) -> dict[str, Any]:
        p = self._get("/stock/profile2", {"symbol": symbol})
        return {
            "symbol": symbol.upper(),
            "name": p.get("name", symbol.upper()),
            "type": "stock",
            "currency": p.get("currency", "USD"),
            "exchange": p.get("exchange"),
            "country": p.get("country"),
            "is_demo": False,
        }

    def get_fundamentals(self, symbol: str) -> dict[str, Any]:
        q = self.get_quote(symbol)
        return {"pe_ratio": q.get("pe_ratio"), "is_demo": False}

    def search(self, query: str, limit: int = 8) -> list[dict[str, Any]]:
        r = self._get("/search", {"q": query, "exchange": "NSE"})
        out = []
        for item in r.get("result", [])[:limit]:
            if item.get("type") in ("Common Stock", "ETF", "INDEX"):
                out.append({"symbol": item["symbol"], "name": item.get("description", item["symbol"]), "type": item.get("type", "stock")})
        return out

    def indices(self) -> list[dict[str, Any]]:
        return [self.get_quote(s) for s in ("NIFTY 50", "SENSEX", "NASDAQ", "S&P 500")]


class MarketDataService:
    """Facade over market-data providers with a small DB cache."""

    def __init__(self, db) -> None:
        self.db = db
        self.provider: MarketDataProvider = self._build_provider()

    def _build_provider(self) -> MarketDataProvider:
        provider_name = settings.MARKET_DATA_PROVIDER.lower()
        if provider_name == "finnhub" and settings.FINNHUB_API_KEY:
            return FinnhubProvider()
        return DemoMarketProvider()

    @property
    def is_demo(self) -> bool:
        return isinstance(self.provider, DemoMarketProvider)

    def _cache_get(self, symbol: str, kind: str):
        from app.models import MarketCache

        cached = self.db.query(MarketCache).filter_by(symbol=symbol, kind=kind).order_by(MarketCache.fetched_at.desc()).first()
        if cached:
            age = dt.datetime.now(dt.timezone.utc) - (cached.fetched_at if cached.fetched_at.tzinfo else cached.fetched_at.replace(tzinfo=dt.timezone.utc))
            if age < dt.timedelta(hours=2):
                return cached.payload
        return None

    def _cache_set(self, symbol: str, kind: str, payload: Any) -> None:
        from app.models import MarketCache

        self.db.add(MarketCache(symbol=symbol, kind=kind, payload=payload, fetched_at=dt.datetime.now(dt.timezone.utc)))
        self.db.commit()

    def get_quote(self, symbol: str) -> dict[str, Any]:
        key = symbol.upper()
        cached = self._cache_get(key, "quote")
        if cached:
            return cached
        try:
            quote = self.provider.get_quote(key)
        except Exception:
            quote = DemoMarketProvider().get_quote(key)
        self._cache_set(key, "quote", quote)
        return quote

    def get_history(self, symbol: str, period: str = "1M") -> list[dict[str, Any]]:
        key = symbol.upper()
        cached = self._cache_get(key, f"history:{period}")
        if cached:
            return cached
        try:
            history = self.provider.get_history(key, period)
        except Exception:
            history = DemoMarketProvider().get_history(key, period)
        self._cache_set(key, f"history:{period}", history)
        return history

    def get_company_profile(self, symbol: str) -> dict[str, Any]:
        key = symbol.upper()
        try:
            return self.provider.get_company_profile(key)
        except Exception:
            return DemoMarketProvider().get_company_profile(key)

    def get_fundamentals(self, symbol: str) -> dict[str, Any]:
        key = symbol.upper()
        try:
            return self.provider.get_fundamentals(key)
        except Exception:
            return DemoMarketProvider().get_fundamentals(key)

    def search(self, query: str, limit: int = 8) -> list[dict[str, Any]]:
        return self.provider.search(query, limit)

    def indices(self) -> list[dict[str, Any]]:
        return self.provider.indices()

    def name_for(self, symbol: str) -> str:
        entry = SYMBOL_CATALOG.get(symbol.upper())
        if entry:
            return entry["name"]
        profile = self.get_company_profile(symbol)
        return profile.get("name", symbol.upper())
