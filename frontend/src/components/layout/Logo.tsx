export function Logo({ size = 'md' }: { size?: 'sm' | 'md' }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-raised ring-1 ring-ink-line">
        <svg viewBox="0 0 32 32" className="h-5 w-5" fill="none">
          <path d="M8 22 L14 14 L18 18 L24 9" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M24 9 L24 14 M24 9 L19 9" stroke="#34D399" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>
      <span className={`font-bold tracking-tight text-gray-50 ${size === 'md' ? 'text-lg' : 'text-base'}`}>
        Fin<span className="text-accent-soft">Sight</span>
      </span>
    </div>
  );
}
