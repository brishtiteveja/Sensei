import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, Play, Sparkles, Target } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LinkButton } from '@/components/ui/Button';
import { ProgressBar, ProgressRing } from '@/components/ui/Progress';
import { EmptyState, ErrorState, Skeleton, SkeletonText } from '@/components/ui/States';
import { CourseSidebar } from '@/components/course/CourseSidebar';
import { useSubject } from '@/hooks/useCurriculum';
import { useProgress } from '@/state/progress';
import { buildOutline, unitProgress } from '@/lib/course';
import { t } from '@/i18n/strings';
import { cn, difficultyTone } from '@/lib/utils';

export function CourseDetailPage() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const { data: subject, status, error, reload } = useSubject(subjectId);
  const progress = useProgress();

  const outline = useMemo(
    () => buildOutline(subject, progress.isLessonComplete),
    [subject, progress],
  );

  if (status === 'loading') return <CourseSkeleton />;

  if (status === 'error') {
    return (
      <div className="mx-auto max-w-2xl px-8 py-20">
        <ErrorState error={error} onRetry={reload} title={t.errors.title} />
        <div className="mt-6 text-center">
          <Link to="/courses" className="text-[13px] font-medium text-accent hover:underline">
            ← {t.catalog.title}
          </Link>
        </div>
      </div>
    );
  }

  if (!subject) {
    return (
      <div className="mx-auto max-w-2xl px-8 py-20">
        <EmptyState
          title={t.errors.subjectNotFound}
          action={
            <LinkButton to="/courses" variant="secondary">
              {t.catalog.title}
            </LinkButton>
          }
        />
      </div>
    );
  }

  const current = outline.current;

  return (
    <div className="flex h-full min-h-0">
      <aside className="hidden w-[320px] shrink-0 border-r border-line bg-surface lg:block">
        <CourseSidebar
          subject={subject}
          outline={outline}
          isComplete={progress.isLessonComplete}
        />
      </aside>

      <div className="s-scroll min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[880px] px-8 py-9 xl:px-10">
          <Link
            to="/courses"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
          >
            <ArrowLeft size={14} />
            {t.catalog.title}
          </Link>

          <header className="mt-5 flex flex-wrap items-start justify-between gap-6">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <span aria-hidden="true" className="text-4xl leading-none">
                  {subject.icon ?? '📘'}
                </span>
                <div className="min-w-0">
                  <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.03em] text-ink">
                    {subject.title}
                  </h1>
                  {subject.title_bn && subject.title_bn !== subject.title ? (
                    <p className="mt-0.5 text-sm text-ink-muted">{subject.title_bn}</p>
                  ) : null}
                </div>
              </div>
              {subject.target_exams?.length ? (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="text-2xs font-semibold uppercase tracking-wider text-ink-faint">
                    {t.catalog.exams}
                  </span>
                  {subject.target_exams.map((e) => (
                    <Badge key={e} tone="accent">
                      {e.toUpperCase()}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>
            <ProgressRing value={outline.percent} size={76} stroke={7} />
          </header>

          {/* continue / start */}
          {current ? (
            <Card className="mt-8 overflow-hidden p-0">
              <div className="flex flex-wrap items-center justify-between gap-5 p-6">
                <div className="min-w-0">
                  <p className="text-2xs font-semibold uppercase tracking-wider text-accent">
                    {outline.completedCount > 0 ? t.common.continue : t.dashboard.nextUp}
                  </p>
                  <h2 className="mt-2 text-lg font-semibold tracking-[-0.015em] text-ink">
                    {current.lesson.title}
                  </h2>
                  <p className="mt-1 text-[13px] text-ink-muted">
                    {current.unit.title}
                    {current.lesson.minutes ? ` · ${t.common.minutes(current.lesson.minutes)}` : ''}
                  </p>
                </div>
                <LinkButton
                  to={`/courses/${subject.subject}/lessons/${current.lesson.id}`}
                  size="lg"
                >
                  <Play size={15} className="fill-current" />
                  {outline.completedCount > 0 ? t.common.resume : t.common.startLesson}
                </LinkButton>
              </div>
              <div className="border-t border-line bg-surface-alt/60 px-6 py-3.5">
                <div className="flex items-center gap-3">
                  <ProgressBar value={outline.percent} label={t.course.yourProgress} />
                  <span className="shrink-0 text-2xs font-medium tabular-nums text-ink-muted">
                    {outline.completedCount}/{outline.totalLessons}
                  </span>
                </div>
              </div>
            </Card>
          ) : outline.totalLessons > 0 ? (
            <Card className="mt-8 border-success/30 bg-success-bg p-6">
              <p className="text-[15px] font-semibold text-success-text">
                Course complete — every lesson done.
              </p>
              <p className="mt-1 text-[13px] text-success-text/85">
                Keep it sharp with past-exam practice.
              </p>
              <LinkButton
                to={`/practice?subject=${subject.subject}`}
                variant="secondary"
                className="mt-4"
              >
                <Target size={15} />
                {t.course.practiceThisSubject}
              </LinkButton>
            </Card>
          ) : null}

          <Card className="mt-6 p-6">
            <h2 className="text-[15px] font-semibold text-ink">{t.course.aboutThisCourse}</h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-muted">
              {t.course.aboutBody}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <LinkButton to={`/practice?subject=${subject.subject}`} variant="secondary" size="sm">
                <Target size={14} />
                {t.course.practiceThisSubject}
              </LinkButton>
              <LinkButton to="/tutor" variant="ghost" size="sm">
                <Sparkles size={14} />
                {t.tutor.title}
              </LinkButton>
            </div>
          </Card>

          {/* units */}
          <section className="mt-10">
            <h2 className="text-lg font-semibold tracking-[-0.015em] text-ink">
              {t.course.unitsTitle}
            </h2>

            {!subject.units?.length ? (
              <EmptyState className="mt-4" title={t.empty.lessons} icon={<BookOpen size={22} />} />
            ) : (
              <ol className="mt-5 space-y-4">
                {subject.units.map((unit, i) => {
                  const up = unitProgress(unit, progress.isLessonComplete);
                  return (
                    <li key={unit.id}>
                      <Card className="overflow-hidden p-0">
                        <div className="flex items-start gap-4 px-6 pb-4 pt-5">
                          <span
                            className={cn(
                              'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[13px] font-semibold tabular-nums',
                              up.percent === 100
                                ? 'bg-success-bg text-success-text'
                                : 'bg-surface-alt text-ink-muted',
                            )}
                          >
                            {i + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-[15px] font-semibold text-ink">{unit.title}</h3>
                            <p className="mt-0.5 text-2xs text-ink-muted">
                              {t.common.lessons(unit.lessons?.length ?? 0)}
                              {unit.nctb_chapter
                                ? ` · ${t.course.chapter} ${unit.nctb_chapter}`
                                : ''}
                              {unit.nctb_class ? ` · ${t.course.class} ${unit.nctb_class}` : ''}
                            </p>
                          </div>
                          <span className="shrink-0 text-2xs font-medium tabular-nums text-ink-muted">
                            {up.done}/{up.total}
                          </span>
                        </div>

                        <ul className="divide-y divide-line border-t border-line">
                          {(unit.lessons ?? []).map((lesson) => {
                            const state = outline.byId.get(lesson.id)?.state ?? 'available';
                            return (
                              <li key={lesson.id}>
                                <Link
                                  to={`/courses/${subject.subject}/lessons/${lesson.id}`}
                                  className="group flex items-center gap-4 px-6 py-3.5 transition-colors duration-200 hover:bg-surface-alt"
                                >
                                  <span
                                    className={cn(
                                      'h-2 w-2 shrink-0 rounded-full',
                                      state === 'completed'
                                        ? 'bg-success'
                                        : state === 'current'
                                          ? 'bg-accent'
                                          : 'bg-line-strong',
                                    )}
                                    aria-hidden="true"
                                  />
                                  <span className="min-w-0 flex-1">
                                    <span className="block truncate text-[13.5px] font-medium text-ink">
                                      {lesson.title}
                                    </span>
                                    {lesson.concepts?.length ? (
                                      <span className="mt-0.5 block truncate text-2xs text-ink-muted">
                                        {lesson.concepts.join(' · ')}
                                      </span>
                                    ) : null}
                                  </span>
                                  {lesson.difficulty ? (
                                    <Badge tone={difficultyTone(lesson.difficulty)}>
                                      {lesson.difficulty}
                                    </Badge>
                                  ) : null}
                                  {lesson.minutes ? (
                                    <span className="w-14 shrink-0 text-right text-2xs tabular-nums text-ink-muted">
                                      {t.common.minutes(lesson.minutes)}
                                    </span>
                                  ) : null}
                                  <ArrowRight
                                    size={15}
                                    className="shrink-0 text-ink-faint transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-accent"
                                  />
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      </Card>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function CourseSkeleton() {
  return (
    <div className="flex h-full min-h-0">
      <aside className="hidden w-[320px] shrink-0 border-r border-line bg-surface p-5 lg:block">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-4 h-2 w-full rounded-full" />
        <Skeleton className="mt-4 h-9 w-full" />
        <div className="mt-6 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      </aside>
      <div className="min-w-0 flex-1 px-8 py-9">
        <div className="mx-auto max-w-[880px]">
          <Skeleton className="h-9 w-72" />
          <Skeleton className="mt-8 h-32 w-full rounded-2xl" />
          <div className="mt-6 rounded-2xl border border-line bg-card p-6">
            <SkeletonText lines={3} />
          </div>
          <div className="mt-8 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-40 w-full rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
