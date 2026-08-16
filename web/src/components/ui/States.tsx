import type { ReactNode } from 'react';
import { AlertTriangle, RefreshCw, WifiOff } from 'lucide-react';
import { ApiError, API_BASE_URL } from '@/lib/api';
import { EmptyDoodle } from '@/components/art/Flourish';
import { Button } from './Button';
import { t } from '@/i18n/strings';
import { cn } from '@/lib/utils';

/* ---------------------------------------------------------------- */
/* Skeletons                                                         */
/* ---------------------------------------------------------------- */

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg bg-surface-alt',
        'after:absolute after:inset-0 after:-translate-x-full after:animate-shimmer',
        'after:bg-gradient-to-r after:from-transparent after:via-white/45 after:to-transparent',
        'dark:after:via-white/[0.06]',
        className,
      )}
      aria-hidden="true"
    />
  );
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn('h-3.5', i === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  );
}

export function SkeletonCards({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('grid gap-5 sm:grid-cols-2 xl:grid-cols-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="s-glass rounded-2xl border border-line p-5 shadow-soft">
          <div className="flex items-start gap-4">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <div className="flex-1 space-y-2.5 pt-1">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
          <Skeleton className="mt-6 h-2 w-full rounded-full" />
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Error / empty                                                     */
/* ---------------------------------------------------------------- */

export function ErrorState({
  error,
  onRetry,
  title,
  compact,
  className,
}: {
  error?: Error | null;
  onRetry?: () => void;
  title?: string;
  compact?: boolean;
  className?: string;
}) {
  const isNetwork = error instanceof ApiError && error.network;
  const message = isNetwork
    ? t.errors.offlineHint(API_BASE_URL)
    : error?.message || t.errors.generic;

  return (
    <div
      role="alert"
      className={cn(
        's-glass relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-danger/30 text-center',
        compact ? 'gap-3 p-6' : 'gap-4 p-10',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(70% 90% at 50% -10%, rgb(var(--s-danger) / 0.10), transparent 70%)',
        }}
      />
      <div
        className={cn(
          'relative flex items-center justify-center rounded-2xl bg-danger-bg text-danger-text ring-1 ring-inset ring-danger/25',
          compact ? 'h-10 w-10' : 'h-14 w-14',
        )}
      >
        {isNetwork ? <WifiOff size={compact ? 18 : 24} /> : <AlertTriangle size={compact ? 18 : 24} />}
      </div>
      <div className="relative max-w-md space-y-1.5">
        <h3 className={cn('font-semibold text-ink', compact ? 'text-sm' : 'text-base')}>
          {title ?? (isNetwork ? t.errors.offline : t.errors.title)}
        </h3>
        <p className="break-words text-[13px] leading-relaxed text-ink-muted">{message}</p>
      </div>
      {onRetry ? (
        <div className="relative">
          <Button variant="secondary" size={compact ? 'sm' : 'md'} onClick={onRetry}>
            <RefreshCw size={15} />
            {t.common.retry}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  icon,
  action,
  compact,
  className,
}: {
  title: string;
  body?: string;
  icon?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        's-glass relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-grad-2/30 text-center',
        compact ? 'gap-3 p-6' : 'gap-4 p-12',
        className,
      )}
    >
      {/* colour wash + dot mesh so a blank screen still feels designed */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(80% 100% at 50% -20%, rgb(var(--s-grad-2) / 0.14), transparent 68%)',
        }}
      />
      {/* The full illustration only earns its space at full size; the compact
          variant keeps the small icon plate. */}
      {compact ? (
        <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-accent-soft text-accent ring-1 ring-inset ring-accent/20">
          {icon ?? <EmptyDoodle className="h-6 w-6" />}
        </div>
      ) : (
        <div className="relative flex flex-col items-center gap-3">
          <EmptyDoodle className="h-24 w-32" />
          {icon ? (
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft text-accent ring-1 ring-inset ring-accent/20">
              {icon}
            </span>
          ) : null}
        </div>
      )}
      <div className="relative max-w-md space-y-1.5">
        <h3 className={cn('font-semibold text-ink', compact ? 'text-sm' : 'text-base')}>{title}</h3>
        {body ? <p className="text-[13px] leading-relaxed text-ink-muted">{body}</p> : null}
      </div>
      {action ? <div className="relative">{action}</div> : null}
    </div>
  );
}
