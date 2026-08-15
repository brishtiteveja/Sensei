import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Clock,
  Flame,
  GraduationCap,
  Play,
  Sparkles,
  Target,
} from 'lucide-react';
import { Page } from '@/components/layout/AppShell';
import { Card, SectionTitle } from '@/components/ui/Card';
import { LinkButton } from '@/components/ui/Button';
import { ProgressBar, ProgressRing } from '@/components/ui/Progress';
import { EmptyState, ErrorState, Skeleton, SkeletonCards } from '@/components/ui/States';
import { useSubjects } from '@/hooks/useCurriculum';
import { useProgress } from '@/state/progress';
import { t } from '@/i18n/strings';
import { cn, pct } from '@/lib/utils';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return t.dashboard.greetingMorning;
  if (h < 18) return t.dashboard.greetingAfternoon;
  return t.dashboard.greetingEvening;
}

export function DashboardPage() {
  const { data: subjects, status, error, reload } = useSubjects();
  const progress = useProgress();
  const { state, totals } = progress;

  const overall = useMemo(() => {
    const totalLessons = (subjects ?? []).reduce((s, x) => s + (x.total_lessons || 0), 0);
    return { totalLessons, percent: pct(totals.lessonsDone, totalLessons) };
  }, [subjects, totals.lessonsDone]);

  // "Next up" = first subject with unfinished lessons, preferring one already started.
  const nextUp = useMemo(() => {
    if (!subjects?.length) return null;
    const scored = subjects
      .map((s) => ({
        subject: s,
        done: progress.subjectLessonsDone(s.id),
        percent: progress.subjectPercent(s.id, s.total_lessons),
      }))
      .filter((x) => x.percent < 100);
    if (!scored.length) return null;
    const started = scored.filter((x) => x.done > 0).sort((a, b) => b.percent - a.percent);
    return (started[0] ?? scored[0]).subject;
  }, [subjects, progress]);

  return (
    <Page
      title={greeting()}
      subtitle={t.dashboard.subtitle}
      actions={
        <LinkButton to="/courses" variant="secondary" size="md">
          <BookOpen size={16} />
          {t.dashboard.browseCourses}
        </LinkButton>
      }
      wide
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {/* continue */}
        <div className="lg:col-span-2">
          {state.lastVisited ? (
            <Card className="relative overflow-hidden bg-accent p-0 shadow-card">
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.16]"
                style={{
                  backgroundImage:
                    'radial-gradient(circle at 88% -10%, #fff 0%, transparent 45%), radial-gradient(circle at 15% 120%, #fff 0%, transparent 40%)',
                }}
                aria-hidden="true"
              />
              <div className="relative flex flex-wrap items-end justify-between gap-6 p-7">
                <div className="min-w-0">
                  <p className="text-2xs font-semibold uppercase tracking-wider text-white/70">
                    {t.dashboard.continueLearning}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-white">
                    {state.lastVisited.lessonTitle}
                  </h2>
                  <p className="mt-1.5 text-sm text-white/75">
                    {state.lastVisited.subjectTitle}
                  </p>
                </div>
                <Link
                  to={`/courses/${state.lastVisited.subjectId}/lessons/${state.lastVisited.lessonId}`}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-accent shadow-soft transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:shadow-lift"
                >
                  <Play size={16} className="fill-current" />
                  {t.common.resume}
                </Link>
              </div>
            </Card>
          ) : (
            <Card className="p-7">
              <div className="flex flex-wrap items-center justify-between gap-6">
                <div className="min-w-0 max-w-md">
                  <p className="text-2xs font-semibold uppercase tracking-wider text-ink-faint">
                    {t.dashboard.continueLearning}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-ink">
                    {t.dashboard.continueEmpty}
                  </h2>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">
                    {t.dashboard.continueEmptyBody}
                  </p>
                </div>
                <LinkButton to="/courses" size="lg">
                  {t.dashboard.browseCourses}
                  <ArrowRight size={16} />
                </LinkButton>
              </div>
            </Card>
          )}

          <div className="mt-6 grid gap-5 sm:grid-cols-3">
            <StatCard
              icon={<GraduationCap size={17} />}
              label={t.dashboard.lessonsCompleted}
              value={String(totals.lessonsDone)}
              hint={
                overall.totalLessons
                  ? `${t.common.of} ${overall.totalLessons}`
                  : undefined
              }
            />
            <StatCard
              icon={<Flame size={17} />}
              label={t.dashboard.streak}
              value={String(state.streak.count)}
              hint={t.dashboard.streakBody(state.streak.count)}
              tone="warning"
            />
            <StatCard
              icon={<Clock size={17} />}
              label={t.dashboard.minutesLearned}
              value={String(totals.minutes)}
              hint={totals.practiceTotal ? `${totals.accuracy}% practice accuracy` : undefined}
              tone="info"
            />
          </div>
        </div>

        {/* overall ring */}
        <Card className="flex flex-col justify-between p-7">
          <div>
            <p className="text-2xs font-semibold uppercase tracking-wider text-ink-faint">
              {t.dashboard.overallProgress}
            </p>
            <div className="mt-5 flex items-center gap-5">
              <ProgressRing value={overall.percent} size={92} stroke={8} />
              <div className="min-w-0">
                <p className="text-2xl font-semibold tracking-[-0.02em] text-ink">
                  {totals.lessonsDone}
                  <span className="text-base font-normal text-ink-faint">
                    /{overall.totalLessons || '—'}
                  </span>
                </p>
                <p className="mt-1 text-[13px] text-ink-muted">{t.common.lessons(overall.totalLessons)}</p>
              </div>
            </div>
          </div>
          <div className="mt-7 space-y-3 border-t border-line pt-5">
            <QuickLink
              to="/practice"
              icon={<Target size={15} />}
              title={t.dashboard.quickPractice}
              body={t.dashboard.quickPracticeBody}
            />
            <QuickLink
              to="/tutor"
              icon={<Sparkles size={15} />}
              title={t.dashboard.askAnything}
              body={t.dashboard.askAnythingBody}
            />
          </div>
        </Card>
      </div>

      {/* mastery by subject */}
      <div className="mt-10">
        <SectionTitle
          action={
            <Link
              to="/courses"
              className="inline-flex items-center gap-1 text-[13px] font-medium text-accent hover:text-accent-strong"
            >
              {t.catalog.title}
              <ArrowRight size={14} />
            </Link>
          }
        >
          {t.dashboard.masteryBySubject}
        </SectionTitle>

        {status === 'loading' ? (
          <SkeletonCards count={3} />
        ) : status === 'error' ? (
          <ErrorState error={error} onRetry={reload} />
        ) : !subjects?.length ? (
          <EmptyState title={t.empty.subjects} body={t.empty.subjectsBody} />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {subjects.map((s) => {
              const done = progress.subjectLessonsDone(s.id);
              const percent = progress.subjectPercent(s.id, s.total_lessons);
              const isNext = nextUp?.id === s.id;
              return (
                <Link key={s.id} to={`/courses/${s.id}`} className="group block">
                  <Card interactive className="h-full p-5">
                    <div className="flex items-start gap-4">
                      <span
                        aria-hidden="true"
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface-alt text-2xl"
                      >
                        {s.icon ?? '📘'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="truncate text-[15px] font-semibold text-ink">
                            {s.title}
                          </h3>
                          {isNext ? (
                            <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-2xs font-semibold text-accent">
                              {t.dashboard.nextUp}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-2xs text-ink-muted">
                          {done} / {s.total_lessons} {t.common.complete}
                        </p>
                      </div>
                    </div>
                    <ProgressBar
                      value={percent}
                      className="mt-5"
                      tone={percent >= 100 ? 'success' : 'accent'}
                      label={`${s.title} progress`}
                    />
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </Page>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
  tone = 'accent',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone?: 'accent' | 'warning' | 'info';
}) {
  const tones = {
    accent: 'bg-accent-soft text-accent',
    warning: 'bg-warning-bg text-warning-text',
    info: 'bg-info-bg text-info-text',
  } as const;
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2.5">
        <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', tones[tone])}>
          {icon}
        </span>
        <span className="text-2xs font-semibold uppercase tracking-wider text-ink-faint">
          {label}
        </span>
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-[-0.03em] tabular-nums text-ink">{value}</p>
      {hint ? <p className="mt-1 text-2xs text-ink-muted">{hint}</p> : null}
    </Card>
  );
}

function QuickLink({
  to,
  icon,
  title,
  body,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <Link
      to={to}
      className="group flex items-start gap-3 rounded-xl px-3 py-2.5 -mx-3 transition-colors duration-200 hover:bg-surface-alt"
    >
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-medium text-ink">{title}</p>
        <p className="mt-0.5 text-2xs leading-snug text-ink-muted">{body}</p>
      </div>
      <ArrowRight
        size={15}
        className="mt-1.5 shrink-0 text-ink-faint transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-accent"
      />
    </Link>
  );
}

export function DashboardSkeleton() {
  return (
    <Page wide>
      <Skeleton className="h-40 w-full rounded-2xl" />
    </Page>
  );
}
