import { api } from './api';
import type {
  AdminAnalytics,
  AdminUser,
  Budget,
  ChatResponse,
  Conversation,
  Dashboard,
  Expense,
  ExpenseInput,
  ExpenseSummary,
  FinancialHealth,
  Holding,
  HoldingInput,
  HistoryPoint,
  NewsItem,
  PortfolioAnalytics,
  PortfolioSummary,
  Profile,
  Quote,
  SearchResult,
  SimulationResult,
  StockDetail,
  User,
  WatchlistItem,
} from '../types';

interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

interface SimulateInput {
  initial_investment: number;
  monthly_contribution: number;
  annual_return_pct: number;
  inflation_pct: number;
  years: number;
  scenario_name: string;
}

export const authApi = {
  register: (email: string, password: string, fullName: string) =>
    api<TokenResponse>('/api/auth/register', { method: 'POST', body: { email, password, full_name: fullName }, token: null }),
  login: (email: string, password: string) =>
    api<TokenResponse>('/api/auth/login', { method: 'POST', body: { email, password }, token: null }),
  me: () => api<User>('/api/auth/me'),
  logout: () => api<{ detail: string }>('/api/auth/logout', { method: 'POST' }),
  getProfile: () => api<Profile>('/api/auth/profile'),
  updateProfile: (patch: Partial<Profile>) => api<Profile>('/api/auth/profile', { method: 'PATCH', body: patch }),
};

export const dashboardApi = {
  get: () => api<Dashboard>('/api/dashboard'),
};

export const portfolioApi = {
  list: () => api<Holding[]>('/api/portfolio'),
  summary: () => api<PortfolioSummary>('/api/portfolio/summary'),
  analytics: () => api<PortfolioAnalytics>('/api/portfolio/analytics'),
  history: (period: string) => api<HistoryPoint[]>(`/api/portfolio/history?period=${period}`),
  allocation: () => api<{ slices: { name: string; value: number; pct: number; color: string }[]; total: number }>('/api/portfolio/allocation'),
  create: (input: HoldingInput) => api<Holding>('/api/portfolio/holdings', { method: 'POST', body: input }),
  update: (id: number, input: Partial<HoldingInput>) =>
    api<Holding>(`/api/portfolio/holdings/${id}`, { method: 'PUT', body: input }),
  remove: (id: number) => api<void>(`/api/portfolio/holdings/${id}`, { method: 'DELETE' }),
};

export const marketsApi = {
  indices: () => api<Quote[]>('/api/markets/indices'),
  quote: (symbol: string) => api<Quote>(`/api/markets/quote/${encodeURIComponent(symbol)}`),
  history: (symbol: string, period: string) =>
    api<HistoryPoint[]>(`/api/markets/history/${encodeURIComponent(symbol)}?period=${period}`),
  search: (query: string) => api<SearchResult[]>(`/api/markets/search?query=${encodeURIComponent(query)}`),
  detail: (symbol: string) => api<StockDetail>(`/api/markets/stock/${encodeURIComponent(symbol)}`),
};

export const watchlistApi = {
  list: () => api<WatchlistItem[]>('/api/watchlist'),
  add: (symbol: string) => api<WatchlistItem>('/api/watchlist', { method: 'POST', body: { symbol } }),
  remove: (id: number) => api<void>(`/api/watchlist/${id}`, { method: 'DELETE' }),
};

export const expensesApi = {
  list: () => api<Expense[]>('/api/expenses'),
  summary: () => api<ExpenseSummary>('/api/expenses/summary'),
  create: (input: ExpenseInput) => api<Expense>('/api/expenses', { method: 'POST', body: input }),
  update: (id: number, input: Partial<ExpenseInput>) =>
    api<Expense>(`/api/expenses/${id}`, { method: 'PUT', body: input }),
  remove: (id: number) => api<void>(`/api/expenses/${id}`, { method: 'DELETE' }),
  budgets: () => api<Budget[]>('/api/budgets'),
  createBudget: (category: string, monthlyLimit: number, month: string) =>
    api<Budget>('/api/budgets', { method: 'POST', body: { category, monthly_limit: monthlyLimit, month } }),
  deleteBudget: (id: number) => api<void>(`/api/budgets/${id}`, { method: 'DELETE' }),
};

export const healthApi = {
  get: () => api<FinancialHealth>('/api/financial-health'),
};

export const simulatorApi = {
  scenarios: () => api<Record<string, { annual_return_pct: number; inflation_pct: number; label: string }>>('/api/simulator/scenarios'),
  run: (input: SimulateInput) => api<SimulationResult>('/api/simulator', { method: 'POST', body: input }),
};

export const aiApi = {
  chat: (message: string, conversationId?: number) =>
    api<ChatResponse>('/api/ai/chat', { method: 'POST', body: { message, conversation_id: conversationId } }),
  conversations: () => api<Conversation[]>('/api/ai/conversations'),
  conversation: (id: number) => api<Conversation>(`/api/ai/conversations/${id}`),
};

export const newsApi = {
  get: () => api<NewsItem[]>('/api/news'),
};

export const adminApi = {
  analytics: () => api<AdminAnalytics>('/api/admin/analytics'),
  users: (query = '', status = 'all') =>
    api<AdminUser[]>(`/api/admin/users?query=${encodeURIComponent(query)}&status_filter=${status}`),
  deactivate: (id: number) => api<{ detail: string }>(`/api/admin/users/${id}/deactivate`, { method: 'PATCH' }),
  activate: (id: number) => api<{ detail: string }>(`/api/admin/users/${id}/activate`, { method: 'PATCH' }),
};
