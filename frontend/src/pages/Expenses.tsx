import { Edit3, Loader2, PiggyBank, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { AreaTrend, DonutChart, SimpleBars } from '../components/charts/Charts';
import { Button } from '../components/ui/Button';
import { Card, CardTitle } from '../components/ui/Card';
import { EmptyState, ErrorState, Spinner } from '../components/ui/Feedback';
import { Field, Input, Select } from '../components/ui/Form';
import { Modal } from '../components/ui/Modal';
import { ProgressBar } from '../components/ui/Progress';
import { useApi, useMutation } from '../hooks/useApi';
import { expensesApi } from '../services/finsight';
import type { Expense, ExpenseInput, ExpenseSummary } from '../types';
import { formatDate, formatINR } from '../utils/format';

const categories = ['food', 'transport', 'shopping', 'education', 'bills', 'entertainment', 'health', 'investment', 'other'];
const categoryLabels: Record<string, string> = {
  food: 'Food',
  transport: 'Transport',
  shopping: 'Shopping',
  education: 'Education',
  bills: 'Bills',
  entertainment: 'Entertainment',
  health: 'Health',
  investment: 'Investment',
  other: 'Other',
};
const paymentMethods = ['upi', 'card', 'bank_transfer', 'cash', 'other'];

const emptyForm: ExpenseInput = {
  amount: 0,
  category: 'food',
  description: '',
  payment_method: 'upi',
  expense_date: new Date().toISOString().slice(0, 10),
};

export default function Expenses() {
  const listApi = useApi<Expense[]>(() => expensesApi.list(), []);
  const summaryApi = useApi<ExpenseSummary>(() => expensesApi.summary(), []);
  const budgetsApi = useApi(() => expensesApi.budgets(), []);

  const [modalOpen, setModalOpen] = useState(false);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form, setForm] = useState<ExpenseInput>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [budgetCategory, setBudgetCategory] = useState('food');
  const [budgetLimit, setBudgetLimit] = useState(5000);

  const saveMutation = useMutation(async (input: ExpenseInput) => {
    if (editing) await expensesApi.update(editing.id, input);
    else await expensesApi.create(input);
  });
  const budgetMutation = useMutation(async () =>
    expensesApi.createBudget(budgetCategory, budgetLimit, new Date().toISOString().slice(0, 7)),
  );
  const deleteMutation = useMutation(async (id: number) => expensesApi.remove(id));

  const refreshAll = () => {
    listApi.refetch();
    summaryApi.refetch();
    budgetsApi.refetch();
  };

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (e: Expense) => {
    setEditing(e);
    setForm({ amount: e.amount, category: e.category, description: e.description, payment_method: e.payment_method, expense_date: e.expense_date });
    setFormError(null);
    setModalOpen(true);
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setFormError(null);
    if (form.amount <= 0) return setFormError('Amount must be greater than zero.');
    try {
      await saveMutation.execute(form);
      setModalOpen(false);
      refreshAll();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save expense.');
    }
  };

  const submitBudget = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setFormError(null);
    if (budgetLimit <= 0) return setFormError('Budget must be greater than zero.');
    try {
      await budgetMutation.execute();
      setBudgetOpen(false);
      budgetsApi.refetch();
      summaryApi.refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save budget.');
    }
  };

  const remove = async (e: Expense) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await deleteMutation.execute(e.id);
      refreshAll();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete.');
    }
  };

  const summary = summaryApi.data;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-50">Expenses</h1>
          <p className="text-sm text-gray-500">Track spending and stay within budget.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setBudgetOpen(true)}>
            <PiggyBank className="h-4 w-4" /> Set budget
          </Button>
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4" /> Add expense
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'This Month', value: summary?.total_this_month ?? 0, sub: 'total spending' },
          { label: 'Last Month', value: summary?.total_last_month ?? 0, sub: 'comparison period' },
          { label: 'Monthly Average', value: summary?.monthly_avg ?? 0, sub: 'last 6 months' },
          { label: 'Daily Average', value: summary?.daily_avg ?? 0, sub: 'this month' },
        ].map((s) => (
          <div key={s.label} className="card card-hover p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{s.label}</p>
            <p className="mt-2 text-2xl font-bold text-gray-50">{formatINR(s.value)}</p>
            <p className="mt-0.5 text-xs text-gray-500">{s.sub}</p>
          </div>
        ))}
      </div>

      {summaryApi.loading ? (
        <Spinner label="Crunching your numbers…" />
      ) : summaryApi.error ? (
        <ErrorState message={summaryApi.error} onRetry={summaryApi.refetch} />
      ) : (listApi.data ?? []).length === 0 ? (
        <Card>
          <EmptyState
            title="No expenses yet"
            message="Add your first expense to unlock spending insights, budgets and your savings rate."
            action={
              <Button onClick={openAdd}>
                <Plus className="h-4 w-4" /> Add an expense
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <div className="grid gap-5 xl:grid-cols-3">
            {/* Category breakdown */}
            <Card>
              <CardTitle sub="This month by category">Category Breakdown</CardTitle>
              {summary && summary.category_breakdown.length > 0 ? (
                <>
                  <DonutChart
                    data={summary.category_breakdown.map((c, i) => ({
                      name: c.label,
                      value: c.amount,
                      color: ['#10B981', '#34D399', '#F59E0B', '#60A5FA', '#A78BFA', '#F87171', '#2DD4BF', '#F472B6'][i % 8],
                    }))}
                    centerLabel="Total"
                    centerValue={formatINR(summary.total_this_month)}
                    height={200}
                  />
                  <div className="mt-4 space-y-2">
                    {summary.category_breakdown.map((c) => (
                      <div key={c.category} className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">{c.label}</span>
                        <span className="text-gray-200">{formatINR(c.amount)} <span className="text-xs text-gray-500">({c.pct}%)</span></span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="py-8 text-center text-sm text-gray-500">No spending this month.</p>
              )}
            </Card>

            {/* Daily spending */}
            <Card>
              <CardTitle sub="Daily totals this month">Daily Spending</CardTitle>
              <AreaTrend
                data={(summary?.daily_spending ?? []).map((d) => ({ date: d.date, amount: d.amount }))}
                xKey="date"
                yKey="amount"
                yFormatter={(v) => formatINR(v)}
                height={240}
              />
            </Card>

            {/* Monthly comparison */}
            <Card>
              <CardTitle sub="Last 6 months">Monthly Comparison</CardTitle>
              <SimpleBars
                data={(summary?.monthly_totals ?? []).map((m) => ({ month: m.month, amount: m.amount }))}
                xKey="month"
                yKey="amount"
                yFormatter={(v) => formatINR(v)}
                height={240}
              />
            </Card>
          </div>

          {summary?.savings_rate !== null && summary?.savings_rate !== undefined && (
            <Card className="flex items-center justify-between gap-4">
              <div>
                <CardTitle sub="Income minus this month's spending">Savings Rate</CardTitle>
                <p className="text-3xl font-bold text-gray-50">{summary.savings_rate}%</p>
              </div>
              <ProgressBar value={summary.savings_rate} max={100} />
            </Card>
          )}

          {/* Budgets */}
          {summary && summary.budget_status.length > 0 && (
            <Card>
              <CardTitle sub="Budget vs actual for this month">Budgets</CardTitle>
              <div className="grid gap-4 md:grid-cols-2">
                {summary.budget_status.map((b) => (
                  <div key={b.category} className="rounded-lg border border-ink-line p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-200">{b.label}</span>
                      <span className="text-xs text-gray-500">
                        {formatINR(b.actual)} / {formatINR(b.budget)}
                      </span>
                    </div>
                    <ProgressBar value={b.actual} max={b.budget} tone={b.pct_used > 90 ? 'danger' : b.pct_used > 70 ? 'warn' : 'default'} />
                    <p className="mt-1.5 text-xs text-gray-500">
                      {b.pct_used > 100 ? `${formatINR(b.actual - b.budget)} over budget` : `${formatINR(b.remaining)} remaining`}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Expense list */}
          <Card>
            <CardTitle sub={`${listApi.data?.length ?? 0} entries`}>Transactions</CardTitle>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-ink-line text-left text-[11px] uppercase tracking-wider text-gray-500">
                    <th className="pb-3 pr-4 font-medium">Date</th>
                    <th className="pb-3 pr-4 font-medium">Description</th>
                    <th className="pb-3 pr-4 font-medium">Category</th>
                    <th className="pb-3 pr-4 font-medium">Method</th>
                    <th className="pb-3 pr-4 text-right font-medium">Amount</th>
                    <th className="pb-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-line">
                  {listApi.data?.map((e) => (
                    <tr key={e.id} className="transition-colors hover:bg-ink-raised/60">
                      <td className="py-3 pr-4 text-gray-400">{formatDate(e.expense_date)}</td>
                      <td className="py-3 pr-4 font-medium text-gray-100">{e.description || '—'}</td>
                      <td className="py-3 pr-4 text-gray-300">{categoryLabels[e.category] ?? e.category}</td>
                      <td className="py-3 pr-4 text-xs capitalize text-gray-500">{e.payment_method.replace('_', ' ')}</td>
                      <td className="py-3 pr-4 text-right font-mono font-semibold text-gray-100">{formatINR(e.amount)}</td>
                      <td className="py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => openEdit(e)} className="rounded-md p-1.5 text-gray-500 hover:bg-ink-raised hover:text-accent-soft">
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button onClick={() => remove(e)} className="rounded-md p-1.5 text-gray-500 hover:bg-ink-raised hover:text-danger">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* Expense modal */}
      <Modal open={modalOpen} title={editing ? 'Edit expense' : 'Add expense'} onClose={() => setModalOpen(false)}>
        <form onSubmit={submit} className="space-y-4">
          {formError && <div className="rounded-lg border border-danger/20 bg-danger/10 p-3 text-sm text-danger">{formError}</div>}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Amount (₹)">
              <Input type="number" step="any" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
            </Field>
            <Field label="Date">
              <Input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} />
            </Field>
          </div>
          <Field label="Category">
            <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {categories.map((c) => (
                <option key={c} value={c}>{categoryLabels[c]}</option>
              ))}
            </Select>
          </Field>
          <Field label="Description">
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Groceries" />
          </Field>
          <Field label="Payment method">
            <Select value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}>
              {paymentMethods.map((p) => (
                <option key={p} value={p}>{p.replace('_', ' ').toUpperCase()}</option>
              ))}
            </Select>
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saveMutation.loading}>
              {saveMutation.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? 'Save changes' : 'Add expense'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Budget modal */}
      <Modal open={budgetOpen} title="Set monthly budget" onClose={() => setBudgetOpen(false)}>
        <form onSubmit={submitBudget} className="space-y-4">
          {formError && <div className="rounded-lg border border-danger/20 bg-danger/10 p-3 text-sm text-danger">{formError}</div>}
          <Field label="Category">
            <Select value={budgetCategory} onChange={(e) => setBudgetCategory(e.target.value)}>
              {categories.map((c) => (
                <option key={c} value={c}>{categoryLabels[c]}</option>
              ))}
            </Select>
          </Field>
          <Field label="Monthly limit (₹)">
            <Input type="number" step="any" min="0" value={budgetLimit} onChange={(e) => setBudgetLimit(Number(e.target.value))} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setBudgetOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={budgetMutation.loading}>
              {budgetMutation.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save budget'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
