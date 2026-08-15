import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Layers } from 'lucide-react';
import { Page } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ProgressRing } from '@/components/ui/Progress';
import { EmptyState, ErrorState, SkeletonCards } from '@/components/ui/States';
import { useSubjects } from '@/hooks/useCurriculum';
import { useProgress } from '@/state/progress';
import { t } from '@/i18n/strings';
import { humanize } from '@/lib/utils';

export function CatalogPage() {
  const { data: subjects, status, error, reload } = useSubjects();
  const progress = useProgress();

  return (
    <Page title={t.catalog.title} subtitle={t.catalog.subtitle} wide>
      {status === 'loading' ? (
        <SkeletonCards count={6} />
      ) : status === 'error' ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !subjects?.length ? (
        <EmptyState title={t.empty.subjects} body={t.empty.subjectsBody} icon={<BookOpen size={24} />} />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {subjects.map((s) => {
            const percent = progress.subjectPercent(s.id, s.total_lessons);
            const done = progress.subjectLessonsDone(s.id);
            return (
              <Link key={s.id} to={`/courses/${s.id}`} className="group block focus:outline-none">
                <Card
                  interactive
                  className="flex h-full flex-col p-6 group-focus-visible:ring-2 group-focus-visible:ring-accent"
                >
                  <div className="flex items-start justify-between gap-4">
                    <span
                      aria-hidden="true"
                      className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-alt text-3xl"
                    >
                      {s.icon ?? '📘'}
                    </span>
                    <ProgressRing value={percent} size={52} stroke={5} />
                  </div>

                  <h2 className="mt-5 text-lg font-semibold tracking-[-0.015em] text-ink">
                    {s.title || humanize(s.id)}
                  </h2>
                  {s.title_bn && s.title_bn !== s.title ? (
                    <p className="mt-1 text-[13px] text-ink-muted">{s.title_bn}</p>
                  ) : null}

                  <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-ink-muted">
                    <span className="inline-flex items-center gap-1.5">
                      <Layers size={14} className="text-ink-faint" />
                      {t.common.units(s.total_units)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <BookOpen size={14} className="text-ink-faint" />
                      {t.common.lessons(s.total_lessons)}
                    </span>
                  </div>

                  {s.target_exams?.length ? (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {s.target_exams.slice(0, 4).map((e) => (
                        <Badge key={e} tone="neutral">
                          {e.toUpperCase()}
                        </Badge>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-4 text-[13px] font-medium">
                    <span className="text-ink-muted">
                      {done > 0 ? `${done} ${t.common.completed.toLowerCase()}` : t.common.notStarted}
                    </span>
                    <span className="inline-flex items-center gap-1 text-accent">
                      {t.catalog.open}
                      <ArrowRight
                        size={14}
                        className="transition-transform duration-200 group-hover:translate-x-0.5"
                      />
                    </span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </Page>
  );
}
