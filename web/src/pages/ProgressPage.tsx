import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, BarChart3, Clock, Flame, Target, TrendingUp, Trash2 } from 'lucide-react';
import { Page } from '@/components/layout/AppShell';
import { Card, SectionTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar, ProgressRing } from '@/components/ui/Progress';
import { EmptyState, ErrorState, SkeletonCards } from '@/components/ui/States';
import { Modal } from '@/components/ui/Modal';
import { useSubjects } from '@/hooks/useCurriculum';
import { useProgress } from '@/state/progress';
import { t } from '@/i18n/strings';
import { cn, pct } from '@/lib/utils';

export function ProgressPage() {
  const { data: subjects, status, error, reload } = useSubjects();
  const progress = useProgress();
  const { totals, state } = progress;
  const [confirmReset, setConfirmReset] = useState(false);

  const rows = useMemo(() => {
    return (subjects ?? [])
      .map((s) => ({
        id: s.id,
        title: s.title,
        icon: s.icon,
        done: progress.subjectLessonsDone(s.id),
        total: s.total_lessons,
        percent: progress.subjectPercent(s.id, s.total_lessons),
      }))
      .sort((a, b) => b.percent - a.percent || a.title.localeCompare(b.title));
  }, [subjects, progress]);

  const concepts = useMemo(() => progress.conceptMastery(), [progress]);

  const overallPercent = useMemo(() => {
    const total = (subjects ?? []).reduce((s, x) => s + (x.total_lessons || 0), 0);
    return pct(totals.lessonsDone, total);
  }, [subjects, totals.lessonsDone]);

  const strongest = rows.find((r) => r.percent > 0);
  const weakest = [...rows].reverse().find((r) => r.total > 0);

  return (
    <Page
      title={t.progress.title}
      subtitle={t.progress.subtitle}
      actions={
        <Button variant="ghost" onClick={() => setConfirmReset(true)}>
          <Trash2 size={15} />
          {t.progress.reset}
        </Button>
      }
      wide
    >
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <Card className="p-7">
          <p className="text-2xs font-semibold uppercase tracking-wider text-ink-faint">
            {t.progress.overall}
          </p>
          <div className="mt-6 flex justify-center">
            <ProgressRing value={overallPercent} size={132} stroke={10}>
              <span className="text-2xl font-semibold tabular-nums">{overallPercent}%</span>
            </ProgressRing>
          </div>
          <dl className="mt-7 space-y-3.5 border-t border-line pt-5 text-[13px]">
            <Row icon={<Award size={14} />} label={t.progress.lessonsDone} value={String(totals.lessonsDone)} />
            <Row icon={<Clock size={14} />} label={t.progress.timeSpent} value={t.common.minutes(totals.minutes)} />
            <Row icon={<Flame size={14} />} label={t.dashboard.streak} value={String(state.streak.count)} />
            <Row
              icon={<Target size={14} />}
              label={t.progress.questionsAnswered}
              value={String(totals.practiceTotal)}
            />
            <Row
              icon={<TrendingUp size={14} />}
              label={t.progress.practiceAccuracy}
              value={totals.practiceTotal ? `${totals.accuracy}%` : '—'}
            />
          </dl>
          <p className="mt-6 border-t border-line pt-4 text-2xs leading-relaxed text-ink-faint">
            {t.progress.localOnlyNote}
          </p>
        </Card>

        <div className="min-w-0 space-y-6">
          <Card className="p-6">
            <SectionTitle className="mb-5">{t.progress.bySubject}</SectionTitle>
            {status === 'loading' ? (
              <SkeletonCards count={2} className="grid-cols-1 sm:grid-cols-1 xl:grid-cols-1" />
            ) : status === 'error' ? (
              <ErrorState error={error} onRetry={reload} compact />
            ) : !rows.length ? (
              <EmptyState compact title={t.empty.subjects} body={t.empty.subjectsBody} />
            ) : (
              <ul className="space-y-5">
                {rows.map((r) => (
                  <li key={r.id}>
                    <Link to={`/courses/${r.id}`} className="group block">
                      <div className="flex items-center justify-between gap-4">
                        <span className="flex min-w-0 items-center gap-2.5">
                          <span aria-hidden="true" className="text-lg leading-none">
                            {r.icon ?? '📘'}
                          </span>
                          <span className="truncate text-[14px] font-medium text-ink group-hover:text-accent">
                            {r.title}
                          </span>
                        </span>
                        <span className="shrink-0 text-2xs tabular-nums text-ink-muted">
                          {r.done}/{r.total} · {r.percent}%
                        </span>
                      </div>
                      <ProgressBar
                        value={r.percent}
                        className="mt-2.5"
                        tone={r.percent >= 100 ? 'success' : 'accent'}
                        label={`${r.title} progress`}
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {strongest && weakest && strongest.id !== weakest.id ? (
              <div className="mt-7 grid gap-3 border-t border-line pt-5 sm:grid-cols-2">
                <Highlight label={t.progress.strongest} value={strongest.title} tone="success" />
                <Highlight label={t.progress.weakest} value={weakest.title} tone="warning" />
              </div>
            ) : null}
          </Card>

          <Card className="p-6">
            <SectionTitle className="mb-1.5">{t.progress.byConcept}</SectionTitle>
            <p className="mb-5 text-[13px] text-ink-muted">{t.progress.conceptHint}</p>
            {!concepts.length ? (
              <EmptyState
                compact
                title={t.empty.progress}
                body={t.empty.progressBody}
                icon={<BarChart3 size={20} />}
              />
            ) : (
              <div className="flex flex-wrap gap-2">
                {concepts.map((c) => (
                  <Badge key={c.concept} tone="accent" className="px-2.5 py-1 text-[12px]">
                    {c.concept}
                    {c.hits > 1 ? <span className="ml-1 opacity-60">×{c.hits}</span> : null}
                  </Badge>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title={t.progress.resetConfirmTitle}
        description={t.progress.resetConfirmBody}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmReset(false)}>
              {t.common.cancel}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                progress.reset();
                setConfirmReset(false);
              }}
            >
              {t.progress.reset}
            </Button>
          </>
        }
      />
    </Page>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="flex items-center gap-2 text-ink-muted">
        <span className="text-ink-faint">{icon}</span>
        {label}
      </dt>
      <dd className="font-semibold tabular-nums text-ink">{value}</dd>
    </div>
  );
}

function Highlight({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'success' | 'warning';
}) {
  return (
    <div
      className={cn(
        'rounded-xl px-4 py-3',
        tone === 'success' ? 'bg-success-bg' : 'bg-warning-bg',
      )}
    >
      <p
        className={cn(
          'text-2xs font-semibold uppercase tracking-wider',
          tone === 'success' ? 'text-success-text' : 'text-warning-text',
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          'mt-1 truncate text-[14px] font-medium',
          tone === 'success' ? 'text-success-text' : 'text-warning-text',
        )}
      >
        {value}
      </p>
    </div>
  );
}
