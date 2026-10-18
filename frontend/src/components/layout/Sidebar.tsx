import {
  Activity,
  BarChart3,
  Bot,
  DollarSign,
  Gauge,
  Home,
  LayoutDashboard,
  LogOut,
  Target,
  Settings,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Logo } from './Logo';
import { SupportFinSight } from './SupportFinSight';

interface NavItem {
  to: string;
  label: string;
  icon: typeof Home;
  end?: boolean;
}

const mainNav: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/portfolio', label: 'Portfolio', icon: Wallet },
  { to: '/markets', label: 'Markets', icon: BarChart3 },
  { to: '/expenses', label: 'Expenses', icon: DollarSign },
  { to: '/goals', label: 'Goals', icon: Target },
  { to: '/financial-health', label: 'Financial Health', icon: Gauge },
  { to: '/simulator', label: 'Simulator', icon: TrendingUp },
  { to: '/ai-copilot', label: 'AI Copilot', icon: Bot },
];

const adminNav: NavItem[] = [
  { to: '/admin', label: 'Admin Overview', icon: ShieldCheck, end: true },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/analytics', label: 'Analytics', icon: Activity },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      isActive ? 'bg-accent/10 text-accent-soft' : 'text-gray-400 hover:bg-ink-raised hover:text-gray-100'
    }`;

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="flex h-full flex-col">
      <div className="px-2">
        <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-gray-600">Main</p>
        <nav className="space-y-0.5">
          {mainNav.map((item) => (
            <NavLink key={item.to} to={item.to} className={linkClass} onClick={onNavigate}>
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      {user?.is_admin && (
        <div className="mt-5 px-2">
          <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-gray-600">Admin</p>
          <nav className="space-y-0.5">
            {adminNav.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={linkClass} onClick={onNavigate}>
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      )}

      <div className="mt-auto space-y-0.5 border-t border-ink-line pt-3">
        <SupportFinSight onNavigate={onNavigate} />
        <NavLink to="/settings" className={linkClass} onClick={onNavigate}>
          <Settings className="h-4 w-4" />
          Settings
        </NavLink>
        <NavLink to="/settings?tab=profile" className={linkClass} onClick={onNavigate}>
          <Users className="h-4 w-4" />
          Profile
        </NavLink>
        <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-400 transition-colors hover:bg-ink-raised hover:text-danger">
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </div>
  );
}

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      {/* Desktop */}
      <aside className="hidden w-60 shrink-0 border-r border-ink-line bg-ink-soft px-3 py-4 lg:block">
        <div className="px-3 pb-6">
          <Logo />
        </div>
        <NavLinks />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-ink-soft px-3 py-4 shadow-2xl">
            <div className="flex items-center justify-between px-3 pb-6">
              <Logo />
              <button onClick={onClose} className="rounded-md p-1 text-gray-500 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavLinks onNavigate={onClose} />
          </aside>
        </div>
      )}
    </>
  );
}

export function DemoBanner() {
  return (
    <div className="flex items-center gap-2 border-b border-ink-line bg-accent-dim/40 px-4 py-1.5 text-[11px] text-accent-soft">
      <Activity className="h-3.5 w-3.5" />
      <span>
        <strong>Demo mode</strong> — market & news data is simulated and clearly labelled. Add API keys in <code>.env</code> for live data.
      </span>
    </div>
  );
}
