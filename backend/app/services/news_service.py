"""News service abstraction.

`DemoNewsProvider` returns clearly-labelled sample headlines so the product is
fully usable without external keys. `NewsAPIProvider` uses NewsAPI.org when a
key is configured. Results are cached in the `news_cache` table.
"""

from __future__ import annotations

import datetime as dt
import random
from abc import ABC, abstractmethod
from typing import Any

import httpx

from app.core.config import settings

DEMO_HEADLINES: list[dict[str, str]] = [
    {"headline": "Markets edge higher as IT stocks lead the rally", "source": "FinSight Markets (Demo)", "symbol": "INFY", "sentiment": "positive"},
    {"headline": "RBI keeps rates steady, focus shifts to inflation data", "source": "FinSight News (Demo)", "symbol": "NIFTY 50", "sentiment": "neutral"},
    {"headline": "Gold prices firm on safe-haven demand", "source": "FinSight Commodities (Demo)", "symbol": "GOLDBEES", "sentiment": "positive"},
    {"headline": "Global tech stocks see a mild pullback", "source": "FinSight Global (Demo)", "symbol": "NASDAQ", "sentiment": "negative"},
    {"headline": "Banks rally on strong credit growth expectations", "source": "FinSight Banking (Demo)", "symbol": "HDFCBANK", "sentiment": "positive"},
    {"headline": "Oil prices cool, easing near-term inflation concerns", "source": "FinSight Energy (Demo)", "symbol": None, "sentiment": "neutral"},
    {"headline": "Crypto market consolidates after volatile week", "source": "FinSight Crypto (Demo)", "symbol": "BTC", "sentiment": "neutral"},
    {"headline": "Rupee trades range-bound against the dollar", "source": "FinSight FX (Demo)", "symbol": None, "sentiment": "neutral"},
    {"headline": "Mutual fund SIP inflows hit a fresh monthly record", "source": "FinSight Funds (Demo)", "symbol": "NIFTYBEES", "sentiment": "positive"},
    {"headline": "Analysts flag rich valuations in large-cap IT", "source": "FinSight Research (Demo)", "symbol": "TCS", "sentiment": "negative"},
]


class NewsProvider(ABC):
    name = "base"

    @abstractmethod
    def get_news(self, limit: int = 20) -> list[dict[str, Any]]:
        raise NotImplementedError


class DemoNewsProvider(NewsProvider):
    """Deterministic sample headlines, always labelled as demo."""

    name = "demo"

    def get_news(self, limit: int = 20) -> list[dict[str, Any]]:
        rng = random.Random(20240812)
        now = dt.datetime.now(dt.timezone.utc)
        items = []
        for i, h in enumerate(DEMO_HEADLINES):
            items.append(
                {
                    "id": f"demo-{i}",
                    "headline": h["headline"],
                    "source": h["source"],
                    "published_at": (now - dt.timedelta(hours=i * 5)).isoformat(),
                    "related_symbol": h.get("symbol"),
                    "sentiment": h["sentiment"],
                    "url": None,
                    "is_demo": True,
                }
            )
        return items[:limit]


class NewsAPIProvider(NewsProvider):
    """Real news via NewsAPI.org. Requires NEWSAPI_KEY."""

    name = "newsapi"
    url = "https://newsapi.org/v2/top-headlines"

    def get_news(self, limit: int = 20) -> list[dict[str, Any]]:
        resp = httpx.get(
            self.url,
            params={"category": "business", "country": "in", "pageSize": limit, "apiKey": settings.NEWSAPI_KEY},
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        items = []
        for i, a in enumerate(data.get("articles", [])[:limit]):
            title = a.get("title") or ""
            source_name = (a.get("source") or {}).get("name", "News")
            items.append(
                {
                    "id": f"news-{i}",
                    "headline": title,
                    "source": source_name,
                    "published_at": a.get("publishedAt"),
                    "related_symbol": _infer_symbol(title),
                    "sentiment": "neutral",
                    "url": a.get("url"),
                    "is_demo": False,
                }
            )
        return items


def _infer_symbol(text: str) -> str | None:
    for token in ("NIFTY", "Sensex", "SENSEX", "RBI", "Bitcoin", "Gold"):
        if token.lower() in text.lower():
            return {"NIFTY": "NIFTY 50", "Sensex": "SENSEX", "SENSEX": "SENSEX", "RBI": "NIFTY 50", "Bitcoin": "BTC", "Gold": "GOLDBEES"}.get(token)
    return None


class NewsService:
    def __init__(self, db) -> None:
        self.db = db
        self.provider: NewsProvider = self._build_provider()

    def _build_provider(self) -> NewsProvider:
        provider_name = settings.NEWS_PROVIDER.lower()
        if provider_name == "newsapi" and settings.NEWSAPI_KEY:
            return NewsAPIProvider()
        return DemoNewsProvider()

    @property
    def is_demo(self) -> bool:
        return isinstance(self.provider, DemoNewsProvider)

    def get_news(self, limit: int = 20) -> list[dict[str, Any]]:
        from app.models import NewsCache

        cached = self.db.query(NewsCache).order_by(NewsCache.fetched_at.desc()).first()
        if cached:
            age = dt.datetime.now(dt.timezone.utc) - (cached.fetched_at if cached.fetched_at.tzinfo else cached.fetched_at.replace(tzinfo=dt.timezone.utc))
            if age < dt.timedelta(hours=1):
                return cached.payload[:limit]
        try:
            items = self.provider.get_news(limit)
        except Exception:
            items = DemoNewsProvider().get_news(limit)
        self.db.add(NewsCache(provider=self.provider.name, payload=items, fetched_at=dt.datetime.now(dt.timezone.utc)))
        self.db.commit()
        return items[:limit]
