"""Financial health, simulator, AI copilot, news, and admin endpoints."""

from __future__ import annotations

import datetime as dt

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin
from app.core.config import settings
from app.db.session import get_db
from app.models import AIConversation, AIMessage, AdminLog, Expense, Holding, SimulationRun, User
from app.schemas import (
    AdminAnalyticsOut,
    AdminUserOut,
    ChatRequest,
    ChatResponse,
    ConversationOut,
    FinancialHealthOut,
    NewsItem,
    SimulateRequest,
    SimulateResponse,
)
from app.services.ai_copilot import AICopilotService
from app.services.health import financial_health
from app.services.news_service import NewsService
from app.services.simulator import SCENARIOS, simulate

health_router = APIRouter(prefix="/api", tags=["health"])
simulator_router = APIRouter(prefix="/api/simulator", tags=["simulator"])
ai_router = APIRouter(prefix="/api/ai", tags=["ai"])
news_router = APIRouter(prefix="/api/news", tags=["news"])
admin_router = APIRouter(prefix="/api/admin", tags=["admin"])


# ---------------------------------------------------------------------------
# Financial health
# ---------------------------------------------------------------------------
@health_router.get("/financial-health", response_model=FinancialHealthOut)
def get_financial_health(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return financial_health(db, user.id)


# ---------------------------------------------------------------------------
# Simulator
# ---------------------------------------------------------------------------
@simulator_router.get("/scenarios")
def scenarios():
    return SCENARIOS


@simulator_router.post("", response_model=SimulateResponse)
def run_simulation(payload: SimulateRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    result = simulate(
        initial_investment=payload.initial_investment,
        monthly_contribution=payload.monthly_contribution,
        annual_return_pct=payload.annual_return_pct,
        inflation_pct=payload.inflation_pct,
        years=payload.years,
        scenario_name=payload.scenario_name,
    )
    db.add(
        SimulationRun(
            user_id=user.id,
            scenario_name=payload.scenario_name,
            initial_investment=payload.initial_investment,
            monthly_contribution=payload.monthly_contribution,
            annual_return_pct=payload.annual_return_pct,
            inflation_pct=payload.inflation_pct,
            years=payload.years,
            result_json=result["chart"],
        )
    )
    db.commit()
    return result


# ---------------------------------------------------------------------------
# AI copilot
# ---------------------------------------------------------------------------
@ai_router.post("/chat", response_model=ChatResponse)
def ai_chat(payload: ChatRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    service = AICopilotService(db)
    return service.chat(user, payload.message, payload.conversation_id)


@ai_router.get("/conversations", response_model=list[ConversationOut])
def list_conversations(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    convos = db.scalars(select(AIConversation).where(AIConversation.user_id == user.id).order_by(AIConversation.updated_at.desc()).limit(20)).all()
    return convos


@ai_router.get("/conversations/{conversation_id}", response_model=ConversationOut)
def get_conversation(conversation_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    convo = db.scalar(select(AIConversation).where(AIConversation.id == conversation_id, AIConversation.user_id == user.id))
    if convo is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    return convo


# ---------------------------------------------------------------------------
# News
# ---------------------------------------------------------------------------
@news_router.get("", response_model=list[NewsItem])
def get_news(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return NewsService(db).get_news()


# ---------------------------------------------------------------------------
# Admin
# ---------------------------------------------------------------------------
@admin_router.get("/analytics", response_model=AdminAnalyticsOut)
def admin_analytics(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    total_users = db.scalar(select(func.count(User.id))) or 0
    active_users = db.scalar(select(func.count(User.id)).where(User.is_active.is_(True))) or 0
    total_holdings = db.scalar(select(func.count(Holding.id))) or 0
    total_expenses = db.scalar(select(func.count(Expense.id))) or 0
    total_ai = db.scalar(select(func.count(AIMessage.id))) or 0
    total_sims = db.scalar(select(func.count(SimulationRun.id))) or 0

    since = dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=7)
    new_users_7d = db.scalar(select(func.count(User.id)).where(User.created_at >= since)) or 0

    recent = db.scalars(select(User).order_by(User.created_at.desc()).limit(8)).all()
    recent_users = [_admin_user(u, db) for u in recent]

    _log(admin, "viewed_analytics", db=db)
    return AdminAnalyticsOut(
        total_users=total_users,
        active_users=active_users,
        total_holdings=total_holdings,
        total_expenses=total_expenses,
        total_ai_requests=total_ai,
        total_simulations=total_sims,
        new_users_7d=new_users_7d,
        demo_mode=settings.is_demo_mode,
        provider=f"{settings.MARKET_DATA_PROVIDER}",
        recent_registrations=recent_users,
    )


@admin_router.get("/users", response_model=list[AdminUserOut])
def admin_users(
    query: str = "",
    status_filter: str = "all",
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    stmt = select(User)
    if query:
        like = f"%{query}%"
        stmt = stmt.where(User.email.ilike(like) | User.full_name.ilike(like))
    if status_filter == "active":
        stmt = stmt.where(User.is_active.is_(True))
    elif status_filter == "inactive":
        stmt = stmt.where(User.is_active.is_(False))
    users = db.scalars(stmt.order_by(User.created_at.desc()).limit(100)).all()
    _log(admin, "listed_users", f"query={query} filter={status_filter}", db=db)
    return [_admin_user(u, db) for u in users]


@admin_router.patch("/users/{user_id}/deactivate")
def deactivate_user(user_id: int, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    target = db.scalar(select(User).where(User.id == user_id))
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if target.id == admin.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot deactivate yourself")
    target.is_active = False
    db.commit()
    _log(admin, "deactivated_user", str(user_id), db=db)
    return {"detail": "User deactivated"}


@admin_router.patch("/users/{user_id}/activate")
def activate_user(user_id: int, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    target = db.scalar(select(User).where(User.id == user_id))
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    target.is_active = True
    db.commit()
    _log(admin, "activated_user", str(user_id), db=db)
    return {"detail": "User activated"}


def _admin_user(u: User, db: Session) -> AdminUserOut:
    holdings = db.scalar(select(func.count(Holding.id)).where(Holding.user_id == u.id)) or 0
    expenses = db.scalar(select(func.count(Expense.id)).where(Expense.user_id == u.id)) or 0
    return AdminUserOut(
        id=u.id,
        email=u.email,
        full_name=u.full_name,
        is_active=u.is_active,
        is_admin=u.is_admin,
        created_at=u.created_at,
        last_login_at=u.last_login_at,
        holdings_count=holdings,
        expenses_count=expenses,
    )


def _log(admin: User, action: str, details: str = "", db: Session = None) -> None:
    if db is None:
        return
    db.add(
        AdminLog(
            admin_id=admin.id,
            action=action,
            details=details,
            created_at=dt.datetime.now(dt.timezone.utc),
        )
    )
    db.commit()
