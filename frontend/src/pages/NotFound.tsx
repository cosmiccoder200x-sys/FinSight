import { Compass } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ink px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-raised text-accent-soft">
        <Compass className="h-7 w-7" />
      </div>
      <h1 className="text-4xl font-bold text-gray-50">404</h1>
      <p className="max-w-sm text-sm text-gray-500">
        This page drifted off the radar. The market data here is simulated — but your path back isn’t.
      </p>
      <Link to="/" className="btn-primary">
        Back to home
      </Link>
    </div>
  );
}
