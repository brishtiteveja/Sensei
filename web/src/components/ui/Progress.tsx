import { useId } from 'react';
import { cn } from '@/lib/utils';

export function ProgressBar({
  value,
  className,
  tone = 'accent',
  label,
}: {
  value: number;
  className?: string;
  tone?: 'accent' | 'success';
  label?: string;
}) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cn(
        'relative h-2 w-full overflow-hidden rounded-full bg-surface-alt ring-1 ring-inset ring-line/60',
        className,
      )}
      role="progressbar"
      aria-valuenow={v}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className="h-full rounded-full transition-[width] duration-500 ease-smooth"
        style={{
          width: `${v}%`,
          // Gradient fill: the product ramp while in progress, a green ramp once
          // the bar reads as a completion signal.
          backgroundImage:
            tone === 'success'
              ? 'linear-gradient(90deg, rgb(var(--s-deco-teal)), rgb(var(--s-success)))'
              : 'linear-gradient(90deg, rgb(var(--s-grad-1)), rgb(var(--s-grad-2)) 60%, rgb(var(--s-grad-3)))',
        }}
      />
    </div>
  );
}

export function ProgressRing({
  value,
  size = 56,
  stroke = 5,
  className,
  children,
  label,
}: {
  value: number;
  size?: number;
  stroke?: number;
  className?: string;
  children?: React.ReactNode;
  label?: string;
}) {
  const v = Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (v / 100) * c;
  // Gradient defs are per-instance: a page can hold several rings and each
  // needs a unique id.
  const gid = useId().replace(/:/g, '');

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label ?? `${v}% complete`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={`ring-${gid}`} x1="0" y1="0" x2="1" y2="1">
            {v >= 100 ? (
              <>
                <stop offset="0%" stopColor="rgb(var(--s-deco-teal))" />
                <stop offset="100%" stopColor="rgb(var(--s-success))" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="rgb(var(--s-grad-1))" />
                <stop offset="55%" stopColor="rgb(var(--s-grad-2))" />
                <stop offset="100%" stopColor="rgb(var(--s-grad-3))" />
              </>
            )}
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-surface-alt"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          stroke={`url(#ring-${gid})`}
          className="transition-[stroke-dashoffset] duration-700 ease-smooth"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold tabular-nums text-ink">
        {children ?? `${v}%`}
      </span>
    </div>
  );
}
