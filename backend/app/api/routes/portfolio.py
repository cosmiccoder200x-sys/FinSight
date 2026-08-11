"""Portfolio endpoints: holdings CRUD, summary, analytics, history, watchlist."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import Holding, Transaction, User, WatchlistItem
from app.schemas import (
    HoldingCreate,
    HoldingOut,
    HoldingUpdate,
    PortfolioAnalytics,
    PortfolioSummary,
    WatchlistAdd,
    WatchlistSymbolOut,
)
from app.services import analytics as analytics_service
from app.services.market_data import MarketDataService

router = APIRouter(prefix="/api", tags=["portfolio"])


def _market(db: Session) -> MarketDataService:
    return MarketDataService(db)


# ---------------------------------------------------------------------------
# Holdings
# ---------------------------------------------------------------------------
@router.get("/portfolio", response_model=list[HoldingOut])
def list_holdings(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[dict]:
    holdings = db.scalars(select(Holding).where(Holding.user_id == user.id).order_by(Holding.created_at.desc())).all()
    return analytics_service.enrich_holdings(holdings, _market(db))


@router.post("/portfolio/holdings", response_model=HoldingOut, status_code=status.HTTP_201_CREATED)
def create_holding(payload: HoldingCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    holding = Holding(
        user_id=user.id,
        asset_type=payload.asset_type.lower(),
        symbol=payload.symbol.strip().upper(),
        name=payload.name.strip(),
        quantity=payload.quantity,
        avg_buy_price=payload.avg_buy_price,
        purchase_date=payload.purchase_date,
        notes=payload.notes,
    )
    db.add(holding)
    db.flush()
    db.add(
        Transaction(
            user_id=user.id,
            holding_id=holding.id,
            action="buy",
            symbol=holding.symbol,
            asset_type=holding.asset_type,
            quantity=holding.quantity,
            price=holding.avg_buy_price,
            amount=holding.quantity * holding.avg_buy_price,
            transaction_date=payload.purchase_date,
        )
    )
    db.commit()
    db.refresh(holding)
    enriched = analytics_service.enrich_holdings([holding], _market(db))
    return enriched[0]


@router.put("/portfolio/holdings/{holding_id}", response_model=HoldingOut)
def update_holding(
    holding_id: int,
    payload: HoldingUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    holding = db.scalar(select(Holding).where(Holding.id == holding_id, Holding.user_id == user.id))
    if holding is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Holding not found")
    updates = payload.model_dump(exclude_unset=True)
    if "symbol" in updates:
        updates["symbol"] = updates["symbol"].strip().upper()
    if "asset_type" in updates:
        updates["asset_type"] = updates["asset_type"].lower()
    for key, value in updates.items():
        setattr(holding, key, value)
    db.commit()
    db.refresh(holding)
    enriched = analytics_service.enrich_holdings([holding], _market(db))
    return enriched[0]


@router.delete("/portfolio/holdings/{holding_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_holding(holding_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    holding = db.scalar(select(Holding).where(Holding.id == holding_id, Holding.user_id == user.id))
    if holding is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Holding not found")
    db.delete(holding)
    db.commit()


@router.get("/portfolio/summary", response_model=PortfolioSummary)
def portfolio_summary(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    holdings = db.scalars(select(Holding).where(Holding.user_id == user.id)).all()
    enriched = analytics_service.enrich_holdings(holdings, _market(db))
    return analytics_service.portfolio_summary(enriched)


@router.get("/portfolio/analytics", response_model=PortfolioAnalytics)
def portfolio_analytics(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    holdings = db.scalars(select(Holding).where(Holding.user_id == user.id)).all()
    return analytics_service.portfolio_analytics(holdings, _market(db))


@router.get("/portfolio/allocation")
def portfolio_allocation(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    holdings = db.scalars(select(Holding).where(Holding.user_id == user.id)).all()
    enriched = analytics_service.enrich_holdings(holdings, _market(db))
    return analytics_service.allocation(enriched)


@router.get("/portfolio/history")
def portfolio_history(period: str = "6M", user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[dict]:
    holdings = db.scalars(select(Holding).where(Holding.user_id == user.id)).all()
    days = {"1D": 1, "1W": 7, "1M": 30, "3M": 90, "6M": 182, "1Y": 365, "ALL": 1825}.get(period.upper(), 182)
    return analytics_service.portfolio_history(holdings, _market(db), days=days)


# ---------------------------------------------------------------------------
# Watchlist
# ---------------------------------------------------------------------------
@router.get("/watchlist", response_model=list[WatchlistSymbolOut])
def list_watchlist(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    items = db.scalars(select(WatchlistItem).where(WatchlistItem.user_id == user.id).order_by(WatchlistItem.created_at.desc())).all()
    return items


@router.post("/watchlist", response_model=WatchlistSymbolOut, status_code=status.HTTP_201_CREATED)
def add_watchlist(payload: WatchlistAdd, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    symbol = payload.symbol.strip().upper()
    existing = db.scalar(select(WatchlistItem).where(WatchlistItem.user_id == user.id, WatchlistItem.symbol == symbol))
    if existing:
        return existing
    item = WatchlistItem(user_id=user.id, symbol=symbol)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/watchlist/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_watchlist(item_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    item = db.scalar(select(WatchlistItem).where(WatchlistItem.id == item_id, WatchlistItem.user_id == user.id))
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Watchlist item not found")
    db.delete(item)
    db.commit()
