import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

const tones: Record<Tone, string> = {
  neutral: 'bg-surface-alt text-ink-muted border-line',
  accent: 'bg-accent-soft text-accent border-transparent',
  success: 'bg-success-bg text-success-text border-transparent',
  warning: 'bg-warning-bg text-warning-text border-transparent',
  danger: 'bg-danger-bg text-danger-text border-transparent',
  info: 'bg-info-bg text-info-text border-transparent',
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
