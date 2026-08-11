import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'ghost' | 'danger' | 'subtle';

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-ink hover:bg-accent-soft disabled:bg-accent/40',
  ghost: 'border border-ink-line bg-transparent text-gray-300 hover:border-gray-600 hover:text-white',
  danger: 'border border-danger/30 bg-danger/10 text-danger hover:bg-danger/20',
  subtle: 'bg-ink-raised text-gray-200 hover:bg-[#1E2430]',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

export function Button({ variant = 'primary', className = '', children, ...rest }: ButtonProps) {
  return (
    <button className={`btn ${variants[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}
