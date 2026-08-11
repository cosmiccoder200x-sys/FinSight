import { Search, ShieldOff, UserCheck } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { ErrorState, Spinner } from '../../components/ui/Feedback';
import { Input, Select } from '../../components/ui/Form';
import { useApi, useMutation } from '../../hooks/useApi';
import { adminApi } from '../../services/finsight';
import type { AdminUser } from '../../types';
import { formatDate } from '../../utils/format';

export default function AdminUsers() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const { data, loading, error, refetch } = useApi<AdminUser[]>(() => adminApi.users(query, status), [query, status]);
  const toggleMutation = useMutation(async (u: AdminUser) =>
    u.is_active ? adminApi.deactivate(u.id) : adminApi.activate(u.id),
  );

  const toggle = async (u: AdminUser) => {
    if (!window.confirm(`${u.is_active ? 'Deactivate' : 'Activate'} ${u.full_name || u.email}?`)) return;
    try {
      await toggleMutation.execute(u);
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Action failed.');
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-50">User Management</h1>
        <p className="text-sm text-gray-500">Search, filter and manage accounts.</p>
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or email…" className="pl-9" />
          </div>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-auto">
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </div>

        {loading ? (
          <Spinner label="Loading users…" />
        ) : error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : (data ?? []).length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-500">No users match your search.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-ink-line text-left text-[11px] uppercase tracking-wider text-gray-500">
                  <th className="pb-3 pr-4 font-medium">User</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 pr-4 text-center font-medium">Holdings</th>
                  <th className="pb-3 pr-4 text-center font-medium">Expenses</th>
                  <th className="pb-3 pr-4 font-medium">Joined</th>
                  <th className="pb-3 pr-4 font-medium">Last login</th>
                  <th className="pb-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-line">
                {data?.map((u) => (
                  <tr key={u.id} className="transition-colors hover:bg-ink-raised/60">
                    <td className="py-3 pr-4">
                      <p className="font-semibold text-gray-100">{u.full_name || '—'}</p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                    </td>
                    <td className="py-3 pr-4">
                      <Badge tone={u.is_active ? 'positive' : 'negative'}>
                        {u.is_active ? 'Active' : 'Disabled'}
                      </Badge>
                      {u.is_admin && <span className="ml-2"><Badge tone="accent">Admin</Badge></span>}
                    </td>
                    <td className="py-3 pr-4 text-center text-gray-300">{u.holdings_count}</td>
                    <td className="py-3 pr-4 text-center text-gray-300">{u.expenses_count}</td>
                    <td className="py-3 pr-4 text-gray-400">{formatDate(u.created_at)}</td>
                    <td className="py-3 pr-4 text-gray-400">{u.last_login_at ? formatDate(u.last_login_at) : '—'}</td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => toggle(u)}
                        disabled={u.is_admin || toggleMutation.loading}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-ink-line px-3 py-1.5 text-xs font-medium text-gray-400 transition-colors hover:border-gray-500 hover:text-white disabled:opacity-40"
                        title={u.is_admin ? 'Admins cannot be deactivated' : u.is_active ? 'Deactivate user' : 'Activate user'}
                      >
                        {u.is_active ? <ShieldOff className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
