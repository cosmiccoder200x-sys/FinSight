import { Edit3, Loader2, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AreaTrend, DonutChart } from '../components/charts/Charts';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, CardTitle } from '../components/ui/Card';
import { EmptyState, ErrorState, Spinner } from '../components/ui/Feedback';
import { Field, Input, Select } from '../components/ui/Form';
import { Modal } from '../components/ui/Modal';
import { Segmented } from '../components/ui/Segmented';
import { useApi, useMutation } from '../hooks/useApi';
import { portfolioApi } from '../services/finsight';
import type { Holding, HoldingInput } from '../types';
import { assetTypeLabel, formatINR, formatNumber, formatPct, pnlColor } from '../utils/format';

const periods = ['1D', '1W', '1M', '3M', '6M', '1Y', 'ALL'] as const;
type Period = (typeof periods)[number];

const emptyForm: HoldingInput = {
  asset_type: 'stock',
  symbol: '',
  name: '',
  quantity: 0,
  avg_buy_price: 0,
  purchase_date: new Date().toISOString().slice(0, 10),
  notes: '',
};

export default function Portfolio() {
  const holdingsApi = useApi<Holding[]>(() => portfolioApi.list(), []);
  const summaryApi = useApi(() => portfolioApi.summary(), []);
  const analyticsApi = useApi(() => portfolioApi.analytics(), []);
  const allocationApi = useApi(() => portfolioApi.allocation(), []);
  const [period, setPeriod] = useState<Period>('6M');
  const historyApi = useApi(() => portfolioApi.history(period), [period]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Holding | null>(null);
  const [form, setForm] = useState<HoldingInput>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [assetFilter, setAssetFilter] = useState('all');
  const [sortKey, setSortKey] = useState('value');

  const saveMutation = useMutation(async (input: HoldingInput) => {
    if (editing) await portfolioApi.update(editing.id, input);
    else await portfolioApi.create(input);
  });
  const deleteMutation = useMutation(async (id: number) => portfolioApi.remove(id));

  const refreshAll = () => {
    holdingsApi.refetch();
    summaryApi.refetch();
    analyticsApi.refetch();
    allocationApi.refetch();
    historyApi.refetch();
  };

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (h: Holding) => {
    setEditing(h);
    setForm({
      asset_type: h.asset_type,
      symbol: h.symbol,
      name: h.name,
      quantity: h.quantity,
      avg_buy_price: h.avg_buy_price,
      purchase_date: h.purchase_date ?? undefined,
      notes: h.notes,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!form.symbol.trim()) return setFormError('Symbol is required.');
    if (form.quantity <= 0) return setFormError('Quantity must be greater than zero.');
    if (form.avg_buy_price <= 0) return setFormError('Average buy price must be greater than zero.');
    try {
      await saveMutation.execute(form);
      setModalOpen(false);
      refreshAll();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save holding.');
    }
  };

  const remove = async (h: Holding) => {
    if (!window.confirm(`Delete ${h.symbol} from your portfolio?`)) return;
    try {
      await deleteMutation.execute(h.id);
      refreshAll();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete holding.');
    }
  };

  const filtered = useMemo(() => {
    let rows = holdingsApi.data ?? [];
    if (assetFilter !== 'all') rows = rows.filter((h) => h.asset_type === assetFilter);
    return [...rows].sort((a, b) => {
      if (sortKey === 'pnl') return b.pnl - a.pnl;
      if (sortKey === 'return') return b.return_pct - a.return_pct;
      if (sortKey === 'weight') return b.weight - a.weight;
      return b.current_value - a.current_value;
    });
  }, [holdingsApi.data, assetFilter, sortKey]);

  const summary = summaryApi.data;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-50">Portfolio</h1>
          <p className="text-sm text-gray-500">
            {summaryApi.data?.is_demo ? 'Prices use simulated demo data' : 'Live market prices'}
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4" /> Add holding
        </Button>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Value', value: summary?.total_value ?? 0 },
          { label: 'Total Invested', value: summary?.total_invested ?? 0 },
          { label: 'Total P&L', value: summary?.total_pnl ?? 0, isPnl: true },
          { label: "Today's P&L", value: summary?.today_pnl ?? 0, isPnl: true },
        ].map((s) => (
          <div key={s.label} className="card card-hover p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{s.label}</p>
            <p className={`mt-2 text-2xl font-bold ${s.isPnl ? pnlColor(s.value) : 'text-gray-50'}`}>
              {s.value >= 0 && s.isPnl ? '+' : ''}
              {formatINR(s.value)}
            </p>
          </div>
        ))}
      </div>

      {holdingsApi.loading ? (
        <Spinner label="Loading portfolio…" />
      ) : holdingsApi.error ? (
        <ErrorState message={holdingsApi.error} onRetry={holdingsApi.refetch} />
      ) : (holdingsApi.data ?? []).length === 0 ? (
        <Card>
          <EmptyState
            title="No holdings yet"
            message="Add your first investment to start tracking your portfolio — value, P&L, allocation and risk."
            action={
              <Button onClick={openAdd}>
                <Plus className="h-4 w-4" /> Add your first holding
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          {/* Chart + allocation */}
          <div className="grid gap-5 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <CardTitle sub={summary?.is_demo ? 'Simulated price history' : 'Market price history'}>
                  Portfolio Value Over Time
                </CardTitle>
                <Segmented options={periods.map((p) => ({ value: p, label: p }))} value={period} onChange={setPeriod} />
              </div>
              {historyApi.loading ? (
                <Spinner label="Building chart…" />
              ) : (
                <AreaTrend
                  data={(historyApi.data ?? []).map((p) => ({ date: p.date, value: p.price }))}
                  xKey="date"
                  yKey="value"
                  yFormatter={(v) => formatINR(v)}
                  height={280}
                />
              )}
            </Card>

            <Card>
              <CardTitle sub="By asset type">Allocation</CardTitle>
              {(allocationApi.data?.slices ?? []).length > 0 ? (
                <>
                  <DonutChart
                    data={allocationApi.data?.slices ?? []}
                    centerLabel="Total"
                    centerValue={formatINR(allocationApi.data?.total ?? 0)}
                    height={190}
                  />
                  <div className="mt-3 space-y-2">
                    {allocationApi.data?.slices.map((s) => (
                      <div key={s.name} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-gray-400">
                          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
                          {s.name}
                        </span>
                        <span className="font-medium text-gray-200">{s.pct}%</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}
              {analyticsApi.data ? (
                <div className="mt-4 grid grid-cols-2 gap-3 text-center">
                  <div className="rounded-lg bg-ink-raised p-3">
                    <p className="text-[10px] uppercase tracking-wider text-gray-500">Volatility</p>
                    <p className="mt-1 text-sm font-semibold text-gray-200">{analyticsApi.data.volatility_pct}%</p>
                  </div>
                  <div className="rounded-lg bg-ink-raised p-3">
                    <p className="text-[10px] uppercase tracking-wider text-gray-500">Sharpe</p>
                    <p className="mt-1 text-sm font-semibold text-gray-200">{analyticsApi.data.sharpe_ratio}</p>
                  </div>
                  <div className="rounded-lg bg-ink-raised p-3">
                    <p className="text-[10px] uppercase tracking-wider text-gray-500">Max drawdown</p>
                    <p className="mt-1 text-sm font-semibold text-danger">{analyticsApi.data.max_drawdown_pct}%</p>
                  </div>
                  <div className="rounded-lg bg-ink-raised p-3">
                    <p className="text-[10px] uppercase tracking-wider text-gray-500">Diversification</p>
                    <p className="mt-1 text-sm font-semibold text-gray-200">{analyticsApi.data.diversification_score}</p>
                  </div>
                </div>
              ) : (
                <Spinner label="Computing metrics…" />
              )}
            </Card>
          </div>

          {/* Holdings table */}
          <Card>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <CardTitle sub={`${filtered.length} holdings`}>
                Holdings
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={assetFilter} onChange={(e) => setAssetFilter(e.target.value)} className="w-auto py-1.5 text-xs">
                  <option value="all">All asset types</option>
                  {Object.entries(assetTypeLabel).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </Select>
                <Select value={sortKey} onChange={(e) => setSortKey(e.target.value)} className="w-auto py-1.5 text-xs">
                  <option value="value">Sort: Value</option>
                  <option value="pnl">Sort: P&L</option>
                  <option value="return">Sort: Return</option>
                  <option value="weight">Sort: Weight</option>
                </Select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-ink-line text-left text-[11px] uppercase tracking-wider text-gray-500">
                    <th className="pb-3 pr-4 font-medium">Symbol</th>
                    <th className="pb-3 pr-4 font-medium">Qty</th>
                    <th className="pb-3 pr-4 font-medium">Avg Price</th>
                    <th className="pb-3 pr-4 font-medium">Current</th>
                    <th className="pb-3 pr-4 text-right font-medium">Invested</th>
                    <th className="pb-3 pr-4 text-right font-medium">Value</th>
                    <th className="pb-3 pr-4 text-right font-medium">P&L</th>
                    <th className="pb-3 pr-4 text-right font-medium">Return</th>
                    <th className="pb-3 pr-4 text-right font-medium">Weight</th>
                    <th className="pb-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-line">
                  {filtered.map((h) => (
                    <tr key={h.id} className="transition-colors hover:bg-ink-raised/60">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-100">{h.symbol}</span>
                          <Badge tone="neutral">{assetTypeLabel[h.asset_type] ?? h.asset_type}</Badge>
                        </div>
                        <p className="text-xs text-gray-500">{h.name}</p>
                      </td>
                      <td className="py-3 pr-4 text-gray-300">{formatNumber(h.quantity)}</td>
                      <td className="py-3 pr-4 font-mono text-gray-300">{formatINR(h.avg_buy_price)}</td>
                      <td className="py-3 pr-4 font-mono text-gray-200">{formatINR(h.current_price)}</td>
                      <td className="py-3 pr-4 text-right font-mono text-gray-300">{formatINR(h.invested)}</td>
                      <td className="py-3 pr-4 text-right font-mono font-semibold text-gray-100">{formatINR(h.current_value)}</td>
                      <td className={`py-3 pr-4 text-right font-mono font-semibold ${pnlColor(h.pnl)}`}>
                        {h.pnl >= 0 ? '+' : ''}
                        {formatINR(h.pnl)}
                      </td>
                      <td className={`py-3 pr-4 text-right font-mono ${pnlColor(h.return_pct)}`}>{formatPct(h.return_pct)}</td>
                      <td className="py-3 pr-4 text-right font-mono text-gray-300">{h.weight}%</td>
                      <td className="py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => openEdit(h)} className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-ink-raised hover:text-accent-soft" title="Edit">
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button onClick={() => remove(h)} className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-ink-raised hover:text-danger" title="Delete">
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

      <Modal open={modalOpen} title={editing ? `Edit ${editing.symbol}` : 'Add holding'} onClose={() => setModalOpen(false)}>
        <form onSubmit={submit} className="space-y-4">
          {formError && (
            <div className="rounded-lg border border-danger/20 bg-danger/10 p-3 text-sm text-danger">{formError}</div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Asset type">
              <Select value={form.asset_type} onChange={(e) => setForm({ ...form, asset_type: e.target.value })}>
                {Object.entries(assetTypeLabel).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </Select>
            </Field>
            <Field label="Symbol">
              <Input value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} placeholder="RELIANCE" />
            </Field>
          </div>
          <Field label="Name">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Reliance Industries" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Quantity">
              <Input type="number" step="any" min="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
            </Field>
            <Field label="Average buy price">
              <Input type="number" step="any" min="0" value={form.avg_buy_price} onChange={(e) => setForm({ ...form, avg_buy_price: Number(e.target.value) })} />
            </Field>
          </div>
          <Field label="Purchase date">
            <Input type="date" value={form.purchase_date ?? ''} onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} />
          </Field>
          <Field label="Notes (optional)">
            <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="SIP, lumpsum, etc." />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saveMutation.loading}>
              {saveMutation.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? 'Save changes' : 'Add holding'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
