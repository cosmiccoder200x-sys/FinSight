import { Activity, DollarSign, MessageSquare, TrendingUp, Users, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardTitle } from '../../components/ui/Card';
import { ErrorState, Spinner } from '../../components/ui/Feedback';
import { Badge } from '../../components/ui/Badge';
import { useApi } from '../../hooks/useApi';
import { adminApi } from '../../services/finsight';
import type { AdminAnalytics } from '../../types';
import { formatDate } from '../../utils/format';

export default function AdminOverview() {
  const { data, loading, error, refetch } = useApi<AdminAnalytics>(() => adminApi.analytics(), []);

  if (loading) return <Spinner label="Loading admin overview…" />;
  if (error || !data) return <ErrorState message={error ?? 'Could not load analytics'} onRetry={refetch} />;

  const cards = [
    { label: 'Total Users', value: data.total_users, icon: Users },
    { label: 'Active Users', value: data.active_users, icon: Activity },
    { label: 'Holdings', value: data.total_holdings, icon: Wallet },
    { label: 'Expenses', value: data.total_expenses, icon: DollarSign },
    { label: 'AI Requests', value: data.total_ai_requests, icon: MessageSquare },
    { label: 'Simulations', value: data.total_simulations, icon: TrendingUp },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-50">Admin Overview</h1>
          <p className="text-sm text-gray-500">System health and platform metrics.</p>
        </div>
        <Badge tone={data.demo_mode ? 'warn' : 'accent'}>{data.demo_mode ? 'Demo mode' : 'Live mode'}</Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="card card-hover p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{c.label}</p>
              <c.icon className="h-4 w-4 text-gray-600" />
            </div>
            <p className="mt-3 text-3xl font-bold text-gray-50">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardTitle sub="Registered in the last 7 days">Growth</CardTitle>
          <div className="flex items-end gap-6">
            <div>
              <p className="text-4xl font-bold text-accent-soft">{data.new_users_7d}</p>
              <p className="mt-1 text-xs text-gray-500">new users (7 days)</p>
            </div>
            <p className="pb-1 text-xs text-gray-500">
              Market data provider: <code className="text-accent-soft">{data.provider}</code>
            </p>
          </div>
        </Card>

        <Card>
          <CardTitle sub="Latest sign-ups">Recent Registrations</CardTitle>
          {data.recent_registrations.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">No registrations yet.</p>
          ) : (
            <div className="divide-y divide-ink-line">
              {data.recent_registrations.map((u) => (
                <div key={u.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-medium text-gray-200">{u.full_name || u.email}</p>
                    <p className="text-xs text-gray-500">{u.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">{formatDate(u.created_at)}</p>
                    <Badge tone={u.is_active ? 'positive' : 'negative'}>{u.is_active ? 'Active' : 'Disabled'}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link to="/admin/users" className="card card-hover flex items-center justify-between p-5">
          <div>
            <h3 className="text-sm font-semibold text-gray-100">User Management</h3>
            <p className="mt-1 text-xs text-gray-500">Search, filter, deactivate users.</p>
          </div>
          <Activity className="h-5 w-5 text-accent-soft" />
        </Link>
        <Link to="/admin/analytics" className="card card-hover flex items-center justify-between p-5">
          <div>
            <h3 className="text-sm font-semibold text-gray-100">Detailed Analytics</h3>
            <p className="mt-1 text-xs text-gray-500">Platform usage breakdown.</p>
          </div>
          <TrendingUp className="h-5 w-5 text-accent-soft" />
        </Link>
      </div>
    </div>
  );
}
