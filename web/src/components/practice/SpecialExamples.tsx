import { useEffect, useMemo, useState } from 'react';
import { Eye, EyeOff, MessageCircle, NotebookPen } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { RichText } from '@/components/ui/RichText';
import { ErrorState, Skeleton } from '@/components/ui/States';
import { TutorChat } from '@/components/tutor/TutorChat';
import { NotebookSheet } from '@/components/notebook/NotebookSheet';
import { SubjectArt } from '@/components/art/SubjectArt';
import { loadSamples, SAMPLE_SUBJECTS, sampleUrl, type SampleProblem } from '@/lib/samples';
import { t } from '@/i18n/strings';
import { difficultyTone } from '@/lib/utils';

/** Map a curriculum subject id onto the sample kit's subjects. */
function toSampleSubject(subjectId: string | undefined): string | null {
  const s = (subjectId ?? '').toLowerCase();
  if (s.includes('physic')) return 'physics';
  if (s.includes('chem')) return 'chemistry';
  if (s.includes('math')) return 'math';
  return null;
}

/** Localised heading for a sample-kit subject. */
function subjectLabel(subject: string): string {
  if (subject === 'physics') return t.subjects.physics;
  if (subject === 'chemistry') return t.subjects.chemistry;
  if (subject === 'math') return t.subjects.math;
  return subject;
}

/**
 * Practice's "special examples" mode: the curated worked problems, grouped by
 * subject, each solvable step by step in the notebook with the tutor watching
 * for the mistake — the whole point of the sample kit.
 */
