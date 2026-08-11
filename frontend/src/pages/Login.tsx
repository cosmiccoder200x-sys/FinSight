import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { errorMessage } from '../hooks/useApi';

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    navigate(user.is_admin ? '/admin' : '/dashboard', { replace: true });
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
      navigate(from ?? '/dashboard', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemo = () => {
    setEmail('demo@finsight.app');
    setPassword('demo1234');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to home
        </Link>
        <div className="card p-8">
          <h1 className="text-2xl font-bold text-gray-50">Welcome back</h1>
          <p className="mt-1 text-sm text-gray-500">Sign in to your FinSight workspace.</p>

          {error && (
            <div className="mt-5 flex items-start gap-2 rounded-lg border border-danger/20 bg-danger/10 p-3 text-sm text-danger">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign in'}
            </button>
          </form>

          <button onClick={fillDemo} className="mt-3 w-full rounded-lg border border-dashed border-ink-line py-2 text-xs text-gray-500 transition-colors hover:border-accent/40 hover:text-accent-soft">
            Use demo account (demo@finsight.app / demo1234)
          </button>

          <p className="mt-6 text-center text-sm text-gray-500">
            No account yet?{' '}
            <Link to="/register" className="font-medium text-accent-soft hover:underline">
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
