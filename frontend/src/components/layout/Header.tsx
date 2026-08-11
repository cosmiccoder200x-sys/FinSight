import { Bell, Menu, Search } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function Header({ onMenu, showGreeting = true }: { onMenu?: () => void; showGreeting?: boolean }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = search.trim().toUpperCase();
    if (q) navigate(`/markets/${encodeURIComponent(q)}`);
    setSearch('');
    setShowSearch(false);
  };

  const initials = user?.full_name
    ? user.full_name
        .split(' ')
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  return (
    <header className="flex items-center justify-between gap-4 border-b border-ink-line bg-ink px-4 py-3 lg:px-6">
      <div className="flex items-center gap-3">
        {onMenu && (
          <button onClick={onMenu} className="rounded-md p-1.5 text-gray-400 hover:bg-ink-raised hover:text-white lg:hidden">
            <Menu className="h-5 w-5" />
          </button>
        )}
        {showGreeting && (
          <div className="hidden md:block">
            <h1 className="text-sm font-semibold text-gray-100">
              {greeting}, {user?.full_name?.split(' ')[0] ?? 'there'}
            </h1>
            <p className="text-xs text-gray-500">{today}</p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {showSearch ? (
          <form onSubmit={submitSearch} className="flex items-center gap-2 rounded-lg border border-ink-line bg-ink-soft px-3 py-1.5">
            <Search className="h-4 w-4 text-gray-500" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onBlur={() => setShowSearch(false)}
              placeholder="Search symbol…"
              className="w-40 bg-transparent text-sm text-gray-100 outline-none placeholder:text-gray-600"
            />
          </form>
        ) : (
          <button
            onClick={() => setShowSearch(true)}
            className="rounded-lg border border-ink-line bg-ink-soft p-2 text-gray-400 transition-colors hover:border-gray-600 hover:text-white"
            title="Search symbol"
          >
            <Search className="h-4 w-4" />
          </button>
        )}

        <button className="relative rounded-lg border border-ink-line bg-ink-soft p-2 text-gray-400 transition-colors hover:border-gray-600 hover:text-white" title="Notifications">
          <Bell className="h-4 w-4" />
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-accent" />
        </button>

        <Link to="/settings?tab=profile" className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-accent-soft ring-1 ring-accent/30" title="Profile">
          {initials}
        </Link>
      </div>
    </header>
  );
}
