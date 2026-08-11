"""Market endpoints: quotes, history, search, stock details."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import User
from app.schemas import HistoryPoint, QuoteOut, SearchResult, StockDetail
from app.services.market_data import MarketDataService

router = APIRouter(prefix="/api/markets", tags=["markets"])


def _market(db: Session) -> MarketDataService:
    return MarketDataService(db)


@router.get("/indices", response_model=list[QuoteOut])
def indices(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _market(db).indices()


@router.get("/quote/{symbol}", response_model=QuoteOut)
def quote(symbol: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _market(db).get_quote(symbol)


@router.get("/history/{symbol}", response_model=list[HistoryPoint])
def history(
    symbol: str,
    period: str = Query(default="1M", pattern="^(1D|1W|1M|3M|6M|1Y|5Y|ALL)$"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _market(db).get_history(symbol, period)


@router.get("/search", response_model=list[SearchResult])
def search(query: str, limit: int = Query(default=8, le=20), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _market(db).search(query, limit)


@router.get("/stock/{symbol}", response_model=StockDetail)
def stock_detail(symbol: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    market = _market(db)
    quote_data = market.get_quote(symbol)
    profile = market.get_company_profile(symbol)
    fundamentals = market.get_fundamentals(symbol)
    history_data = market.get_history(symbol, "6M")
    return StockDetail(
        quote=quote_data,
        history=history_data,
        fundamentals={**profile, **fundamentals},
        is_demo=market.is_demo,
    )
