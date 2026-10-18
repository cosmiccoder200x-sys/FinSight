import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AdminLayout, ProtectedLayout } from './components/layout/AppLayout';
import { Spinner } from './components/ui/Feedback';

const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Portfolio = lazy(() => import('./pages/Portfolio'));
const Markets = lazy(() => import('./pages/Markets'));
const StockDetail = lazy(() => import('./pages/StockDetail'));
const Expenses = lazy(() => import('./pages/Expenses'));
const Goals = lazy(() => import('./pages/Goals'));
const FinancialHealth = lazy(() => import('./pages/FinancialHealth'));
const Simulator = lazy(() => import('./pages/Simulator'));
const AICopilot = lazy(() => import('./pages/AICopilot'));
const Settings = lazy(() => import('./pages/Settings'));
const AdminOverview = lazy(() => import('./pages/admin/AdminOverview'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminAnalytics = lazy(() => import('./pages/admin/AdminAnalytics'));
const NotFound = lazy(() => import('./pages/NotFound'));

function Page({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<Spinner label="Loading…" />}>{children}</Suspense>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Page><Landing /></Page>} />
      <Route path="/login" element={<Page><Login /></Page>} />
      <Route path="/register" element={<Page><Register /></Page>} />

      <Route element={<ProtectedLayout />}>
        <Route path="/dashboard" element={<Page><Dashboard /></Page>} />
        <Route path="/portfolio" element={<Page><Portfolio /></Page>} />
        <Route path="/markets" element={<Page><Markets /></Page>} />
        <Route path="/markets/:symbol" element={<Page><StockDetail /></Page>} />
        <Route path="/expenses" element={<Page><Expenses /></Page>} />
        <Route path="/goals" element={<Page><Goals /></Page>} />
        <Route path="/financial-health" element={<Page><FinancialHealth /></Page>} />
        <Route path="/simulator" element={<Page><Simulator /></Page>} />
        <Route path="/ai-copilot" element={<Page><AICopilot /></Page>} />
        <Route path="/settings" element={<Page><Settings /></Page>} />
      </Route>

      <Route element={<AdminLayout />}>
        <Route path="/admin" element={<Page><AdminOverview /></Page>} />
        <Route path="/admin/users" element={<Page><AdminUsers /></Page>} />
        <Route path="/admin/analytics" element={<Page><AdminAnalytics /></Page>} />
      </Route>

      <Route path="*" element={<Page><NotFound /></Page>} />
    </Routes>
  );
}
