"""Lightweight in-memory sliding-window rate limiter.

Sufficient for a single-process deployment. Swap for Redis when scaling out.
"""

from __future__ import annotations

import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings


class SlidingWindowLimiter:
    def __init__(self, limit_per_minute: int) -> None:
        self.limit = limit_per_minute
        self.hits: dict[str, deque[float]] = defaultdict(deque)

    def allow(self, key: str) -> bool:
        now = time.monotonic()
        window = now - 60.0
        dq = self.hits[key]
        while dq and dq[0] < window:
            dq.popleft()
        if len(dq) >= self.limit:
            return False
        dq.append(now)
        return True

    def reset(self) -> None:
        self.hits.clear()


limiter = SlidingWindowLimiter(settings.RATE_LIMIT_PER_MINUTE)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Rate-limit every /api request by client IP."""

    async def dispatch(self, request: Request, call_next):
        if settings.RATE_LIMIT_ENABLED and request.url.path.startswith("/api"):
            client_ip = request.client.host if request.client else "unknown"
            if not limiter.allow(client_ip):
                raise HTTPException(status_code=429, detail="Too many requests. Please slow down.")
        return await call_next(request)
