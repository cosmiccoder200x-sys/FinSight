import { Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardTitle } from '../components/ui/Card';
import { ErrorState, Spinner } from '../components/ui/Feedback';
import { ProgressBar, ScoreRing } from '../components/ui/Progress';
import { useApi } from '../hooks/useApi';
import { healthApi } from '../services/finsight';
import type { FinancialHealth } from '../types';

export default function FinancialHealth() {
  const { data, loading, error, refetch } = useApi<FinancialHealth>(() => healthApi.get(), []);

  if (loading) return <Spinner label="Scoring your financial health…" />;
  if (error || !data) return <ErrorState message={error ?? 'Could not load health score'} onRetry={refetch} />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-50">Financial Health</h1>
        <p className="text-sm text-gray-500">
          Educational scoring across six components. Not a diagnosis and not financial advice.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        {/* Score */}
        <Card className="flex flex-col items-center justify-center py-10">
          <ScoreRing score={data.overall_score} size={160} />
          <div className="mt-4 flex items-center gap-2">
            <span className="text-2xl font-bold text-gray-50">{data.grade}</span>
            <span className="text-sm text-gray-500">grade</span>
          </div>
          <p className="mt-4 max-w-xs text-center text-sm leading-relaxed text-gray-400">{data.summary}</p>
        </Card>

        {/* Components */}
        <Card className="xl:col-span-2">
          <CardTitle sub="Each component is scored 0–100 from your data">
            Component Breakdown
          </CardTitle>
          <div className="space-y-6">
            {data.components.map((c) => (
              <div key={c.key}>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-200">{c.label}</span>
                  <span className="text-sm font-semibold text-gray-100">{c.score}/100</span>
                </div>
                <ProgressBar value={c.score} tone={c.score >= 70 ? 'default' : c.score >= 40 ? 'warn' : 'danger'} />
                <p className="mt-1.5 text-xs leading-relaxed text-gray-500">{c.explanation}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent-soft" />
          <p className="text-sm leading-relaxed text-gray-400">
            Your score is calculated from the data you’ve entered: monthly income and debt in{' '}
            <Link to="/settings?tab=profile" className="font-medium text-accent-soft hover:underline">Settings</Link>, your
            expenses, and your holdings. Add more data over time for a fuller picture. This score uses common heuristics and is
            intended for education and awareness — it is not a credit score or financial advice.
          </p>
        </div>
      </Card>

      <Card>
        <CardTitle sub="Ideas to improve">Next Steps</CardTitle>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            { title: 'Build your emergency buffer', desc: 'Aim for 3–6 months of expenses set aside. The Emergency Fund score tracks this.' },
            { title: 'Automate savings', desc: 'Move a fixed percentage of income to savings right after payday to boost your Cash Flow score.' },
            { title: 'Start investing gradually', desc: 'Even small monthly amounts add up — use the Simulator to see the long-term effect.' },
          ].map((s) => (
            <div key={s.title} className="rounded-lg border border-ink-line bg-ink-soft p-4">
              <h3 className="text-sm font-semibold text-gray-100">{s.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-gray-500">{s.desc}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
