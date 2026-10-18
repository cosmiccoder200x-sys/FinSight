import { Check, Loader2, Plus, Target, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../components/ui/Button';
import { Card, CardTitle } from '../components/ui/Card';
import { EmptyState, ErrorState, Spinner } from '../components/ui/Feedback';
import { Field, Input } from '../components/ui/Form';
import { Modal } from '../components/ui/Modal';
import { ProgressBar } from '../components/ui/Progress';
import { useApi, useMutation } from '../hooks/useApi';
import { goalsApi } from '../services/finsight';
import type { FinancialGoal } from '../types';
import { formatINR } from '../utils/format';

const emptyForm = { name: '', target_amount: 0, target_date: '', notes: '' };

export default function Goals() {
  const goalsApiResult = useApi<FinancialGoal[]>(() => goalsApi.list(), []);
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [contributionGoal, setContributionGoal] = useState<FinancialGoal | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [contribution, setContribution] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const saveGoal = useMutation(async () => goalsApi.create({
    ...form,
    target_date: form.target_date || null,
  }));
  const addContribution = useMutation(async () => {
    if (!contributionGoal) return;
    await goalsApi.contribute(contributionGoal.id, contribution);
  });
  const deleteGoal = useMutation(async (id: number) => goalsApi.remove(id));

  const submitGoal = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!form.name.trim()) return setError('Add a name for your goal.');
    if (form.target_amount <= 0) return setError('Target amount must be greater than zero.');
    try {
      await saveGoal.execute();
      setGoalModalOpen(false);
      setForm(emptyForm);
      goalsApiResult.refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this goal.');
    }
  };

  const submitContribution = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (contribution <= 0) return setError('Contribution must be greater than zero.');
    try {
      await addContribution.execute();
      setContributionGoal(null);
      setContribution(0);
      goalsApiResult.refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add this contribution.');
    }
  };

  const removeGoal = async (goal: FinancialGoal) => {
    if (!window.confirm(`Delete "${goal.name}" and its contribution history?`)) return;
    try {
      await deleteGoal.execute(goal.id);
      goalsApiResult.refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete this goal.');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-50">Savings goals</h1>
          <p className="text-sm text-gray-500">Turn a big goal into a manageable monthly savings plan.</p>
        </div>
        <Button onClick={() => { setError(null); setGoalModalOpen(true); }}>
          <Plus className="h-4 w-4" /> New goal
        </Button>
      </div>

      {goalsApiResult.loading ? (
        <Spinner label="Loading your goals…" />
      ) : goalsApiResult.error ? (
        <ErrorState message={goalsApiResult.error} onRetry={goalsApiResult.refetch} />
      ) : (goalsApiResult.data ?? []).length === 0 ? (
        <Card>
          <EmptyState
            title="Start with one goal"
            message="Build an emergency fund, save for a trip, or plan a major purchase. Add contributions as you go and see the monthly pace needed to reach your target."
            action={<Button onClick={() => setGoalModalOpen(true)}><Target className="h-4 w-4" /> Create a savings goal</Button>}
          />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {goalsApiResult.data?.map((goal) => {
            const complete = goal.remaining_amount <= 0;
            const overdue = goal.target_date !== null && new Date(`${goal.target_date}T00:00:00`) < new Date(new Date().toDateString()) && !complete;
            return (
              <Card key={goal.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle sub={goal.target_date ? `${overdue ? 'Target date passed' : 'Target date'} · ${new Date(`${goal.target_date}T00:00:00`).toLocaleDateString()}` : 'No target date set'}>
                      {goal.name}
                    </CardTitle>
                  </div>
                  <button
                    type="button"
                    aria-label={`Delete ${goal.name}`}
                    onClick={() => removeGoal(goal)}
                    className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-ink-raised hover:text-danger"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-4 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs text-gray-500">Saved so far</p>
                    <p className="mt-1 text-xl font-bold text-gray-50">{formatINR(goal.saved_amount)}</p>
                  </div>
                  <p className="text-right text-sm text-gray-400">of {formatINR(goal.target_amount)}</p>
                </div>
                <div className="mt-3">
                  <ProgressBar value={goal.progress_pct} max={100} tone={complete ? 'default' : 'warn'} />
                  <p className="mt-1.5 text-xs text-gray-500">
                    {complete ? 'Goal reached!' : `${goal.progress_pct}% complete · ${formatINR(goal.remaining_amount)} to go`}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-ink-line pt-4">
                  <p className="text-sm text-gray-400">
                    {complete ? (
                      <span className="inline-flex items-center gap-1 text-accent-soft"><Check className="h-4 w-4" /> Completed</span>
                    ) : overdue ? (
                      <>Choose a new target date to estimate your monthly pace</>
                    ) : goal.monthly_contribution !== null ? (
                      <>Save about <strong className="text-gray-200">{formatINR(goal.monthly_contribution)}/mo</strong> to reach your target</>
                    ) : (
                      <>Set a target date to see your monthly savings pace</>
                    )}
                  </p>
                  {!complete && (
                    <Button variant="ghost" onClick={() => { setError(null); setContributionGoal(goal); }}>
                      <Plus className="h-4 w-4" /> Add savings
                    </Button>
                  )}
                </div>
                {goal.notes && <p className="mt-3 text-xs text-gray-500">{goal.notes}</p>}
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={goalModalOpen} title="Create a savings goal" onClose={() => setGoalModalOpen(false)}>
        <form onSubmit={submitGoal} className="space-y-4">
          <Field label="What are you saving for?">
            <Input autoFocus maxLength={120} placeholder="e.g. Emergency fund" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Target amount (₹)">
            <Input type="number" min="1" step="0.01" value={form.target_amount || ''} onChange={(e) => setForm({ ...form, target_amount: Number(e.target.value) })} />
          </Field>
          <Field label="Target date (optional)" hint="We'll estimate a monthly savings pace from this date.">
            <Input type="date" value={form.target_date} onChange={(e) => setForm({ ...form, target_date: e.target.value })} />
          </Field>
          <Field label="Notes (optional)">
            <Input maxLength={500} placeholder="Anything you want to remember" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setGoalModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saveGoal.loading}>
              {saveGoal.loading && <Loader2 className="h-4 w-4 animate-spin" />} Create goal
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={contributionGoal !== null} title={`Add savings${contributionGoal ? ` · ${contributionGoal.name}` : ''}`} onClose={() => setContributionGoal(null)}>
        <form onSubmit={submitContribution} className="space-y-4">
          <Field label="Amount added (₹)">
            <Input autoFocus type="number" min="0.01" step="0.01" value={contribution || ''} onChange={(e) => setContribution(Number(e.target.value))} />
          </Field>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setContributionGoal(null)}>Cancel</Button>
            <Button type="submit" disabled={addContribution.loading}>
              {addContribution.loading && <Loader2 className="h-4 w-4 animate-spin" />} Add savings
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
