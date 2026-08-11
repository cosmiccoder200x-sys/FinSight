import { Check, KeyRound, Loader2, Save, ShieldCheck, User as UserIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Card, CardTitle } from '../components/ui/Card';
import { ErrorState, Spinner } from '../components/ui/Feedback';
import { Field, Input, Select } from '../components/ui/Form';
import { errorMessage, useApi, useMutation } from '../hooks/useApi';
import { authApi } from '../services/finsight';
import type { Profile } from '../types';

type Tab = 'profile' | 'security';

export default function Settings() {
  const [params] = useSearchParams();
  const initialTab: Tab = params.get('tab') === 'security' ? 'security' : 'profile';
  const [tab, setTab] = useState<Tab>(initialTab);
  const { user } = useAuth();

  const profileApi = useApi<Profile>(() => authApi.getProfile(), []);
  const [income, setIncome] = useState(0);
  const [debt, setDebt] = useState(0);
  const [emergency, setEmergency] = useState(0);
  const [risk, setRisk] = useState('moderate');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (profileApi.data && !hydrated) {
      setIncome(profileApi.data.monthly_income);
      setDebt(profileApi.data.monthly_debt_payments);
      setEmergency(profileApi.data.emergency_fund);
      setRisk(profileApi.data.risk_tolerance);
      setHydrated(true);
    }
  }, [profileApi.data, hydrated]);

  const saveProfile = useMutation(async () =>
    authApi.updateProfile({ monthly_income: income, monthly_debt_payments: debt, emergency_fund: emergency, risk_tolerance: risk }),
  );

  const [saved, setSaved] = useState(false);

  const submitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveProfile.execute();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      alert(errorMessage(err));
    }
  };

  if (profileApi.loading) return <Spinner label="Loading settings…" />;
  if (profileApi.error || !profileApi.data) return <ErrorState message={profileApi.error ?? 'Could not load profile'} onRetry={profileApi.refetch} />;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-50">Settings</h1>
        <p className="text-sm text-gray-500">Manage your profile and account preferences.</p>
      </div>

      <div className="flex gap-1 border-b border-ink-line">
        {(['profile', 'security'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab === t ? 'border-accent text-accent-soft' : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            {t === 'profile' ? 'Profile & finances' : 'Security'}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <div className="space-y-5">
          <Card>
            <CardTitle sub="Used for your savings rate and cash-flow scores">
              Monthly Finances
            </CardTitle>
            <form onSubmit={submitProfile} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Monthly income (₹)">
                  <Input type="number" min="0" value={income} onChange={(e) => setIncome(Number(e.target.value))} />
                </Field>
                <Field label="Monthly debt payments (₹)" hint="EMIs, loans, card bills">
                  <Input type="number" min="0" value={debt} onChange={(e) => setDebt(Number(e.target.value))} />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Emergency fund (₹)" hint="Cash set aside for 3–6 months of expenses">
                  <Input type="number" min="0" value={emergency} onChange={(e) => setEmergency(Number(e.target.value))} />
                </Field>
                <Field label="Risk tolerance">
                  <Select value={risk} onChange={(e) => setRisk(e.target.value)}>
                    <option value="conservative">Conservative</option>
                    <option value="moderate">Moderate</option>
                    <option value="aggressive">Aggressive</option>
                  </Select>
                </Field>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={saveProfile.loading}>
                  {saveProfile.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                  {saved ? 'Saved' : 'Save changes'}
                </Button>
              </div>
            </form>
          </Card>

          <Card>
            <CardTitle sub="Your account details">Account</CardTitle>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-sm font-bold text-accent-soft">
                {user?.full_name?.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-100">{user?.full_name}</p>
                <p className="text-sm text-gray-500">{user?.email}</p>
                <p className="mt-0.5 text-xs text-gray-600">
                  {user?.is_admin ? 'Administrator' : 'Member'}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {tab === 'security' && (
        <div className="space-y-5">
          <Card>
            <CardTitle sub="How your data is protected">
              <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-accent-soft" /> Security</span>
            </CardTitle>
            <ul className="space-y-3 text-sm text-gray-400">
              <li className="flex items-start gap-2">
                <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-accent-soft" />
                Passwords are hashed with bcrypt — your plaintext password is never stored.
              </li>
              <li className="flex items-start gap-2">
                <UserIcon className="mt-0.5 h-4 w-4 shrink-0 text-accent-soft" />
                Sessions use signed JWT tokens that expire automatically.
              </li>
              <li className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent-soft" />
                API keys (AI, market data, news) live only on the server and are never exposed to the browser.
              </li>
            </ul>
          </Card>
          <Card>
            <CardTitle>Data & Demo Mode</CardTitle>
            <p className="text-sm leading-relaxed text-gray-500">
              {profileApi.data ? 'Your data is stored in the database and used only to power your dashboard, calculations and copilot answers.' : ''}{' '}
              When the server runs in demo mode, market prices and headlines are simulated and clearly labelled — they are never
              presented as live market data.
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}
