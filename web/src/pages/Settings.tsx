import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Cloud,
  Cpu,
  Eye,
  EyeOff,
  Globe,
  Loader2,
  Monitor,
  Moon,
  RefreshCw,
  ShieldCheck,
  Sun,
  Zap,
} from 'lucide-react';
import { Page } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { ErrorState, Skeleton } from '@/components/ui/States';
import { useAsync } from '@/hooks/useAsync';
import { useLanguages } from '@/hooks/useCurriculum';
import { API_BASE_URL, getModelCatalog, getTutorHealth, setModel } from '@/lib/api';
import type { ModelCatalog, TutorHealth } from '@/lib/types';
import { useSettings } from '@/state/settings';
import type { ThemeMode } from '@/state/settings';
import { t } from '@/i18n/strings';
import { cn } from '@/lib/utils';

interface PendingSwap {
  mode: 'local' | 'cloud';
  id: string;
  label: string;
  cold: boolean;
}

export function SettingsPage() {
  const { language, setLanguage, theme, setTheme } = useSettings();
  const languages = useLanguages();
  const models = useAsync<ModelCatalog>((signal) => getModelCatalog(signal), []);
  const health = useAsync<TutorHealth>((signal) => getTutorHealth(signal), []);

  const [pending, setPending] = useState<PendingSwap | null>(null);
  const [swapping, setSwapping] = useState(false);
  const [swapError, setSwapError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  // Elapsed counter during a cold swap — silence for 5 minutes reads as a hang.
  useEffect(() => {
    if (!swapping) {
      setElapsed(0);
      return;
    }
    const id = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => window.clearInterval(id);
  }, [swapping]);

  const catalog = models.data;
  const resident = catalog?.resident_local_model ?? null;
  const current = catalog?.current;

  const localVisionById = useMemo(() => {
    const m = new Map<string, boolean>();
    for (const l of catalog?.local ?? []) m.set(l.id, l.vision);
    return m;
  }, [catalog]);

  const activeIsVisionless =
    current?.mode === 'local' && localVisionById.get(current.model) === false;

  const modelsReload = models.reload;
  const applySwap = useCallback(
    async (mode: 'local' | 'cloud', id: string, label: string) => {
      setPending(null);
      setSwapping(true);
      setSwapError(null);
      try {
        const res = await setModel(mode, id);
        if (res.ok === false) throw new Error(res.warning || t.settings.swapFailed);
        setNotice(t.settings.swapSucceeded(label));
        modelsReload();
      } catch (err) {
        setSwapError(err instanceof Error ? err.message : t.settings.swapFailed);
      } finally {
        setSwapping(false);
      }
    },
    [modelsReload],
  );

  /** Cloud and already-resident local models switch instantly; anything else confirms first. */
  const requestSwap = useCallback(
    (mode: 'local' | 'cloud', id: string, label: string) => {
      setSwapError(null);
      setNotice(null);
      const cold = mode === 'local' && id !== resident;
      if (!cold) {
        void applySwap(mode, id, label);
        return;
      }
      setPending({ mode, id, label, cold });
    },
    [resident, applySwap],
  );

  return (
    <Page title={t.settings.title} subtitle={t.settings.subtitle}>
      <div className="space-y-6">
        {/* language */}
        <Card className="p-6">
          <SettingHeader icon={<Globe size={17} />} title={t.settings.language} body={t.settings.languageBody} />
          {languages.status === 'loading' ? (
            <div className="mt-5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : languages.status === 'error' ? (
            <ErrorState className="mt-5" compact error={languages.error} onRetry={languages.reload} />
          ) : (
            <div className="mt-5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              {Object.entries(languages.data ?? {}).map(([code, info]) => {
                const active = code === language;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setLanguage(code)}
                    aria-pressed={active}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-200 ease-smooth',
                      active
                        ? 'border-accent bg-accent-soft'
                        : 'border-line bg-surface hover:border-line-strong hover:bg-surface-alt',
                    )}
                  >
                    <span aria-hidden="true" className="text-xl leading-none">
                      {info.flag ?? '🌐'}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          'block truncate text-[13.5px] font-medium',
                          active ? 'text-accent' : 'text-ink',
                        )}
                      >
                        {info.name_local || info.name}
                      </span>
                      <span className="block truncate text-2xs text-ink-muted">{info.name}</span>
                    </span>
                    {active ? <Check size={15} className="shrink-0 text-accent" /> : null}
                  </button>
                );
              })}
            </div>
          )}
        </Card>

        {/* model */}
        <Card className="p-6">
          <SettingHeader
            icon={<Cpu size={17} />}
            title={t.settings.model}
            body={t.settings.modelBody}
            action={
              <Button variant="ghost" size="sm" onClick={models.reload} disabled={swapping}>
                <RefreshCw size={14} />
                {t.settings.refresh}
              </Button>
            }
          />

          {models.status === 'loading' ? (
            <div className="mt-5 space-y-2.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : models.status === 'error' ? (
            <ErrorState className="mt-5" error={models.error} onRetry={models.reload} />
          ) : catalog ? (
            <>
              {notice ? (
                <p className="mt-5 rounded-xl bg-success-bg px-4 py-3 text-[13px] font-medium text-success-text">
                  {notice}
                </p>
              ) : null}
              {swapError ? (
                <p role="alert" className="mt-5 rounded-xl bg-danger-bg px-4 py-3 text-[13px] font-medium text-danger-text">
                  {swapError}
                </p>
              ) : null}

              {activeIsVisionless ? (
                <div className="mt-5 flex items-start gap-3 rounded-xl border border-warning/35 bg-warning-bg px-4 py-3.5">
                  <EyeOff size={15} className="mt-0.5 shrink-0 text-warning-text" />
                  <p className="text-[13px] leading-relaxed text-warning-text">
                    {t.settings.noVisionWarning}
                  </p>
                </div>
              ) : null}

              <ModelGroup
                title={t.settings.cloudModels}
                icon={<Cloud size={14} />}
                note="Leaves the box. Fast, no swap cost."
              >
                {catalog.cloud.map((m) => (
                  <ModelRow
                    key={m.id}
                    id={m.id}
                    label={m.label}
                    active={current?.mode === 'cloud' && current.model === m.id}
                    disabled={swapping}
                    onSelect={() => requestSwap('cloud', m.id, m.label)}
                    badges={
                      <>
                        {m.note ? <Badge tone="neutral">{m.note}</Badge> : null}
                        <Badge tone="info" icon={<Zap size={10} />}>
                          {t.settings.noSwap}
                        </Badge>
                      </>
                    }
                  />
                ))}
              </ModelGroup>

              <ModelGroup
                title={t.settings.localModels}
                icon={<ShieldCheck size={14} />}
                note={catalog.local_swap_warning ?? 'Only one local model stays loaded.'}
              >
                {catalog.local.map((m) => {
                  const isResident = m.id === resident;
                  return (
                    <ModelRow
                      key={m.id}
                      id={m.id}
                      label={m.label}
                      active={current?.mode === 'local' && current.model === m.id}
                      disabled={swapping}
                      onSelect={() => requestSwap('local', m.id, m.label)}
                      badges={
                        <>
                          {isResident ? (
                            <Badge tone="success" icon={<Zap size={10} />}>
                              {t.settings.resident}
                            </Badge>
                          ) : (
                            <Badge tone="warning" icon={<AlertTriangle size={10} />}>
                              {t.settings.coldSwap}
                            </Badge>
                          )}
                          {m.vision ? (
                            <Badge tone="accent" icon={<Eye size={10} />}>
                              {t.settings.vision}
                            </Badge>
                          ) : (
                            <Badge tone="neutral" icon={<EyeOff size={10} />}>
                              {t.settings.noVision}
                            </Badge>
                          )}
                        </>
                      }
                    />
                  );
                })}
              </ModelGroup>
            </>
          ) : null}
        </Card>

        {/* appearance */}
        <Card className="p-6">
          <SettingHeader
            icon={theme === 'dark' ? <Moon size={17} /> : <Sun size={17} />}
            title={t.settings.appearance}
            body={t.settings.appearanceBody}
          />
          <div className="mt-5 inline-flex rounded-xl border border-line bg-surface-alt p-1">
            {(
              [
                { id: 'light', label: t.settings.themeLight, icon: <Sun size={14} /> },
                { id: 'dark', label: t.settings.themeDark, icon: <Moon size={14} /> },
                { id: 'system', label: t.settings.themeSystem, icon: <Monitor size={14} /> },
              ] as Array<{ id: ThemeMode; label: string; icon: React.ReactNode }>
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTheme(opt.id)}
                aria-pressed={theme === opt.id}
                className={cn(
                  'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-medium transition-all duration-200',
                  theme === opt.id
                    ? 'bg-surface text-accent shadow-glow-sm ring-1 ring-inset ring-accent/25'
                    : 'text-ink-muted hover:text-ink',
                )}
              >
                {opt.icon}
                {opt.label}
              </button>
            ))}
          </div>
        </Card>

        {/* server + privacy */}
        <Card className="p-6">
          <SettingHeader
            icon={<ShieldCheck size={17} />}
            title={t.settings.server}
            body={t.settings.serverBody}
            action={
              <Button variant="ghost" size="sm" onClick={health.reload}>
                <RefreshCw size={14} />
                {t.settings.serverCheck}
              </Button>
            }
          />
          <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface-alt px-4 py-3">
            <code className="min-w-0 flex-1 truncate font-mono text-[13px] text-ink-soft">
              {API_BASE_URL}
            </code>
            {health.status === 'loading' ? (
              <Badge tone="neutral">{t.common.loading}</Badge>
            ) : health.status === 'error' ? (
              <Badge tone="danger">{t.settings.serverStatusDown}</Badge>
            ) : (
              <Badge tone="success">
                {t.settings.serverStatusOk}
                {typeof health.data?.engines === 'number'
                  ? ` · ${t.settings.engines(health.data.engines)}`
                  : ''}
              </Badge>
            )}
          </div>
          <p className="mt-5 border-t border-line pt-4 text-[13px] leading-relaxed text-ink-muted">
            <span className="font-medium text-ink">{t.settings.privacy}. </span>
            {t.settings.privacyBody}
          </p>
        </Card>
      </div>

      {/* cold-swap confirm */}
      <Modal
        open={Boolean(pending)}
        onClose={() => setPending(null)}
        title={t.settings.swapWarningTitle}
        description={pending ? t.settings.swapWarningBody(pending.label) : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPending(null)}>
              {t.common.cancel}
            </Button>
            <Button
              onClick={() => pending && void applySwap(pending.mode, pending.id, pending.label)}
            >
              {t.settings.swapConfirm}
            </Button>
          </>
        }
      >
        {pending ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-line bg-surface-alt px-4 py-3">
              <p className="text-2xs font-semibold uppercase tracking-wider text-ink-faint">
                {t.settings.resident}
              </p>
              <p className="mt-1 font-mono text-[13px] text-ink">{resident ?? '—'}</p>
            </div>
            <div className="rounded-xl border border-warning/35 bg-warning-bg px-4 py-3">
              <p className="text-2xs font-semibold uppercase tracking-wider text-warning-text">
                {t.settings.coldSwap}
              </p>
              <p className="mt-1 font-mono text-[13px] text-warning-text">{pending.id}</p>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* blocking swap progress */}
      <Modal
        open={swapping}
        onClose={() => undefined}
        dismissable={false}
        title={t.settings.swapping}
        description={t.settings.swappingBody}
      >
        <div className="flex items-center gap-4 rounded-xl bg-surface-alt px-5 py-5">
          <Loader2 size={22} className="shrink-0 animate-spin text-accent" />
          <div className="min-w-0 flex-1">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
              {/* Indeterminate: the router gives no percentage, so show motion + elapsed. */}
              <div
                className="h-full w-1/3 rounded-full bg-accent"
                style={{
                  animation: 'shimmer 1.8s cubic-bezier(0.4,0,0.6,1) infinite',
                }}
              />
            </div>
            <p className="mt-2.5 text-2xs tabular-nums text-ink-muted">
              {Math.floor(elapsed / 60)}m {String(elapsed % 60).padStart(2, '0')}s elapsed · up to
              5 minutes is normal
            </p>
          </div>
        </div>
      </Modal>
    </Page>
  );
}

