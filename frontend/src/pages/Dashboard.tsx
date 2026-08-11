import { ArrowUpRight, Brain, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AreaTrend, DonutChart } from '../components/charts/Charts';
import { Card, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { ErrorState, Spinner } from '../components/ui/Feedback';
import { Segmented } from '../components/ui/Segmented';
import { StatCard } from '../components/ui/StatCard';
import { ProgressBar, ScoreRing } from '../components/ui/Progress';
import { useApi } from '../hooks/useApi';
import { dashboardApi, portfolioApi } from '../services/finsight';
import type { Dashboard } from '../types';
import { formatCompact, formatDate, formatINR, formatPct, pnlColor } from '../utils/format';

const periods = ['1D', '1W', '1M', '3M', '6M', '1Y', 'ALL'] as const;
type Period = (typeof periods)[number];

export default function Dashboard() {
  const { data, loading, error, refetch } = useApi<Dashboard>(() => dashboardApi.get(), []);
  const [period, setPeriod] = useState<Period>('6M');

  const history = useApi(() => portfolioApi.history(period), [period]);

  if (loading) return <Spinner label="Loading your dashboard…" />;
  if (error || !data) return <ErrorState message={error ?? 'Could not load dashboard'} onRetry={refetch} />;

  const chartData = (history.data ?? data.portfolio_history).map((p) => ({ date: p.date, value: p.price }));

  return (
    <div className="space-y-5">
      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Net Worth" value={formatINR(data.net_worth)} icon={<Wallet className="h-4 w-4" />} />
        <StatCard label="Invested" value={formatINR(data.invested)} />
        <StatCard
          label="Total P&L"
          value={`${data.total_pnl >= 0 ? '+' : ''}${formatINR(data.total_pnl)}`}
          delta={data.pnl_pct}
          icon={data.total_pnl >= 0 ? <TrendingUp className="h-4 w-4 text-accent-soft" /> : <TrendingDown className="h-4 w-4 text-danger" />}
        />
        <StatCard label="Monthly Savings" value={data.monthly_savings !== null ? formatINR(data.monthly_savings ?? 0) : '—'} sub={data.monthly_savings === null ? 'Add income in Settings' : 'vs. your income'} />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        {/* Portfolio performance */}
        <Card className="xl:col-span-2">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <CardTitle>
              Portfolio Performance
              <span className="block text-xs text-gray-500">{data.data_basis === 'simulated' ? 'Prices are simulated demo data' : 'Live data'}</span>
            </CardTitle>
            <Segmented options={periods.map((p) => ({ value: p, label: p }))} value={period} onChange={setPeriod} />
          </div>
          {history.loading ? (
            <Spinner label="Building chart…" />
          ) : (
            <AreaTrend data={chartData} xKey="date" yKey="value" yFormatter={(v) => formatCompact(v)} height={300} />
          )}
        </Card>

        {/* Asset allocation */}
        <Card>
          <CardTitle sub="Based on current market value">
            Asset Allocation
          </CardTitle>
          {data.allocation.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-500">Add holdings to see your allocation.</p>
          ) : (
            <>
              <DonutChart data={data.allocation} centerLabel="Total" centerValue={formatCompact(data.allocation.reduce((a, b) => a + b.value, 0))} height={200} />
              <div className="mt-4 space-y-2">
                {data.allocation.map((slice) => (
                  <div key={slice.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-gray-400">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: slice.color }} />
                      {slice.name}
                    </span>
                    <span className="font-medium text-gray-200">{slice.pct}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        {/* Financial health */}
        <Card>
          <CardTitle sub="0–100 across six components">
            Financial Health
          </CardTitle>
          {data.health_preview.overall_score > 0 ? (
            <div className="flex items-center gap-5">
              <ScoreRing score={data.health_preview.overall_score} size={104} />
              <div className="flex-1 space-y-2.5">
                {data.health_preview.components.map((c) => (
                  <div key={c.key}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="text-gray-400">{c.label}</span>
                      <span className="text-gray-300">{c.score}</span>
                    </div>
                    <ProgressBar value={c.score} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-gray-500">Complete your profile to score your health.</p>
          )}
          <Link to="/financial-health" className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-accent-soft hover:underline">
            Full report <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </Card>

        {/* Recent transactions */}
        <Card>
          <CardTitle sub="Latest portfolio activity">
            Recent Transactions
          </CardTitle>
          {data.recent_transactions.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">No transactions yet. Add a holding to get started.</p>
          ) : (
            <div className="divide-y divide-ink-line">
              {data.recent_transactions.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-raised text-accent-soft">
                      <TrendingUp className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-200">{t.description}</p>
                      <p className="text-xs text-gray-500">{formatDate(t.date)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-100">{formatINR(t.amount)}</p>
                    <p className="text-xs capitalize text-gray-500">{t.category.replace('_', ' ')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Top holdings */}
        <Card>
          <CardTitle sub="Largest positions by value">
            Top Holdings
          </CardTitle>
          {data.top_holdings.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">No holdings tracked.</p>
          ) : (
            <div className="space-y-3">
              {data.top_holdings.map((h) => (
                <Link key={h.symbol} to={`/markets/${h.symbol}`} className="block rounded-lg border border-ink-line p-3 transition-colors hover:bg-ink-raised">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-100">{h.symbol}</p>
                      <p className="text-xs text-gray-500">{h.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-100">{formatINR(h.value)}</p>
                      <p className={`text-xs ${pnlColor(h.pnl)}`}>
                        {h.pnl >= 0 ? '+' : ''}
                        {formatINR(h.pnl)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-raised">
                      <div className="h-full rounded-full bg-accent/70" style={{ width: `${h.weight}%` }} />
                    </div>
                    <span className="text-xs text-gray-500">{h.weight}%</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        {/* Market snapshot */}
        <Card className="xl:col-span-2">
          <CardTitle sub="Tracked indices & markets">
            Market Snapshot
          </CardTitle>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {data.market_snapshot.map((m) => (
              <Link key={m.symbol} to={`/markets/${m.symbol}`} className="rounded-lg border border-ink-line p-3 transition-colors hover:bg-ink-raised">
                <p className="text-xs font-semibold text-gray-300">{m.symbol}</p>
                <p className="mt-1.5 text-sm font-bold text-gray-50">{formatINR(m.price)}</p>
                <p className={`text-xs ${pnlColor(m.change_pct)}`}>{formatPct(m.change_pct)}</p>
              </Link>
            ))}
          </div>
        </Card>

        {/* AI insight */}
        <Card>
          <CardTitle sub={data.ai_insight?.basis === 'ai' ? 'Generated by AI from your data' : 'Computed from your data'}>
            AI Insight
          </CardTitle>
          {data.ai_insight ? (
            <div className="flex items-start gap-3 rounded-lg border border-accent/20 bg-accent-dim/20 p-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent-soft">
                <Brain className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm leading-relaxed text-gray-200">{data.ai_insight.text}</p>
                <div className="mt-3">
                  <Badge tone="accent">{data.ai_insight.generated ? 'AI generated' : 'Local analysis'}</Badge>
                </div>
              </div>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-gray-500">Insights appear once you add data.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
