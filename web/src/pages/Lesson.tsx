import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Globe2,
  ListChecks,
  NotebookPen,
  Sigma,
  Sparkles,
  Target,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button, LinkButton } from '@/components/ui/Button';
import { EmptyState, ErrorState, Skeleton, SkeletonText } from '@/components/ui/States';
import { SectionRule } from '@/components/art/Flourish';
import { SubjectArt } from '@/components/art/SubjectArt';
import { TutorChat } from '@/components/tutor/TutorChat';
import { NotebookSheet } from '@/components/notebook/NotebookSheet';
import { useAsync } from '@/hooks/useAsync';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useSplitPane } from '@/hooks/useSplitPane';
import { useSubject } from '@/hooks/useCurriculum';
import { getLessonContent } from '@/lib/api';
import { buildOutline } from '@/lib/course';
import type { LessonContent, TeachingStep } from '@/lib/types';
import { useProgress } from '@/state/progress';
import { t } from '@/i18n/strings';
import { cn, difficultyTone } from '@/lib/utils';

const STEP_TONES: Record<string, string> = {
  intro: 'bg-info-bg text-info-text',
  concept: 'bg-accent-soft text-accent',
  teach: 'bg-accent-soft text-accent',
  practice: 'bg-warning-bg text-warning-text',
  mastery: 'bg-success-bg text-success-text',
};

