import { ArrowLeft, Star, TrendingDown, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AreaTrend } from '../components/charts/Charts';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, CardTitle } from '../components/ui/Card';
import { ErrorState, Spinner } from '../components/ui/Feedback';
import { Segmented } from '../components/ui/Segmented';
import { useApi } from '../hooks/useApi';
import { marketsApi, watchlistApi } from '../services/finsight';
import type { StockDetail } from '../types';
import { formatCompact, formatINR, formatPct, pnlColor } from '../utils/format';

const periods = ['1D', '1W', '1M', '3M', '6M', '1Y', '5Y'] as const;
type Period = (typeof periods)[number];

export default function StockDetail() {
  const { symbol = '' } = useParams<{ symbol: string }>();
  const [period, setPeriod] = useState<Period>('6M');
  const [watchAdded, setWatchAdded] = useState(false);
  const detail = useApi<StockDetail>(() => marketsApi.detail(symbol), [symbol]);
  const historyApi = useApi(() => marketsApi.history(symbol, period), [symbol, period]);

  const addToWatchlist = async () => {
    try {
      await watchlistApi.add(symbol);
      setWatchAdded(true);
      setTimeout(() => setWatchAdded(false), 1500);
    } catch {
      /* ignored */
    }
  };

  if (detail.loading) return <Spinner label="Fetching market data…" />;
  if (detail.error || !detail.data) return <ErrorState message={detail.error ?? 'Symbol not found'} />;

  const { quote, fundamentals } = detail.data;
  const isUp = quote.change_pct >= 0;
  const chartData = (historyApi.data ?? []).map((p) => ({ date: p.date, price: p.price }));

  const fundamentalsList = [
    { label: 'Market Cap', value: typeof fundamentals.market_cap === 'number' ? formatCompact(fundamentals.market_cap) : '—' },
    { label: 'P/E Ratio', value: fundamentals.pe_ratio ? String(fundamentals.pe_ratio) : '—' },
    { label: 'EPS', value: fundamentals.eps ? formatINR(Number(fundamentals.eps)) : '—' },
    { label: 'Dividend Yield', value: fundamentals.dividend_yield ? `${fundamentals.dividend_yield}%` : '—' },
    { label: 'Beta', value: fundamentals.beta ? String(fundamentals.beta) : '—' },
    { label: '52-week High', value: quote.fifty_two_week_high ? formatINR(quote.fifty_two_week_high) : '—' },
    { label: '52-week Low', value: quote.fifty_two_week_low ? formatINR(quote.fifty_two_week_low) : '—' },
    { label: 'Exchange', value: typeof fundamentals.exchange === 'string' ? fundamentals.exchange : '—' },
  ];

  return (
    <div className="space-y-5">
      <Link to="/markets" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to markets
      </Link>

      <div className="grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-50">{quote.symbol}</h1>
                <Badge tone={isUp ? 'positive' : 'negative'}>{isUp ? 'Up' : 'Down'}</Badge>
                {quote.is_demo && <Badge tone="warn">Demo data</Badge>}
              </div>
              <p className="mt-1 text-sm text-gray-500">{quote.name}</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-gray-50">{formatINR(quote.price)}</p>
              <p className={`mt-1 text-sm font-semibold ${pnlColor(quote.change_pct)}`}>
                <span className="inline-flex items-center gap-1">
                  {isUp ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  {formatPct(quote.change_pct)}
                </span>
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <Segmented options={periods.map((p) => ({ value: p, label: p }))} value={period} onChange={setPeriod} />
            <Button variant="ghost" onClick={addToWatchlist} disabled={watchAdded}>
              <Star className={`h-4 w-4 ${watchAdded ? 'fill-warn text-warn' : ''}`} />
              {watchAdded ? 'Added!' : 'Watchlist'}
            </Button>
          </div>

          <div className="mt-4">
            {historyApi.loading ? (
              <Spinner label="Building chart…" />
            ) : (
              <AreaTrend data={chartData} xKey="date" yKey="price" yFormatter={(v) => formatINR(v)} height={300} />
            )}
          </div>
        </Card>

        <Card>
          <CardTitle sub="Company fundamentals">Overview</CardTitle>
          <dl className="divide-y divide-ink-line">
            {fundamentalsList.map((f) => (
              <div key={f.label} className="flex items-center justify-between py-2.5">
                <dt className="text-xs text-gray-500">{f.label}</dt>
                <dd className="font-mono text-sm font-medium text-gray-200">{f.value}</dd>
              </div>
            ))}
          </dl>
          {quote.is_demo && (
            <p className="mt-4 rounded-lg border border-warn/20 bg-warn/5 p-3 text-xs leading-relaxed text-warn">
              Prices shown here are simulated demo data, not live quotes. Connect a market-data provider (e.g. Finnhub) in <code>.env</code> for real values.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