export function SpecialExamples({ subjectId }: { subjectId: string | undefined }) {
  const [state, setState] = useState<
    { status: 'loading' } | { status: 'error'; error: Error } | { status: 'ready'; problems: SampleProblem[] }
  >({ status: 'loading' });

  const [notebookFor, setNotebookFor] = useState<SampleProblem | null>(null);
  const [askFor, setAskFor] = useState<SampleProblem | null>(null);

  useEffect(() => {
    let alive = true;
    setState({ status: 'loading' });
    loadSamples()
      .then((m) => alive && setState({ status: 'ready', problems: m.problems }))
      .catch(
        (error) =>
          alive &&
          setState({ status: 'error', error: error instanceof Error ? error : new Error(String(error)) }),
      );
    return () => {
      alive = false;
    };
  }, []);

  const wanted = toSampleSubject(subjectId);

  /**
   * Grouped by subject, in a fixed order rather than alphabetically: a student
   * scanning for their subject should find it in the same place every time, and
   * within a subject the basics come before the advanced topics.
   */
  const groups = useMemo(() => {
    if (state.status !== 'ready') return [];
    const shown = wanted ? state.problems.filter((p) => p.subject === wanted) : state.problems;
    return SAMPLE_SUBJECTS.map((subject) => ({
      subject,
      problems: shown
        .filter((p) => p.subject === subject)
        .sort((a, b) => (a.band === b.band ? 0 : a.band === 'basic' ? -1 : 1)),
    })).filter((g) => g.problems.length);
  }, [state, wanted]);

  if (state.status === 'loading') {
    return (
      <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-72 rounded-2xl" />
        ))}
      </div>
    );
  }
  if (state.status === 'error') {
    return (
      <ErrorState
        className="mx-auto max-w-xl"
        error={state.error}
        onRetry={() => setState({ status: 'loading' })}
      />
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <p className="mb-6 text-[13.5px] text-ink-muted">{t.practice.specialIntro}</p>
      <div className="space-y-9">
        {groups.map(({ subject, problems }) => (
          <section key={subject} aria-label={subjectLabel(subject)}>
            <div className="mb-3.5 flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg">
                <SubjectArt subject={subject} className="h-full w-full" wash={false} animate={false} />
              </span>
              <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
                {subjectLabel(subject)}
              </h2>
              <span className="text-2xs tabular-nums text-ink-faint">
                {t.practice.problemCount(problems.length)}
              </span>
              <span
                aria-hidden="true"
                className="h-px flex-1"
                style={{
                  backgroundImage:
                    'linear-gradient(90deg, rgb(var(--s-line-strong)), transparent)',
                }}
              />
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              {problems.map((p) => (
                <ProblemCard
                  key={p.id}
                  problem={p}
                  onSolve={() => setNotebookFor(p)}
                  onAsk={() => setAskFor(p)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {notebookFor ? (
        <NotebookSheet
          open
          onClose={() => setNotebookFor(null)}
          context={{ kind: 'practice', id: `sample:${notebookFor.id}`, label: notebookFor.title }}
          header={
            <div className="rounded-xl border border-line bg-surface-alt/70 p-3">
              <p className="mb-2 text-2xs font-semibold uppercase tracking-wide text-ink-faint">
                {notebookFor.title}
              </p>
              {notebookFor.images.ques ? (
                <img
                  src={sampleUrl(notebookFor.images.ques)}
                  alt={notebookFor.title}
                  className="mx-auto max-h-44 w-auto rounded-lg bg-white"
                />
              ) : (
                <RichText className="text-[13px] text-ink-soft">{notebookFor.problem}</RichText>
              )}
            </div>
          }
        />
      ) : null}

      <Modal
        open={askFor !== null}
        onClose={() => setAskFor(null)}
        title={askFor?.title ?? t.practice.askWhy}
        description={t.tutor.subtitle}
        width="max-w-3xl"
      >
        <div className="-mx-6 -mb-5 h-[540px] border-t border-line">
          {askFor ? (
            <TutorChat
              contextType="exam_review"
              contextData={{ subject: askFor.subject, question_id: askFor.id }}
              seed={{
                key: askFor.id,
                message:
                  `I'm working on this problem:\n\n${askFor.problem}\n\n` +
                  `Guide me through it step by step with questions — don't just give me the answer.`,
              }}
              title={t.tutor.title}
              subtitle={askFor.title}
              placeholder={t.tutor.placeholderFree}
              variant="docked"
            />
          ) : null}
        </div>
      </Modal>
    </div>
  );
}

function ProblemCard({
  problem,
  onSolve,
  onAsk,
}: {
  problem: SampleProblem;
  onSolve: () => void;
  onAsk: () => void;
}) {
  const [showMistake, setShowMistake] = useState(false);
  const badImage = problem.images.bad[0];

  return (
    <Card className="flex flex-col gap-4 p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">{problem.title}</h3>
        <div className="flex shrink-0 items-center gap-1.5">
          {problem.band === 'advanced' ? (
            <Badge tone="accent">{t.practice.advanced}</Badge>
          ) : (
            <Badge tone={difficultyTone(problem.level)}>{problem.level}</Badge>
          )}
        </div>
      </div>

      {problem.images.ques ? (
        <div className="overflow-hidden rounded-xl border border-line bg-white">
          <img
            src={sampleUrl(problem.images.ques)}
            alt={problem.title}
            className="mx-auto max-h-52 w-auto"
            loading="lazy"
          />
        </div>
      ) : (
        <RichText className="text-[13.5px] text-ink-soft">{problem.problem}</RichText>
      )}

      {showMistake && badImage ? (
        <div className="space-y-1.5">
          <p className="text-2xs font-medium uppercase tracking-wide text-warning-text">
            {t.practice.spotMistake}
          </p>
          <div className="overflow-hidden rounded-xl border border-warning/40 bg-white">
            <img
              src={sampleUrl(badImage)}
              alt="A student attempt with a mistake"
              className="mx-auto max-h-56 w-auto"
              loading="lazy"
            />
          </div>
        </div>
      ) : null}

      <div className="mt-auto flex flex-wrap items-center gap-2">
        <Button onClick={onSolve} className="flex-1">
          <NotebookPen size={15} />
          {t.practice.solveStepByStep}
        </Button>
        <Button variant="secondary" onClick={onAsk}>
          <MessageCircle size={15} />
          {t.practice.askWhyShort}
        </Button>
        {badImage ? (
          <Button variant="ghost" onClick={() => setShowMistake((v) => !v)} className="px-2.5">
            {showMistake ? <EyeOff size={15} /> : <Eye size={15} />}
            <span className="sr-only">{t.practice.spotMistake}</span>
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