export function LessonPage() {
  const { subjectId, lessonId } = useParams<{ subjectId: string; lessonId: string }>();
  const [searchParams] = useSearchParams();
  const progress = useProgress();

  const subjectQuery = useSubject(subjectId);
  const contentQuery = useAsync<LessonContent>(
    (signal) => getLessonContent(lessonId!, signal),
    [lessonId],
    { enabled: Boolean(lessonId) },
  );

  const subject = subjectQuery.data;
  const content = contentQuery.data;

  const outline = useMemo(
    () => buildOutline(subject, progress.isLessonComplete),
    [subject, progress],
  );
  const entry = lessonId ? outline.byId.get(lessonId) : undefined;
  const prev = entry ? outline.flat[entry.ordinal - 1] : undefined;
  const next = entry ? outline.flat[entry.ordinal + 1] : undefined;

  const [activeStep, setActiveStep] = useState<number | undefined>(undefined);
  const [notebookOpen, setNotebookOpen] = useState(false);
  /** Work handed over from the lesson notebook, seeded into the docked tutor. */
  const [notebookWork, setNotebookWork] = useState<string | null>(null);
  const split = useSplitPane({ storageKey: 'lesson.split' });
  // Below 1024px the two panes stack instead of sitting side by side.
  const isSplit = useMediaQuery('(min-width: 1024px)');

  // Reset the step selection when moving between lessons.
  useEffect(() => setActiveStep(undefined), [lessonId]);

  // Remember where the student was for the dashboard's "continue" card.
  const { recordVisit } = progress;
  useEffect(() => {
    if (!subject || !entry || !lessonId) return;
    recordVisit({
      subjectId: subject.subject,
      unitId: entry.unit.id,
      lessonId,
      lessonTitle: entry.lesson.title,
      subjectTitle: subject.title,
    });
  }, [subject, entry, lessonId, recordVisit]);

  const isComplete = lessonId ? progress.isLessonComplete(lessonId) : false;

  const toggleComplete = useCallback(() => {
    if (!lessonId || !subject || !entry) return;
    if (isComplete) progress.uncompleteLesson(lessonId);
    else
      progress.completeLesson({
        lessonId,
        subjectId: subject.subject,
        unitId: entry.unit.id,
        concepts: entry.lesson.concepts ?? [],
        minutes: entry.lesson.minutes ?? 0,
      });
  }, [lessonId, subject, entry, isComplete, progress]);

  // `?ask=` lets other screens (practice) deep-link a preloaded tutor question.
  const seededQuestion = searchParams.get('ask');
  const seed = useMemo(() => {
    // Work handed over from the notebook wins: the student just asked for it.
    if (notebookWork) return { key: `${lessonId}:work:${notebookWork.length}`, message: notebookWork };
    return seededQuestion ? { key: `${lessonId}:${seededQuestion}`, message: seededQuestion } : null;
  }, [seededQuestion, lessonId, notebookWork]);

  const suggestions = useMemo(() => {
    const prompts = content?.practice_prompts ?? [];
    if (prompts.length) return prompts;
    const title = content?.title ?? entry?.lesson.title;
    return title
      ? [
          `Where should I start with ${title}?`,
          `What is the most common mistake in ${title}?`,
          `Give me a question to test myself on ${title}.`,
        ]
      : [];
  }, [content, entry]);

  const loading = subjectQuery.status === 'loading' || contentQuery.status === 'loading';
  const failed = contentQuery.status === 'error' && subjectQuery.status === 'error';

  return (
    <div
      ref={split.containerRef}
      className="flex min-h-full w-full flex-col lg:h-full lg:min-h-0 lg:flex-row"
    >
      {/* ---------------- left: the lesson ---------------- */}
      {/* Below lg the page scrolls as one column; at lg each pane scrolls itself. */}
      <div className="s-scroll relative min-w-0 flex-1 lg:min-h-0 lg:overflow-y-auto">
        {/* subject motif fading out behind the lesson title */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[190px] overflow-hidden">
          <SubjectArt subject={subjectId} className="h-full w-full" opacity={0.6} />
          <span
            className="absolute inset-0"
            style={{
              backgroundImage:
                'linear-gradient(to bottom, rgb(var(--s-page) / 0.35) 0%, rgb(var(--s-page) / 0.85) 55%, rgb(var(--s-page)) 100%)',
            }}
          />
        </div>

        <div className="relative mx-auto max-w-[820px] px-8 py-8 xl:px-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              to={`/courses/${subjectId}`}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
            >
              <ArrowLeft size={14} />
              {subject?.title ?? t.lesson.backToCourse}
            </Link>
            <div className="flex items-center gap-1.5">
              <Button variant="ghost" onClick={() => setNotebookOpen(true)} className="h-8 px-2.5">
                <NotebookPen size={15} />
                <span className="hidden sm:inline">{t.notebook.open}</span>
              </Button>
              <LessonNavButton to={prev ? `/courses/${subjectId}/lessons/${prev.lesson.id}` : null} dir="prev" />
              <LessonNavButton to={next ? `/courses/${subjectId}/lessons/${next.lesson.id}` : null} dir="next" />
            </div>
          </div>

          {loading ? (
            <LessonSkeleton />
          ) : failed ? (
            <ErrorState
              className="mt-8"
              error={contentQuery.error ?? subjectQuery.error}
              onRetry={() => {
                contentQuery.reload();
                subjectQuery.reload();
              }}
            />
          ) : (
            <>
              <header className="mt-5">
                {entry ? (
                  <p className="text-2xs font-semibold uppercase tracking-wider text-accent">
                    {entry.unit.title}
                  </p>
                ) : null}
                <h1 className="mt-2 text-[30px] font-semibold leading-tight tracking-[-0.03em] text-ink">
                  {content?.title ?? entry?.lesson.title ?? t.errors.lessonNotFound}
                </h1>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {entry?.lesson.difficulty ? (
                    <Badge tone={difficultyTone(entry.lesson.difficulty)}>
                      {entry.lesson.difficulty}
                    </Badge>
                  ) : null}
                  {entry?.lesson.minutes ? (
                    <Badge tone="neutral">{t.common.minutes(entry.lesson.minutes)}</Badge>
                  ) : null}
                  {isComplete ? (
                    <Badge tone="success" icon={<Check size={11} />}>
                      {t.common.completed}
                    </Badge>
                  ) : null}
                  {entry?.lesson.concepts?.map((c) => (
                    <Badge key={c} tone="accent">
                      {c}
                    </Badge>
                  ))}
                </div>
              </header>

              {content?.has_content === false ? (
                <EmptyState
                  className="mt-8"
                  title={t.empty.lessonContent}
                  body={t.empty.lessonContentBody}
                  icon={<Sparkles size={22} />}
                />
              ) : null}

              {content?.learning_objectives?.length ? (
                <Section
                  className="mt-9"
                  icon={<ListChecks size={16} />}
                  title={t.lesson.objectives}
                >
                  <ul className="space-y-2.5">
                    {content.learning_objectives.map((o, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                        <span className="text-[14.5px] leading-relaxed text-ink-soft">{o}</span>
                      </li>
                    ))}
                  </ul>
                </Section>
              ) : null}

              {content?.teaching_steps?.length ? (
                <Section className="mt-10" icon={<Target size={16} />} title={t.lesson.steps}>
                  <ol className="relative space-y-3">
                    {content.teaching_steps.map((step, i) => (
                      <StepCard
                        key={step.step ?? i}
                        step={step}
                        active={activeStep === step.step}
                        isLast={i === (content.teaching_steps?.length ?? 0) - 1}
                        onSelect={() => setActiveStep((s) => (s === step.step ? undefined : step.step))}
                      />
                    ))}
                  </ol>
                  <p className="mt-3 text-2xs text-ink-faint">
                    Selecting a step tells Sensei where you are — it teaches from there.
                  </p>
                </Section>
              ) : null}

              {content?.key_formulas?.length ? (
                <Section className="mt-10" icon={<Sigma size={16} />} title={t.lesson.keyFormulas}>
                  <div className="space-y-2">
                    {content.key_formulas.map((f, i) => (
                      <div
                        key={i}
                        className="relative overflow-hidden rounded-xl border border-accent/25 bg-accent-soft/70 px-4 py-3"
                      >
                        {/* gradient rail marking a formula block */}
                        <span
                          aria-hidden="true"
                          className="absolute inset-y-0 left-0 w-1"
                          style={{
                            backgroundImage:
                              'linear-gradient(180deg, rgb(var(--s-grad-1)), rgb(var(--s-grad-3)))',
                          }}
                        />
                        <code className="block pl-3 font-mono text-[13.5px] leading-relaxed text-accent">
                          {f}
                        </code>
                      </div>
                    ))}
                  </div>
                </Section>
              ) : null}

              {content?.common_mistakes?.length ? (
                <Section
                  className="mt-10"
                  icon={<AlertTriangle size={16} />}
                  title={t.lesson.commonMistakes}
                >
                  <ul className="space-y-2.5">
                    {content.common_mistakes.map((m, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-3 rounded-xl border-l-[3px] border-warning bg-warning-bg/70 px-4 py-3"
                      >
                        <AlertTriangle size={15} className="mt-0.5 shrink-0 text-warning-text" />
                        <span className="text-[14px] leading-relaxed text-warning-text">{m}</span>
                      </li>
                    ))}
                  </ul>
                </Section>
              ) : null}

              {content?.real_world_example ? (
                <Section className="mt-10" icon={<Globe2 size={16} />} title={t.lesson.realWorld}>
                  <blockquote className="rounded-2xl border border-line bg-surface-alt/70 px-5 py-4 text-[14.5px] leading-relaxed text-ink-soft">
                    {content.real_world_example}
                  </blockquote>
                </Section>
              ) : null}

              {/* footer actions */}
              <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
                <Button
                  variant={isComplete ? 'secondary' : 'primary'}
                  onClick={toggleComplete}
                  disabled={!entry}
                >
                  <Check size={16} />
                  {isComplete ? t.lesson.markedComplete : t.lesson.markComplete}
                </Button>
                {next ? (
                  <LinkButton
                    to={`/courses/${subjectId}/lessons/${next.lesson.id}`}
                    variant="secondary"
                  >
                    {t.lesson.nextLesson}
                    <ArrowRight size={15} />
                  </LinkButton>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ---------------- splitter ---------------- */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={t.lesson.resizeHandle}
        aria-valuenow={Math.round(split.width)}
        aria-valuemin={split.min}
        aria-valuemax={split.max}
        tabIndex={0}
        onMouseDown={(e) => {
          e.preventDefault();
          split.startDrag();
        }}
        onKeyDown={split.onKeyDown}
        className={cn(
          'group relative hidden w-px shrink-0 cursor-col-resize bg-line transition-colors duration-200 lg:block',
          split.dragging && 'bg-accent',
        )}
      >
        <span className="absolute inset-y-0 -left-2 -right-2 z-10 block" />
        <span
          className={cn(
            'absolute left-1/2 top-1/2 h-10 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-line-strong opacity-0 transition-opacity duration-200 group-hover:opacity-100',
            split.dragging && 'opacity-100 bg-accent',
          )}
        />
      </div>

      {/* ---------------- right: docked tutor ---------------- */}
      <div
        className="relative h-[600px] shrink-0 border-t border-line bg-surface/70 lg:h-auto lg:min-h-0 lg:border-t-0"
        style={isSplit ? { width: `${split.width}%`, minWidth: 340 } : undefined}
      >
        {/* the tutor pane gets its own glow so it reads as a separate place */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(70% 40% at 100% 0%, rgb(var(--s-grad-2) / 0.14), transparent 65%), radial-gradient(60% 40% at 0% 100%, rgb(var(--s-grad-1) / 0.10), transparent 65%)',
          }}
        />
        <TutorChat
          contextType="topic_study"
          contextData={{
            lesson_id: lessonId,
            ...(activeStep ? { lesson_step: activeStep } : {}),
            subject: subjectId,
          }}
          suggestions={suggestions}
          seed={seed}
          title={t.lesson.tutorPanelTitle}
          subtitle={
            activeStep
              ? `${t.lesson.stepLabel(activeStep)} · ${content?.title ?? ''}`
              : t.lesson.tutorPanelSubtitle
          }
          emptyBody={t.tutor.emptyBodyLesson}
        />
      </div>

      {lessonId ? (
        <NotebookSheet
          open={notebookOpen}
          onClose={() => setNotebookOpen(false)}
          context={{
            kind: 'lesson',
            id: lessonId,
            label: content?.title ?? entry?.lesson.title,
          }}
          onAttach={({ message }) => {
            setNotebookWork(message);
            setNotebookOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

function Section({
  title,
  icon,
  children,
  className,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      <h2 className="mb-4 flex items-center gap-2.5 text-[13px] font-semibold uppercase tracking-wider text-ink-faint">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-soft text-accent ring-1 ring-inset ring-accent/20">
          {icon}
        </span>
        {title}
        <SectionRule className="ml-1 min-w-0 flex-1" />
      </h2>
      {children}
    </section>
  );
}

function StepCard({
  step,
  active,
  isLast,
  onSelect,
}: {
  step: TeachingStep;
  active: boolean;
  isLast: boolean;
  onSelect: () => void;
}) {
  const type = String(step.type || '').toLowerCase();
  const label = t.lesson.stepTypes[type] ?? type;
  const hint = t.lesson.stepHints[type];

  return (
    <li className="relative pl-11">
      <span
        className={cn(
          'absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full text-[12.5px] font-semibold tabular-nums',
          active ? 'bg-accent text-white dark:text-ink-inverse' : STEP_TONES[type] ?? 'bg-surface-alt text-ink-muted',
        )}
        aria-hidden="true"
      >
        {step.step}
      </span>
      {!isLast ? (
        <span className="absolute left-4 top-9 h-[calc(100%-1.25rem)] w-px bg-line" aria-hidden="true" />
      ) : null}

      <button
        type="button"
        onClick={onSelect}
        aria-pressed={active}
        className={cn(
          'w-full rounded-xl border px-4 py-3.5 text-left transition-all duration-200 ease-smooth',
          active
            ? 'border-accent/50 bg-accent-soft/60 shadow-soft'
            : 'border-line bg-surface hover:border-line-strong hover:bg-surface-alt/60',
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-2xs font-semibold uppercase tracking-wider text-ink-faint">
            {label}
          </span>
          {active ? (
            <span className="text-2xs font-medium text-accent">{t.lesson.stepActive}</span>
          ) : null}
        </div>
        <p className="mt-1.5 text-[14px] leading-relaxed text-ink-soft">{step.prompt}</p>
        {hint ? <p className="mt-2 text-2xs leading-snug text-ink-faint">{hint}</p> : null}
      </button>
    </li>
  );
}

function LessonNavButton({ to, dir }: { to: string | null; dir: 'prev' | 'next' }) {
  const label = dir === 'prev' ? t.lesson.prevLesson : t.lesson.nextLesson;
  const Icon = dir === 'prev' ? ChevronLeft : ChevronRight;
  if (!to) {
    return (
      <span
        aria-hidden="true"
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint opacity-40"
      >
        <Icon size={16} />
      </span>
    );
  }
  return (
    <Link
      to={to}
      aria-label={label}
      title={label}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface-alt hover:text-ink"
    >
      <Icon size={16} />
    </Link>
  );
}

function LessonSkeleton() {
  return (
    <div className="mt-6">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-3 h-9 w-3/4" />
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <div className="mt-10 space-y-3">
        <Skeleton className="h-3.5 w-40" />
        <SkeletonText lines={4} />
      </div>
      <div className="mt-10 space-y-3">
        <Skeleton className="h-3.5 w-52" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
