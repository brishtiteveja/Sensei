import type { HTMLAttributes, ReactNode } from 'react';
import { SectionRule } from '@/components/art/Flourish';
import { cn } from '@/lib/utils';

/**
 * The default surface. Translucent (`.s-glass`) so the aurora reads through it,
 * and `interactive` layers on the gradient hairline plus a coloured lift.
 */
export function Card({
  className,
  children,
  interactive,
  ...rest
}: { interactive?: boolean } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        's-glass relative rounded-2xl border border-line shadow-soft',
        interactive &&
          's-gradient-ring transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:border-transparent hover:shadow-glow',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  icon,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-4 px-5 pt-5', className)}>
      <div className="flex min-w-0 items-start gap-3">
        {icon ? (
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent ring-1 ring-inset ring-accent/20">
            {icon}
          </div>
        ) : null}
        <div className="min-w-0">
          <h2 className="truncate text-[15px] font-semibold tracking-[-0.01em] text-ink">
            {title}
          </h2>
          {subtitle ? <p className="mt-1 text-[13px] text-ink-muted">{subtitle}</p> : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function CardBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('px-5 py-5', className)}>{children}</div>;
}

/** Section heading with a gradient tick and a hairline that runs to the action. */
export function SectionTitle({
  children,
  action,
  className,
}: {
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-4 flex items-center justify-between gap-4', className)}>
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden="true"
          className="h-5 w-1 shrink-0 rounded-full"
          style={{
            backgroundImage: 'linear-gradient(180deg, rgb(var(--s-grad-1)), rgb(var(--s-grad-3)))',
          }}
        />
        <h2 className="truncate text-lg font-semibold tracking-[-0.015em] text-ink">{children}</h2>
        <SectionRule className="hidden w-24 sm:block" />
      </div>
      {action}
    </div>
  );
}
