"""Application configuration loaded from environment variables / .env.

Secrets (database URL, JWT secret, API keys) live here and are only ever
accessible server-side. The frontend never receives them.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    """Central settings object. Populated from env vars and the .env file."""

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # App
    APP_NAME: str = "FinSight"
    APP_VERSION: str = "1.0.0"
    PORT: int = 8000

    # Database
    DATABASE_URL: str = "sqlite:///./finsight.db"

    # Security
    JWT_SECRET: str = "dev-secret-change-me"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # Seed users
    ADMIN_EMAIL: str = "admin@finsight.app"
    ADMIN_PASSWORD: str = "admin1234"
    DEMO_USER_EMAIL: str = "demo@finsight.app"
    DEMO_USER_PASSWORD: str = "demo1234"

    # AI
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_MODEL: str = "openai/gpt-4o-mini"
    AI_ENABLED: bool = True
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"

    # Market data
    MARKET_DATA_PROVIDER: str = "demo"  # demo | finnhub
    FINNHUB_API_KEY: str = ""

    # News
    NEWS_PROVIDER: str = "demo"  # demo | newsapi | finnhub
    NEWSAPI_KEY: str = ""

    # Demo mode
    DEMO_MODE: bool = True

    # CORS
    FRONTEND_ORIGIN: str = "http://localhost:5173,http://localhost:3000"

    # Rate limiting
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_PER_MINUTE: int = 120

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.FRONTEND_ORIGIN.split(",") if o.strip()]

    @property
    def is_demo_mode(self) -> bool:
        return self.DEMO_MODE

    @property
    def ai_configured(self) -> bool:
        return bool(self.OPENROUTER_API_KEY)


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
