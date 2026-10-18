"""Import every model module so all classes register on the Base metadata."""

from app.models.ai import AIConversation, AIMessage, AdminLog, SimulationRun
from app.models.expenses import Budget, Expense
from app.models.market import MarketCache, NewsCache, WatchlistItem
from app.models.portfolio import FinancialGoal, GoalContribution, Holding, PortfolioSnapshot, Transaction
from app.models.user import Profile, User

__all__ = [
    "AIConversation",
    "AIMessage",
    "AdminLog",
    "Budget",
    "Expense",
    "FinancialGoal",
    "GoalContribution",
    "Holding",
    "MarketCache",
    "NewsCache",
    "PortfolioSnapshot",
    "Profile",
    "SimulationRun",
    "Transaction",
    "User",
    "WatchlistItem",
]
