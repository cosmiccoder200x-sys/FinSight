"""Expense tracker endpoints: CRUD, analytics summary, budgets."""

from __future__ import annotations

import datetime as dt

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import Budget, Expense, User
from app.schemas import (
    BudgetCreate,
    BudgetOut,
    ExpenseCreate,
    ExpenseOut,
    ExpenseSummary,
    ExpenseUpdate,
)
from app.services.expenses_service import expense_summary

router = APIRouter(prefix="/api", tags=["expenses"])


@router.get("/expenses", response_model=list[ExpenseOut])
def list_expenses(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.scalars(
        select(Expense).where(Expense.user_id == user.id).order_by(Expense.expense_date.desc(), Expense.created_at.desc())
    ).all()
    return rows


@router.post("/expenses", response_model=ExpenseOut, status_code=status.HTTP_201_CREATED)
def create_expense(payload: ExpenseCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    expense = Expense(
        user_id=user.id,
        amount=payload.amount,
        category=payload.category.lower(),
        description=payload.description,
        payment_method=payload.payment_method.lower(),
        expense_date=payload.expense_date or dt.date.today(),
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense


@router.put("/expenses/{expense_id}", response_model=ExpenseOut)
def update_expense(
    expense_id: int,
    payload: ExpenseUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    expense = db.scalar(select(Expense).where(Expense.id == expense_id, Expense.user_id == user.id))
    if expense is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")
    updates = payload.model_dump(exclude_unset=True)
    if "category" in updates:
        updates["category"] = updates["category"].lower()
    if "payment_method" in updates:
        updates["payment_method"] = updates["payment_method"].lower()
    for key, value in updates.items():
        setattr(expense, key, value)
    db.commit()
    db.refresh(expense)
    return expense


@router.delete("/expenses/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(expense_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    expense = db.scalar(select(Expense).where(Expense.id == expense_id, Expense.user_id == user.id))
    if expense is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")
    db.delete(expense)
    db.commit()


@router.get("/expenses/summary", response_model=ExpenseSummary)
def expenses_summary(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    return expense_summary(db, user.id)


# ---------------------------------------------------------------------------
# Budgets
# ---------------------------------------------------------------------------
@router.get("/budgets", response_model=list[BudgetOut])
def list_budgets(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.scalars(select(Budget).where(Budget.user_id == user.id).order_by(Budget.category)).all()


@router.post("/budgets", response_model=BudgetOut, status_code=status.HTTP_201_CREATED)
def create_budget(payload: BudgetCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    existing = db.scalar(
        select(Budget).where(Budget.user_id == user.id, Budget.category == payload.category.lower(), Budget.month == payload.month)
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A budget for this category and month already exists")
    budget = Budget(user_id=user.id, category=payload.category.lower(), monthly_limit=payload.monthly_limit, month=payload.month)
    db.add(budget)
    db.commit()
    db.refresh(budget)
    return budget


@router.delete("/budgets/{budget_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_budget(budget_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    budget = db.scalar(select(Budget).where(Budget.id == budget_id, Budget.user_id == user.id))
    if budget is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Budget not found")
    db.delete(budget)
    db.commit()
