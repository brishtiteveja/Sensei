import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

// Tinted fill plus a matching hairline, so chips read as objects rather than
// floating text once the page behind them is coloured.
const tones: Record<Tone, string> = {
  neutral: 'bg-surface-alt/80 text-ink-muted border-line',
  accent: 'bg-accent-soft text-accent border-accent/25',
  success: 'bg-success-bg text-success-text border-success/25',
  warning: 'bg-warning-bg text-warning-text border-warning/25',
  danger: 'bg-danger-bg text-danger-text border-danger/25',
  info: 'bg-info-bg text-info-text border-info/25',
};

export function Badge({
  tone = 'neutral',
  children,
  className,
  icon,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-2xs font-medium leading-5',
        tones[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
