import { AlertTriangle, Loader2, RotateCcw } from 'lucide-react';
import { useCallback, useState } from 'react';
import { DualTrend } from '../components/charts/Charts';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, CardTitle } from '../components/ui/Card';
import { ErrorState } from '../components/ui/Feedback';
import { Field, Input, Select } from '../components/ui/Form';
import { Segmented } from '../components/ui/Segmented';
import { useApi } from '../hooks/useApi';
import { simulatorApi } from '../services/finsight';
import type { SimulationResult } from '../types';
import { formatINR } from '../utils/format';

interface ScenarioKey {
  label: string;
  annual_return_pct: number;
  inflation_pct: number;
}

type ScenarioName = 'conservative' | 'moderate' | 'aggressive' | 'custom';

interface FormState {
  initial: number;
  monthly: number;
  returnPct: number;
  inflation: number;
  years: number;
}

export default function Simulator() {
  const scenariosApi = useApi<Record<string, ScenarioKey>>(() => simulatorApi.scenarios(), []);
  const [scenario, setScenario] = useState<ScenarioName>('moderate');
  const [form, setForm] = useState<FormState>({ initial: 100000, monthly: 10000, returnPct: 10, inflation: 6, years: 15 });
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyScenario = useCallback(
    (key: ScenarioName) => {
      const sc = scenariosApi.data?.[key];
      if (sc) {
        setScenario(key);
        setForm((f) => ({ ...f, returnPct: sc.annual_return_pct, inflation: sc.inflation_pct }));
      } else {
        setScenario('custom');
      }
    },
    [scenariosApi.data],
  );

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await simulatorApi.run({
        initial_investment: form.initial,
        monthly_contribution: form.monthly,
        annual_return_pct: form.returnPct,
        inflation_pct: form.inflation,
        years: form.years,
        scenario_name: scenario,
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Simulation failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-50">Investment Simulator</h1>
        <p className="text-sm text-gray-500">
          Model contributions and growth. Assumptions are clearly labelled — this is a simulation, not a prediction.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Card>
          <CardTitle sub="Scenario presets adjust return & inflation assumptions">
            Inputs
          </CardTitle>
          <div className="mb-4">
            <Segmented
              options={[
                { value: 'conservative', label: 'Conservative' },
                { value: 'moderate', label: 'Moderate' },
                { value: 'aggressive', label: 'Aggressive' },
                { value: 'custom', label: 'Custom' },
              ]}
              value={scenario}
              onChange={(v) => {
                setScenario(v);
                applyScenario(v);
              }}
            />
          </div>

          <div className="space-y-4">
            <Field label="Initial investment (₹)">
              <Input type="number" min="0" value={form.initial} onChange={(e) => setForm({ ...form, initial: Number(e.target.value) })} />
            </Field>
            <Field label="Monthly contribution (₹)">
              <Input type="number" min="0" value={form.monthly} onChange={(e) => setForm({ ...form, monthly: Number(e.target.value) })} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Expected return / yr (%)" hint={scenario !== 'custom' ? 'From scenario preset' : 'Your assumption'}>
                <Input type="number" step="any" min="0" max="100" value={form.returnPct} onChange={(e) => { setForm({ ...form, returnPct: Number(e.target.value) }); if (scenario !== 'custom') setScenario('custom'); }} />
              </Field>
              <Field label="Inflation / yr (%)">
                <Input type="number" step="any" min="0" max="30" value={form.inflation} onChange={(e) => setForm({ ...form, inflation: Number(e.target.value) })} />
              </Field>
            </div>
            <Field label="Duration (years)">
              <Select value={form.years} onChange={(e) => setForm({ ...form, years: Number(e.target.value) })}>
                {[1, 3, 5, 10, 15, 20, 25, 30].map((y) => (
                  <option key={y} value={y}>{y} years</option>
                ))}
              </Select>
            </Field>
            <Button onClick={run} disabled={loading} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Run simulation'}
            </Button>
            {result && (
              <Button variant="ghost" onClick={run} className="w-full">
                <RotateCcw className="h-3.5 w-3.5" /> Recalculate
              </Button>
            )}
          </div>
        </Card>

        <Card className="xl:col-span-2">
          {error ? (
            <ErrorState message={error} />
          ) : result ? (
            <>
              <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                <CardTitle sub="Growth of your contributions over time">Results</CardTitle>
                <Badge tone="warn">{scenario.charAt(0).toUpperCase() + scenario.slice(1)} scenario · {result.annual_return_pct}% return</Badge>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: 'Total Contributions', value: result.total_contributions },
                  { label: 'Estimated Final Value', value: result.estimated_final_value, highlight: true },
                  { label: 'Estimated Gains', value: result.estimated_gains, gain: true },
                  { label: 'Inflation-Adjusted', value: result.inflation_adjusted_value },
                ].map((s) => (
                  <div key={s.label} className={`rounded-lg border p-4 ${s.highlight ? 'border-accent/30 bg-accent-dim/20' : 'border-ink-line bg-ink-soft'}`}>
                    <p className="text-[11px] uppercase tracking-wider text-gray-500">{s.label}</p>
                    <p className={`mt-1.5 text-lg font-bold ${s.gain ? 'text-accent-soft' : 'text-gray-50'}`}>{formatINR(s.value)}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <CardTitle sub="Contributed vs projected value, year by year">Growth Chart</CardTitle>
                <DualTrend
                  data={result.chart.map((p) => ({ year: p.year, contributed: p.contributed, value: p.value }))}
                  yFormatter={(v) => formatINR(v)}
                  height={320}
                />
              </div>

              <div className="mt-6 flex items-start gap-2 rounded-lg border border-warn/20 bg-warn/5 p-3 text-xs leading-relaxed text-warn">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  {result.disclaimer} Inflation-adjusted value assumes {result.inflation_pct}% annual inflation. Assumptions are
                  historical-average-style figures, not guarantees.
                </span>
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center py-24 text-center">
              <p className="text-4xl">📈</p>
              <h3 className="mt-4 text-base font-semibold text-gray-100">Set your assumptions and run it</h3>
              <p className="mt-2 max-w-sm text-sm text-gray-500">
                Enter an initial amount, monthly contribution, expected return and duration, then hit “Run simulation”.
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
