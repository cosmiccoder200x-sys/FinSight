import {
  ArrowRight,
  BarChart3,
  Bot,
  Brain,
  Gauge,
  LineChart,
  Lock,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Logo } from '../components/layout/Logo';
import { useAuth } from '../contexts/AuthContext';

const features = [
  {
    icon: Wallet,
    title: 'Portfolio intelligence',
    desc: 'Track holdings, compute real P&L, allocation, volatility, Sharpe ratio and drawdown with transparent formulas.',
  },
  {
    icon: Gauge,
    title: 'Financial health score',
    desc: 'A clear 0–100 score across savings, emergency fund, debt, investing and cash flow — with plain-language explanations.',
  },
  {
    icon: Bot,
    title: 'AI finance copilot',
    desc: 'Ask questions about your own data. The copilot answers from real numbers via tools, never invented ones.',
  },
  {
    icon: TrendingUp,
    title: 'Investment simulator',
    desc: 'Model monthly contributions, returns and inflation side by side across conservative, moderate and aggressive scenarios.',
  },
  {
    icon: LineChart,
    title: 'Market & news intelligence',
    desc: 'Indices, quotes and news with a pluggable provider layer. Fully usable in demo mode, upgradeable to live data.',
  },
  {
    icon: ShieldCheck,
    title: 'Private & secure by design',
    desc: 'JWT auth, bcrypt password hashing, no secrets in the frontend, admin APIs locked behind role checks.',
  },
];

export default function Landing() {
  const { user } = useAuth();
  const cta = user ? (
    <Link to="/dashboard" className="btn-primary px-6 py-3 text-sm">
      Open dashboard <ArrowRight className="h-4 w-4" />
    </Link>
  ) : (
    <div className="flex flex-wrap items-center gap-3">
      <Link to="/register" className="btn-primary px-6 py-3 text-sm">
        Get started free <ArrowRight className="h-4 w-4" />
      </Link>
      <Link to="/login" className="btn-ghost px-6 py-3 text-sm">
        Sign in
      </Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-ink text-gray-100">
      <header className="border-b border-ink-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Logo />
          <nav className="hidden items-center gap-6 text-sm text-gray-400 md:flex">
            <a href="#features" className="hover:text-white">Features</a>
            <a href="#how" className="hover:text-white">How it works</a>
            <a href="#security" className="hover:text-white">Security</a>
          </nav>
          {user ? (
            <Link to="/dashboard" className="btn-primary px-4 py-2">
              Dashboard
            </Link>
          ) : (
            <Link to="/login" className="btn-ghost px-4 py-2">
              Sign in
            </Link>
          )}
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-20 text-center md:py-28">
        <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent-dim/30 px-4 py-1.5 text-xs text-accent-soft">
          <Sparkles className="h-3.5 w-3.5" />
          AI-powered finance intelligence
        </div>
        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
          Understand your money.
          <br />
          <span className="text-accent-soft">Grow with clarity.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base text-gray-400 md:text-lg">
          FinSight brings your portfolio, spending, health score and market data into one
          premium terminal — with an AI copilot that explains it all from your real numbers.
        </p>
        <div className="mt-8 flex justify-center">{cta}</div>

        <div className="mx-auto mt-14 max-w-4xl overflow-hidden rounded-card border border-ink-line bg-ink-soft">
          <div className="flex items-center gap-1.5 border-b border-ink-line px-4 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-danger/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-warn/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-accent/60" />
            <span className="ml-3 text-xs text-gray-500">dashboard</span>
          </div>
          <div className="grid gap-3 p-4 text-left md:grid-cols-3">
            {[
              { label: 'Net Worth', value: '₹2,84,520', delta: '+16.05%', up: true },
              { label: 'Invested', value: '₹1,57,200', delta: '—', up: true },
              { label: 'Monthly Savings', value: '₹18,400', delta: '+8.2%', up: true },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border border-ink-line bg-ink-card p-4">
                <p className="text-[11px] uppercase tracking-wider text-gray-500">{s.label}</p>
                <p className="mt-2 text-xl font-bold text-gray-50">{s.value}</p>
                <p className={`text-xs ${s.up ? 'text-accent-soft' : 'text-gray-500'}`}>{s.delta}</p>
              </div>
            ))}
            <div className="hidden items-center gap-2 rounded-lg border border-ink-line bg-ink-card p-4 text-xs text-gray-400 md:flex md:col-span-3">
              <Brain className="h-4 w-4 text-accent-soft" />
              “Your portfolio gained 4.7% this month. Technology holdings contributed most of the increase.”
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="border-t border-ink-line bg-ink-soft/50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-2xl font-bold md:text-3xl">Everything a modern investor needs</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-sm text-gray-500">
            A simplified terminal for students and young professionals — dense, fast and honest about what’s real versus simulated.
          </p>
          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="card card-hover p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent-soft">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-semibold text-gray-100">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center text-2xl font-bold md:text-3xl">How it works</h2>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {[
            { step: '01', title: 'Connect your numbers', desc: 'Add holdings and expenses, or explore instantly with the built-in demo account.' },
            { step: '02', title: 'Get real calculations', desc: 'P&L, returns, allocation, risk metrics and a financial health score — computed from your data with standard formulas.' },
            { step: '03', title: 'Ask the copilot', desc: '“Why did my portfolio change?” The AI answers using your actual figures, with assumptions clearly labelled.' },
          ].map((s) => (
            <div key={s.step} className="relative rounded-card border border-ink-line bg-ink-card p-6">
              <span className="font-mono text-3xl font-bold text-accent/40">{s.step}</span>
              <h3 className="mt-3 text-sm font-semibold text-gray-100">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="security" className="border-t border-ink-line bg-ink-soft/50 py-16">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 text-center md:flex-row md:text-left">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent-soft">
            <Lock className="h-7 w-7" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Security & honesty first</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Passwords are bcrypt-hashed, sessions are signed JWTs, API keys live only on the server, and demo data is always
              labelled as simulated. FinSight is an educational tool — not a licensed financial advisor.
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-ink-line py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-xs text-gray-600 md:flex-row">
          <span>© 2026 FinSight. Educational use only — not financial advice.</span>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1"><BarChart3 className="h-3.5 w-3.5" /> v1.0</span>
            <Link to="/login" className="hover:text-gray-300">Sign in</Link>
            <Link to="/register" className="hover:text-gray-300">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
