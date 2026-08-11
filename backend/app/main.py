"""FinSight FastAPI application entrypoint."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.rate_limit import RateLimitMiddleware
from app.core.config import settings
from app.db.init_db import init_db, seed_all
from app.db.session import SessionLocal
from app.api.routes.auth import router as auth_router
from app.api.routes.dashboard import router as dashboard_router
from app.api.routes.expenses import router as expenses_router
from app.api.routes.markets import router as markets_router
from app.api.routes.misc import (
    admin_router,
    ai_router,
    health_router,
    news_router,
    simulator_router,
)
from app.api.routes.portfolio import router as portfolio_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    db = SessionLocal()
    try:
        seed_all(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-powered personal finance & investment intelligence platform.",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(RateLimitMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Public
app.include_router(auth_router)

# Authenticated
app.include_router(dashboard_router)
app.include_router(portfolio_router)
app.include_router(expenses_router)
app.include_router(markets_router)
app.include_router(health_router)
app.include_router(simulator_router)
app.include_router(ai_router)
app.include_router(news_router)

# Admin only
app.include_router(admin_router)


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "demo_mode": settings.is_demo_mode,
        "ai_enabled": settings.ai_configured,
        "market_provider": settings.MARKET_DATA_PROVIDER,
    }


@app.get("/")
def root():
    return {"message": "FinSight API. See /docs for the interactive API documentation."}
