"""Database initialization: create tables and seed default users."""

from __future__ import annotations

import datetime as dt

from sqlalchemy import select
from sqlalchemy.orm import Session

import app.models  # noqa: F401  (registers all models on Base.metadata)
from app.core.config import settings
from app.core.security import hash_password
from app.db.session import Base, engine
from app.models import Profile, User


def init_db() -> None:
    """Create all tables if they do not exist yet."""
    Base.metadata.create_all(bind=engine)


def _create_user(db: Session, email: str, password: str, full_name: str, is_admin: bool) -> User | None:
    email = email.lower()
    existing = db.scalar(select(User).where(User.email == email))
    if existing:
        return None
    user = User(
        email=email,
        password_hash=hash_password(password),
        full_name=full_name,
        is_active=True,
        is_admin=is_admin,
    )
    db.add(user)
    db.flush()
    user.profile = Profile(
        user_id=user.id,
        monthly_income=0,
        monthly_debt_payments=0,
        emergency_fund=0,
        risk_tolerance="moderate",
    )
    db.commit()
    db.refresh(user)
    return user


def seed_admin_user(db: Session) -> User | None:
    """Create the admin user if it does not exist."""
    return _create_user(
        db, settings.ADMIN_EMAIL, settings.ADMIN_PASSWORD, "FinSight Admin", is_admin=True
    )


def seed_demo_user(db: Session) -> User | None:
    """Create the demo user with a few sample expenses for exploration."""
    from app.models.expenses import Expense

    demo = _create_user(
        db, settings.DEMO_USER_EMAIL, settings.DEMO_USER_PASSWORD, "Demo Investor", is_admin=False
    )
    if demo is None:
        return None

    today = dt.date.today()
    demo.profile.monthly_income = 120000
    demo.profile.monthly_debt_payments = 12000
    demo.profile.emergency_fund = 250000
    demo.profile.risk_tolerance = "moderate"
    db.add_all(
        [
            Expense(
                user_id=demo.id,
                amount=4800,
                category="food",
                description="Groceries",
                payment_method="upi",
                expense_date=today,
            ),
            Expense(
                user_id=demo.id,
                amount=900,
                category="transport",
                description="Metro card recharge",
                payment_method="upi",
                expense_date=today,
            ),
        ]
    )
    db.commit()
    db.refresh(demo)
    return demo


def seed_all(db: Session) -> None:
    """Run the full seed routine. Idempotent."""
    seed_admin_user(db)
    if settings.is_demo_mode:
        seed_demo_user(db)
