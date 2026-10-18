export interface User {
  id: number;
  email: string;
  full_name: string;
  is_admin: boolean;
  is_active: boolean;
}

export interface Profile {
  currency: string;
  monthly_income: number;
  monthly_debt_payments: number;
  emergency_fund: number;
  risk_tolerance: string;
}

export interface Holding {
  id: number;
  asset_type: string;
  symbol: string;
  name: string;
  quantity: number;
  avg_buy_price: number;
  purchase_date: string | null;
  notes: string;
  current_price: number;
  invested: number;
  current_value: number;
  pnl: number;
  return_pct: number;
  weight: number;
  is_demo: boolean;
}

export interface HoldingInput {
  asset_type: string;
  symbol: string;
  name: string;
  quantity: number;
  avg_buy_price: number;
  purchase_date?: string | null;
  notes?: string;
}

export interface PortfolioSummary {
  total_value: number;
  total_invested: number;
  total_pnl: number;
  today_pnl: number;
  return_pct: number;
  holdings_count: number;
  is_demo: boolean;
}

export interface PortfolioAnalytics {
  invested: number;
  current_value: number;
  pnl: number;
  return_pct: number;
  volatility_pct: number;
  sharpe_ratio: number;
  max_drawdown_pct: number;
  diversification_score: number;
  effective_assets: number;
  asset_concentration: { name: string; weight_pct: number }[];
  data_basis: string;
}

export interface AllocationSlice {
  name: string;
  value: number;
  pct: number;
  color: string;
}

export interface HistoryPoint {
  date: string;
  price: number;
}

export interface Quote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  change_pct: number;
  market_cap?: number | null;
  pe_ratio?: number | null;
  fifty_two_week_high?: number | null;
  fifty_two_week_low?: number | null;
  currency: string;
  is_demo: boolean;
  source: string;
}

export interface StockDetail {
  quote: Quote;
  history: HistoryPoint[];
  fundamentals: Record<string, unknown>;
  is_demo: boolean;
}

export interface SearchResult {
  symbol: string;
  name: string;
  type: string;
}

export interface WatchlistItem {
  id: number;
  symbol: string;
}

export interface FinancialGoal {
  id: number;
  name: string;
  target_amount: number;
  target_date: string | null;
  notes: string;
  saved_amount: number;
  remaining_amount: number;
  progress_pct: number;
  monthly_contribution: number | null;
}

export interface Expense {
  id: number;
  amount: number;
  category: string;
  description: string;
  payment_method: string;
  expense_date: string;
}

export interface ExpenseInput {
  amount: number;
  category: string;
  description?: string;
  payment_method?: string;
  expense_date?: string;
}

export interface ExpenseSummary {
  total_this_month: number;
  total_last_month: number;
  monthly_avg: number;
  daily_avg: number;
  savings_rate: number | null;
  category_breakdown: { category: string; label: string; amount: number; pct: number }[];
  daily_spending: { date: string; amount: number }[];
  monthly_totals: { month: string; amount: number }[];
  budget_status: {
    category: string;
    label: string;
    budget: number;
    actual: number;
    remaining: number;
    pct_used: number;
  }[];
  data_basis: string;
}

export interface Budget {
  id: number;
  category: string;
  monthly_limit: number;
  month: string;
}

export interface HealthComponent {
  key: string;
  label: string;
  score: number;
  explanation: string;
}

export interface FinancialHealth {
  overall_score: number;
  grade: string;
  components: HealthComponent[];
  summary: string;
  data_basis: string;
}

export interface YearPoint {
  year: number;
  contributed: number;
  value: number;
  gains: number;
  real_value: number;
}

export interface SimulationResult {
  scenario_name: string;
  total_contributions: number;
  estimated_final_value: number;
  estimated_gains: number;
  inflation_adjusted_value: number;
  years: number;
  annual_return_pct: number;
  inflation_pct: number;
  chart: YearPoint[];
  is_simulation: boolean;
  disclaimer: string;
}

export interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface Conversation {
  id: number;
  title: string;
  messages: ChatMessage[];
}

export interface ChatResponse {
  reply: string;
  conversation_id: number;
  model: string;
  mode: 'ai' | 'local';
  sources: string[];
  disclaimer: string;
}

export interface NewsItem {
  id: string;
  headline: string;
  source: string;
  published_at: string;
  related_symbol: string | null;
  sentiment: 'positive' | 'neutral' | 'negative';
  url: string | null;
  is_demo: boolean;
}

export interface RecentTransaction {
  id: number;
  date: string;
  description: string;
  category: string;
  amount: number;
}

export interface TopHolding {
  symbol: string;
  name: string;
  value: number;
  pnl: number;
  weight: number;
}

export interface MarketSnapshotItem {
  symbol: string;
  name: string;
  price: number;
  change_pct: number;
}

export interface Dashboard {
  net_worth: number;
  invested: number;
  total_pnl: number;
  pnl_pct: number;
  monthly_savings: number | null;
  portfolio_history: HistoryPoint[];
  allocation: AllocationSlice[];
  health_preview: { overall_score: number; grade: string; components: HealthComponent[] };
  recent_transactions: RecentTransaction[];
  top_holdings: TopHolding[];
  market_snapshot: MarketSnapshotItem[];
  ai_insight: { text: string; generated: boolean; basis: string } | null;
  data_basis: string;
}

export interface AdminUser {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
  last_login_at: string | null;
  holdings_count: number;
  expenses_count: number;
}

export interface AdminAnalytics {
  total_users: number;
  active_users: number;
  total_holdings: number;
  total_expenses: number;
  total_ai_requests: number;
  total_simulations: number;
  new_users_7d: number;
  demo_mode: boolean;
  provider: string;
  recent_registrations: AdminUser[];
}
