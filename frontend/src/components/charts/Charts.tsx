import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const axisStyle = { fontSize: 11, fill: '#6B7280' };
const tooltipStyle = {
  backgroundColor: '#11141B',
  border: '1px solid #1F2430',
  borderRadius: 8,
  fontSize: 12,
  color: '#E5E7EB',
};

export function AreaTrend({
  data,
  xKey,
  yKey,
  color = '#10B981',
  height = 280,
  yFormatter,
}: {
  data: Record<string, unknown>[];
  xKey: string;
  yKey: string;
  color?: string;
  height?: number;
  yFormatter?: (v: number) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`grad-${yKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#1A1F29" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey={xKey} tick={axisStyle} tickLine={false} axisLine={{ stroke: '#1F2430' }} minTickGap={24} />
        <YAxis
          tick={axisStyle}
          tickLine={false}
          axisLine={false}
          width={64}
          tickFormatter={(v: number) => (yFormatter ? yFormatter(v) : String(v))}
          domain={['auto', 'auto']}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value: number | string) => [yFormatter ? yFormatter(Number(value)) : String(value), '']}
          labelStyle={{ color: '#9CA3AF', marginBottom: 4 }}
        />
        <Area type="monotone" dataKey={yKey} stroke={color} strokeWidth={2} fill={`url(#grad-${yKey})`} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({
  data,
  height = 240,
  valueKey = 'value',
  labelKey = 'name',
  centerLabel,
  centerValue,
}: {
  data: { name: string; value: number; color?: string }[];
  height?: number;
  valueKey?: string;
  labelKey?: string;
  centerLabel?: string;
  centerValue?: string;
}) {
  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey={valueKey} nameKey={labelKey} innerRadius="62%" outerRadius="88%" paddingAngle={3} stroke="none">
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color ?? '#10B981'} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} formatter={(v: number | string) => [String(v), '']} />
        </PieChart>
      </ResponsiveContainer>
      {centerLabel && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs text-gray-500">{centerLabel}</span>
          <span className="text-lg font-bold text-gray-50">{centerValue}</span>
        </div>
      )}
    </div>
  );
}

export function SimpleBars({
  data,
  xKey,
  yKey,
  color = '#10B981',
  height = 240,
  yFormatter,
}: {
  data: Record<string, unknown>[];
  xKey: string;
  yKey: string;
  color?: string;
  height?: number;
  yFormatter?: (v: number) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#1A1F29" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey={xKey} tick={axisStyle} tickLine={false} axisLine={{ stroke: '#1F2430' }} minTickGap={20} />
        <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={56} tickFormatter={(v: number) => (yFormatter ? yFormatter(v) : String(v))} />
        <Tooltip contentStyle={tooltipStyle} formatter={(value: number | string) => [yFormatter ? yFormatter(Number(value)) : String(value), '']} />
        <Bar dataKey={yKey} fill={color} radius={[4, 4, 0, 0]} maxBarSize={42} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DualTrend({
  data,
  height = 300,
  yFormatter,
}: {
  data: Record<string, unknown>[];
  height?: number;
  yFormatter?: (v: number) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="grad-contributed" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#60A5FA" stopOpacity={0.18} />
            <stop offset="100%" stopColor="#60A5FA" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="grad-value" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10B981" stopOpacity={0.28} />
            <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#1A1F29" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="year" tick={axisStyle} tickLine={false} axisLine={{ stroke: '#1F2430' }} />
        <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={64} tickFormatter={(v: number) => (yFormatter ? yFormatter(v) : String(v))} />
        <Tooltip contentStyle={tooltipStyle} formatter={(value: number | string, name: string) => [yFormatter ? yFormatter(Number(value)) : String(value), name]} />
        <Area type="monotone" dataKey="contributed" stroke="#60A5FA" strokeWidth={2} fill="url(#grad-contributed)" dot={false} name="Contributed" />
        <Area type="monotone" dataKey="value" stroke="#10B981" strokeWidth={2} fill="url(#grad-value)" dot={false} name="Portfolio value" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
