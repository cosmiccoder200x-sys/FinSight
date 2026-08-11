import { Activity, Bot, DollarSign, Users, Wallet } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { adminApi } from '../../services/finsight';
import { Card, CardTitle } from '../../components/ui/Card';
import { ErrorState, Spinner } from '../../components/ui/Feedback';

export default function AdminAnalytics() {
  const { data, loading, error, refetch } = useApi(() => adminApi.analytics(), []);

  if (loading) return <Spinner label="Loading analytics…" />;
  if (error || !data) return <ErrorState message={error ?? 'Could not load analytics'} onRetry={refetch} />;

  const rows = [
    { label: 'Total users', value: data.total_users, icon: Users },
    { label: 'Active users', value: data.active_users, icon: Activity },
    { label: 'Holdings recorded', value: data.total_holdings, icon: Wallet },
    { label: 'Expenses recorded', value: data.total_expenses, icon: DollarSign },
    { label: 'AI requests', value: data.total_ai_requests, icon: Bot },
    { label: 'Simulations run', value: data.total_simulations, icon: Activity },
  ];

  const max = Math.max(1, ...rows.map((r) => r.value));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-50">Platform Analytics</h1>
        <p className="text-sm text-gray-500">Usage across the platform. Values are for display; totals are real counts from the database.</p>
      </div>

      <Card>
        <CardTitle sub="Counts across all users">Usage Breakdown</CardTitle>
        <div className="space-y-5">
          {rows.map((r) => (
            <div key={r.label}>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-gray-300">
                  <r.icon className="h-4 w-4 text-accent-soft" />
                  {r.label}
                </span>
                <span className="font-mono font-semibold text-gray-100">{r.value}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-ink-raised">
                <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(r.value / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <p className="text-xs uppercase tracking-wider text-gray-500">Demo mode</p>
          <p className="mt-2 text-xl font-bold text-gray-50">{data.demo_mode ? 'Enabled' : 'Disabled'}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs uppercase tracking-wider text-gray-500">Market provider</p>
          <p className="mt-2 font-mono text-xl font-bold text-gray-50">{data.provider}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs uppercase tracking-wider text-gray-500">New users (7d)</p>
          <p className="mt-2 text-xl font-bold text-accent-soft">{data.new_users_7d}</p>
        </div>
      </div>
    </div>
  );
}
