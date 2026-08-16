import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle';
type Size = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-200 ease-smooth ' +
  'disabled:opacity-45 disabled:pointer-events-none select-none whitespace-nowrap';

const variants: Record<Variant, string> = {
  // The primary action carries the product gradient. White text on the
  // indigo->fuchsia ramp stays above 4.5:1 across the whole sweep.
  primary:
    's-gradient-fill text-white shadow-glow-sm hover:brightness-110 hover:shadow-glow active:scale-[0.985]',
  secondary:
    's-glass-strong text-ink border border-line hover:border-grad-2/50 hover:text-accent active:scale-[0.985]',
  subtle:
    'bg-accent-soft text-accent ring-1 ring-inset ring-accent/15 hover:brightness-95 dark:hover:brightness-125 active:scale-[0.985]',
  ghost: 'text-ink-soft hover:bg-surface-alt hover:text-ink active:scale-[0.985]',
  danger: 'bg-danger text-white hover:brightness-95 active:scale-[0.985]',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px]',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-[15px]',
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  className?: string;
  children?: ReactNode;
}

export type ButtonProps = CommonProps & ButtonHTMLAttributes<HTMLButtonElement>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', fullWidth, className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(base, variants[variant], sizes[size], fullWidth && 'w-full', className)}
      {...rest}
    >
      {children}
    </button>
  );
});

export function LinkButton({
  to,
  variant = 'primary',
  size = 'md',
  fullWidth,
  className,
  children,
  ...rest
}: CommonProps & { to: string } & Omit<React.ComponentProps<typeof Link>, 'to' | 'className'>) {
  return (
    <Link
      to={to}
      className={cn(base, variants[variant], sizes[size], fullWidth && 'w-full', className)}
      {...rest}
    >
      {children}
    </Link>
  );
}

export function IconButton({
  label,
  className,
  children,
  ...rest
}: { label: string } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted',
        'transition-all duration-200 ease-smooth hover:bg-accent-soft hover:text-accent',
        'disabled:opacity-40 disabled:pointer-events-none',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
