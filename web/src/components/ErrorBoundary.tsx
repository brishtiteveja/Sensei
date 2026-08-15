import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './ui/Button';
import { t } from '@/i18n/strings';

interface State {
  error: Error | null;
}

/** Last line of defence so a render crash never leaves a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Console only — no telemetry leaves this machine.
    console.error('[Sensei] render error', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex h-dvh items-center justify-center bg-page p-8">
        <div className="max-w-md rounded-2xl border border-line bg-surface p-8 text-center shadow-card">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-danger-bg text-danger-text">
            <AlertTriangle size={24} />
          </span>
          <h1 className="mt-5 text-lg font-semibold text-ink">{t.errors.title}</h1>
          <p className="mt-2 break-words text-[13px] leading-relaxed text-ink-muted">
            {this.state.error.message}
          </p>
          <Button className="mt-6" onClick={() => window.location.reload()}>
            {t.common.retry}
          </Button>
        </div>
      </div>
    );
  }
}
