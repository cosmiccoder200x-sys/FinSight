import type { ReactNode } from 'react';

type Tone = 'positive' | 'negative' | 'neutral' | 'accent' | 'warn';

const tones: Record<Tone, string> = {
  positive: 'bg-accent/10 text-accent-soft border-accent/20',
  negative: 'bg-danger/10 text-danger border-danger/20',
  neutral: 'bg-ink-raised text-gray-400 border-ink-line',
  accent: 'bg-info/10 text-info border-info/20',
  warn: 'bg-warn/10 text-warn border-warn/20',
};

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: Tone }) {
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}
