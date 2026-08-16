import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ChevronDown, Circle, Lock, PlayCircle, Search, X } from 'lucide-react';
import { ProgressBar } from '@/components/ui/Progress';
import type { CourseOutline, LessonState } from '@/lib/course';
import { unitProgress } from '@/lib/course';
import type { SubjectDetail } from '@/lib/types';
import { t } from '@/i18n/strings';
import { cn } from '@/lib/utils';

/** Khan-Academy-style persistent unit/lesson tree. */
export function CourseSidebar({
  subject,
  outline,
  activeLessonId,
  isComplete,
}: {
  subject: SubjectDetail;
  outline: CourseOutline;
  activeLessonId?: string;
  isComplete: (id: string) => boolean;
}) {
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // Open the unit containing the active (or current) lesson, keep others as-is.
  const autoOpenUnitId =
    (activeLessonId ? outline.byId.get(activeLessonId)?.unit.id : undefined) ??
    outline.current?.unit.id;

  useEffect(() => {
    if (!autoOpenUnitId) return;
    setCollapsed((c) => (c[autoOpenUnitId] ? { ...c, [autoOpenUnitId]: false } : c));
  }, [autoOpenUnitId]);

  const units = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return subject.units ?? [];
    return (subject.units ?? [])
      .map((u) => ({
        ...u,
        lessons: (u.lessons ?? []).filter(
          (l) =>
            l.title.toLowerCase().includes(q) ||
            (l.concepts ?? []).some((c) => c.toLowerCase().includes(q)) ||
            u.title.toLowerCase().includes(q),
        ),
      }))
      .filter((u) => u.lessons.length > 0);
  }, [subject.units, query]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-line px-5 py-5">
        <div className="flex items-start gap-3">
          <span aria-hidden="true" className="text-2xl leading-none">
            {subject.icon ?? '📘'}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[15px] font-semibold tracking-[-0.01em] text-ink">
              {subject.title}
            </h2>
            <p className="mt-0.5 text-2xs text-ink-muted">
              {t.common.units(subject.total_units)} · {t.common.lessons(subject.total_lessons)}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <ProgressBar value={outline.percent} label={t.course.yourProgress} />
          <span className="shrink-0 text-2xs font-semibold tabular-nums text-ink-muted">
            {outline.percent}%
          </span>
        </div>

        <div className="relative mt-4">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.course.searchPlaceholder}
            aria-label={t.course.searchPlaceholder}
            className="h-9 w-full rounded-lg border border-line bg-surface-alt pl-9 pr-8 text-[13px] text-ink placeholder:text-ink-faint focus:border-accent focus:bg-surface focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label={t.course.clearFilter}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-ink-faint hover:text-ink"
            >
              <X size={13} />
            </button>
          ) : null}
        </div>
      </div>

      <nav className="s-scroll min-h-0 flex-1 overflow-y-auto px-3 py-3" aria-label={t.course.unitsTitle}>
        {!units.length ? (
          <p className="px-3 py-8 text-center text-[13px] text-ink-muted">{t.course.noMatches}</p>
        ) : (
          <ul className="space-y-1">
            {units.map((unit, i) => {
              const open = query ? true : !collapsed[unit.id];
              const up = unitProgress(unit, isComplete);
              return (
                <li key={unit.id}>
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setCollapsed((c) => ({ ...c, [unit.id]: open }))}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors duration-200 hover:bg-surface-alt"
                  >
                    <ChevronDown
                      size={15}
                      className={cn(
                        'shrink-0 text-ink-faint transition-transform duration-200',
                        !open && '-rotate-90',
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-1.5">
                        <span className="text-2xs font-semibold tabular-nums text-ink-faint">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span className="truncate text-[13.5px] font-medium text-ink">
                          {unit.title}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-2xs text-ink-faint">
                        {up.done}/{up.total}
                        {unit.nctb_chapter
                          ? ` · ${t.course.chapter} ${unit.nctb_chapter}`
                          : ''}
                      </span>
                    </span>
                    {up.total > 0 && up.done === up.total ? (
                      <Check size={14} className="shrink-0 text-success" />
                    ) : null}
                  </button>

                  {open ? (
                    <ul className="ml-[19px] space-y-0.5 border-l border-line pb-1 pl-3 pt-0.5">
                      {(unit.lessons ?? []).map((lesson) => {
                        const entry = outline.byId.get(lesson.id);
                        const state: LessonState = entry?.state ?? 'available';
                        const active = lesson.id === activeLessonId;
                        return (
                          <li key={lesson.id}>
                            <Link
                              to={`/courses/${subject.subject}/lessons/${lesson.id}`}
                              aria-current={active ? 'page' : undefined}
                              className={cn(
                                'group flex items-start gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors duration-200',
                                active
                                  ? 'bg-accent-soft font-medium text-accent'
                                  : 'text-ink-soft hover:bg-surface-alt hover:text-ink',
                              )}
                            >
                              <LessonStateIcon state={state} active={active} />
                              <span className="min-w-0 flex-1">
                                <span
                                  className={cn(
                                    'block truncate leading-snug',
                                    state === 'locked' && !active && 'text-ink-faint',
                                  )}
                                >
                                  {lesson.title}
                                </span>
                                {lesson.minutes ? (
                                  <span className="mt-0.5 block text-2xs text-ink-faint">
                                    {t.common.minutes(lesson.minutes)}
                                    {lesson.difficulty ? ` · ${lesson.difficulty}` : ''}
                                  </span>
                                ) : null}
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </nav>
    </div>
  );
}

function LessonStateIcon({ state, active }: { state: LessonState; active: boolean }) {
  const cls = 'mt-0.5 shrink-0';
  if (state === 'completed')
    return <Check size={14} className={cn(cls, 'text-success')} aria-label={t.common.completed} />;
  if (state === 'current' || active)
    return (
      <PlayCircle size={14} className={cn(cls, 'text-accent')} aria-label={t.common.inProgress} />
    );
  if (state === 'locked')
    return <Lock size={13} className={cn(cls, 'text-ink-faint')} aria-label={t.common.locked} />;
  return <Circle size={12} className={cn(cls, 'mt-1 text-ink-faint')} aria-hidden="true" />;
}
