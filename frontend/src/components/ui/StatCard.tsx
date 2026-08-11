import type { ReactNode } from 'react';
import { formatINR } from '../../utils/format';
import { pnlColor } from '../../utils/format';

export function StatCard({
  label,
  value,
  sub,
  delta,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  delta?: number;
  icon?: ReactNode;
}) {
  return (
    <div className="card card-hover p-5">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</p>
        {icon && <div className="text-gray-600">{icon}</div>}
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight text-gray-50">{value}</p>
      <div className="mt-1 flex items-center gap-2">
        {delta !== undefined && (
          <span className={`text-xs font-semibold ${pnlColor(delta)}`}>
            {delta > 0 ? '+' : ''}
            {delta.toFixed(2)}%
          </span>
        )}
        {sub && <span className="text-xs text-gray-500">{sub}</span>}
      </div>
    </div>
  );
}

export function CompactStat({ label, value, delta }: { label: string; value: number; delta?: number }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-gray-100">{formatINR(value)}</p>
      {delta !== undefined && <p className={`text-xs ${pnlColor(delta)}`}>{delta > 0 ? '+' : ''}{delta.toFixed(2)}%</p>}
    </div>
  );
}
