import { HeartHandshake } from 'lucide-react';

interface SupportFinSightProps {
  onNavigate?: () => void;
}

export function SupportFinSight({ onNavigate }: SupportFinSightProps) {
  const paymentLink = import.meta.env.VITE_SUPPORT_PAYMENT_URL?.trim();
  if (!paymentLink) return null;

  let url: URL;
  try {
    url = new URL(paymentLink);
  } catch {
    return (
      <p role="alert" className="px-3 py-2 text-xs text-danger">
        Support link is invalid. Set VITE_SUPPORT_PAYMENT_URL to an HTTPS Stripe Payment Link.
      </p>
    );
  }

  if (url.protocol !== 'https:' || url.hostname !== 'buy.stripe.com') {
    return (
      <p role="alert" className="px-3 py-2 text-xs text-danger">
        Support link must be an HTTPS Stripe Payment Link (buy.stripe.com).
      </p>
    );
  }

  return (
    <a
      href={url.href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onNavigate}
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-400 transition-colors hover:bg-ink-raised hover:text-accent-soft"
    >
      <HeartHandshake className="h-4 w-4" />
      Support FinSight
    </a>
  );
}
