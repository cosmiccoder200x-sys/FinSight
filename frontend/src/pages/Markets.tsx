import { Newspaper, Plus, Search, Star, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '../components/ui/Badge';
import { Card, CardTitle } from '../components/ui/Card';
import { ErrorState, Spinner } from '../components/ui/Feedback';
import { Input } from '../components/ui/Form';
import { useApi, useMutation } from '../hooks/useApi';
import { marketsApi, newsApi, watchlistApi } from '../services/finsight';
import type { NewsItem, Quote, SearchResult } from '../types';
import { formatDateTime, formatINR, formatPct, pnlColor } from '../utils/format';

export default function Markets() {
  const indicesApi = useApi<Quote[]>(() => marketsApi.indices(), []);
  const watchlistApiData = useApi(() => watchlistApi.list(), []);
  const newsData = useApi<NewsItem[]>(() => newsApi.get(), []);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const addMutation = useMutation(async (symbol: string) => watchlistApi.add(symbol));

  const watchQuotes = useApi<Quote[]>(
    () =>
      Promise.all(
        (watchlistApiData.data ?? []).map((w) => marketsApi.quote(w.symbol)),
      ),
    [watchlistApiData.data],
  );

  const doSearch = async (q: string) => {
    setQuery(q);
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      setResults(await marketsApi.search(q));
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const addToWatchlist = async (symbol: string) => {
    try {
      await addMutation.execute(symbol);
      watchlistApiData.refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add to watchlist');
    }
  };

  const removeFromWatchlist = async (id: number) => {
    try {
      await watchlistApi.remove(id);
      watchlistApiData.refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove');
    }
  };

  const sentimentTone = (s: string): 'positive' | 'neutral' | 'negative' =>
    s === 'positive' ? 'positive' : s === 'negative' ? 'negative' : 'neutral';

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-50">Markets</h1>
        <p className="text-sm text-gray-500">Indices, watchlist and financial news.</p>
      </div>

      {/* Indices */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {indicesApi.loading ? (
          <Spinner label="Loading indices…" />
        ) : indicesApi.error ? (
          <ErrorState message={indicesApi.error} onRetry={indicesApi.refetch} />
        ) : (
          indicesApi.data?.map((idx) => (
            <Link key={idx.symbol} to={`/markets/${encodeURIComponent(idx.symbol)}`} className="card card-hover p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{idx.name}</p>
              <p className="mt-2 text-2xl font-bold text-gray-50">{formatINR(idx.price)}</p>
              <p className={`text-sm font-medium ${pnlColor(idx.change_pct)}`}>
                {formatPct(idx.change_pct)}
              </p>
            </Link>
          ))
        )}
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        {/* Search + watchlist */}
        <div className="space-y-5">
          <Card>
            <CardTitle sub="Search stocks, funds & crypto">Search</CardTitle>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
              <Input value={query} onChange={(e) => doSearch(e.target.value)} placeholder="RELIANCE, TCS, BTC…" className="pl-9" />
            </div>
            {searching && <p className="mt-2 text-xs text-gray-500">Searching…</p>}
            {results.length > 0 && (
              <div className="mt-3 overflow-hidden rounded-lg border border-ink-line">
                {results.map((r) => (
                  <div key={r.symbol} className="flex items-center justify-between border-b border-ink-line bg-ink-soft px-3 py-2.5 last:border-0">
                    <Link to={`/markets/${encodeURIComponent(r.symbol)}`} className="min-w-0">
                      <p className="text-sm font-semibold text-gray-100">{r.symbol}</p>
                      <p className="truncate text-xs text-gray-500">{r.name}</p>
                    </Link>
                    <button onClick={() => addToWatchlist(r.symbol)} className="rounded-md p-1.5 text-gray-500 transition-colors hover:text-accent-soft" title="Add to watchlist">
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardTitle sub="Tracked by you">Watchlist</CardTitle>
            {(watchlistApiData.data ?? []).length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-500">Search above and tap + to add symbols.</p>
            ) : watchQuotes.loading ? (
              <Spinner label="Loading quotes…" />
            ) : (
              <div className="space-y-2">
                {(watchlistApiData.data ?? []).map((w) => {
                  const quote = watchQuotes.data?.find((q) => q.symbol === w.symbol);
                  return (
                    <div key={w.id} className="flex items-center justify-between rounded-lg border border-ink-line px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <Star className="h-3.5 w-3.5 text-warn" />
                        <Link to={`/markets/${encodeURIComponent(w.symbol)}`} className="text-sm font-semibold text-gray-100 hover:text-accent-soft">
                          {w.symbol}
                        </Link>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm text-gray-200">{quote ? formatINR(quote.price) : '—'}</span>
                        <span className={`text-xs font-medium ${pnlColor(quote?.change_pct ?? 0)}`}>{quote ? formatPct(quote.change_pct) : ''}</span>
                        <button onClick={() => removeFromWatchlist(w.id)} className="rounded-md p-1 text-gray-600 hover:text-danger">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* News */}
        <div className="xl:col-span-2">
          <Card>
            <CardTitle sub={newsData.data?.[0]?.is_demo ? 'Sample headlines (demo mode)' : 'Live headlines'}>
              <span className="flex items-center gap-2"><Newspaper className="h-4 w-4 text-accent-soft" /> Market News</span>
            </CardTitle>
            {newsData.loading ? (
              <Spinner label="Fetching headlines…" />
            ) : newsData.error ? (
              <ErrorState message={newsData.error} onRetry={newsData.refetch} />
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {newsData.data?.map((n) => (
                  <article key={n.id} className="rounded-lg border border-ink-line bg-ink-soft p-4 transition-colors hover:border-gray-600">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <Badge tone={sentimentTone(n.sentiment)}>{n.sentiment}</Badge>
                      <span className="text-[11px] text-gray-600">{formatDateTime(n.published_at)}</span>
                    </div>
                    <h3 className="text-sm font-medium leading-relaxed text-gray-100">{n.headline}</h3>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs text-gray-500">{n.source}</span>
                      {n.related_symbol && (
                        <Link to={`/markets/${encodeURIComponent(n.related_symbol)}`} className="text-xs font-semibold text-accent-soft hover:underline">
                          {n.related_symbol}
                        </Link>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