function SettingHeader({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex min-w-0 items-start gap-3">
        <span className="s-gradient-fill mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-glow-sm">
          {icon}
        </span>
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">{body}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

function ModelGroup({
  title,
  icon,
  note,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-7">
      <div className="mb-1 flex items-center gap-2">
        <span className="text-ink-faint">{icon}</span>
        <h3 className="text-2xs font-semibold uppercase tracking-wider text-ink-faint">{title}</h3>
      </div>
      {note ? <p className="mb-3 text-2xs leading-relaxed text-ink-muted">{note}</p> : null}
      <ul className="space-y-2">{children}</ul>
    </div>
  );
}

function ModelRow({
  id,
  label,
  active,
  disabled,
  badges,
  onSelect,
}: {
  id: string;
  label: string;
  active: boolean;
  disabled?: boolean;
  badges?: React.ReactNode;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        disabled={disabled || active}
        aria-pressed={active}
        className={cn(
          'flex w-full flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border px-4 py-3 text-left transition-all duration-200 ease-smooth',
          active
            ? 'border-accent bg-accent-soft'
            : 'border-line bg-surface hover:border-line-strong hover:bg-surface-alt',
          disabled && !active && 'opacity-50',
        )}
      >
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              'block truncate text-[13.5px] font-medium',
              active ? 'text-accent' : 'text-ink',
            )}
          >
            {label}
          </span>
          {label !== id ? (
            <span className="block truncate font-mono text-2xs text-ink-faint">{id}</span>
          ) : null}
        </span>
        <span className="flex shrink-0 flex-wrap items-center gap-1.5">{badges}</span>
        {active ? (
          <Badge tone="accent" icon={<Check size={10} />}>
            {t.settings.current}
          </Badge>
        ) : null}
      </button>
    </li>
  );
}
