export const formatINR = (value: number): string => {
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  return `${sign}₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(abs)}`;
};

export const formatINRExact = (value: number): string => {
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  return `${sign}₹${new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(abs)}`;
};

export const formatCompact = (value: number): string => {
  const abs = Math.abs(value);
  if (abs >= 1_00_00_000) return `${formatINR(value)} Cr`;
  if (abs >= 1_00_000) return `${formatINR(value)} L`;
  return formatINR(value);
};

export const formatPct = (value: number): string => {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
};

export const formatDate = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const formatDateTime = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
};

export const formatNumber = (value: number, digits = 2): string =>
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: digits }).format(value);

export const capitalize = (s: string): string => (s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ') : s);

export const pnlColor = (value: number): string => {
  if (value > 0) return 'text-accent-soft';
  if (value < 0) return 'text-danger';
  return 'text-gray-400';
};

export const assetTypeLabel: Record<string, string> = {
  stock: 'Stock',
  etf: 'ETF',
  mutual_fund: 'Mutual Fund',
  crypto: 'Crypto',
  gold: 'Gold',
  cash: 'Cash',
  other: 'Other',
};
