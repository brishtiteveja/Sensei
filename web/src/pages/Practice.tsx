import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  RotateCcw,
  Sparkles,
  Target,
  Trophy,
  X as XIcon,
} from 'lucide-react';
import { NotebookPen } from 'lucide-react';
import { Page } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/Progress';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States';
import { Modal } from '@/components/ui/Modal';
import { CorrectBurst, ScoreBurst } from '@/components/art/Burst';
import { TutorChat } from '@/components/tutor/TutorChat';
import { NotebookSheet } from '@/components/notebook/NotebookSheet';
import { SpecialExamples } from '@/components/practice/SpecialExamples';
import { observe } from '@/lib/observe';
import { useAsync } from '@/hooks/useAsync';
import { useSubjects } from '@/hooks/useCurriculum';
import { getPracticeQuestions } from '@/lib/api';
import type { PracticeQuestion } from '@/lib/types';
import { useSettings } from '@/state/settings';
import { useProgress } from '@/state/progress';
import { t } from '@/i18n/strings';
import { cn, pct } from '@/lib/utils';

const SET_SIZE = 10;

export function PracticePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { language } = useSettings();
  const progress = useProgress();
  const subjects = useSubjects();

  const subject = searchParams.get('subject') ?? '';

  const questionsQuery = useAsync<PracticeQuestion[]>(
    (signal) =>
      getPracticeQuestions({ subject: subject || undefined, limit: SET_SIZE, lang: language }, signal),
    [subject, language],
  );

  const questions = useMemo(
    () => (questionsQuery.data ?? []).filter((q) => q.options?.length > 0),
    [questionsQuery.data],
  );

  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [answers, setAnswers] = useState<Record<string, { picked: string; correct: boolean }>>({});
  const [finished, setFinished] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const [notebookOpen, setNotebookOpen] = useState(false);
  const [special, setSpecial] = useState(false);

  const resetSet = useCallback(() => {
    setIndex(0);
    setPicked(null);
    setRevealed(false);
    setAnswers({});
    setFinished(false);
  }, []);

  // A new subject filter or a reload means a new set.
  useEffect(() => {
    resetSet();
  }, [subject, language, questionsQuery.data, resetSet]);

  const question = questions[index];
  const correctOption = question?.options.find((o) => o.isCorrect);
  const total = questions.length;

  // Report which question the student is actually looking at, so the tutor's
  // digest can name it rather than guess.
  useEffect(() => {
    if (!question) return;
    observe('practice.question', {
      qid: question.id,
      index: index + 1,
      subject: subject || 'all',
      text: question.question,
    });
  }, [question, index, subject]);

  const { recordPractice } = progress;
  const check = () => {
    if (!question || !picked || revealed) return;
    const isCorrect = question.options.find((o) => o.id === picked)?.isCorrect ?? false;
    setRevealed(true);
    setAnswers((a) => ({ ...a, [question.id]: { picked, correct: isCorrect } }));
    observe('practice.check', { qid: question.id, picked, correct: isCorrect });
    recordPractice({ questionId: question.id, subjectId: subject || 'all', correct: isCorrect });
  };

  const advance = () => {
    if (index + 1 >= total) {
      setFinished(true);
      return;
    }
    setIndex((i) => i + 1);
    setPicked(null);
    setRevealed(false);
  };

  // Keyboard: 1-9 select, Enter checks / advances.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (askOpen || finished || !question) return;
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

      if (/^[1-9]$/.test(e.key) && !revealed) {
        const opt = question.options[Number(e.key) - 1];
        if (opt) {
          setPicked(opt.id);
          observe('practice.pick', { qid: question.id, option: opt.id });
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (revealed) advance();
        else check();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const score = Object.values(answers).filter((a) => a.correct).length;
  const answered = Object.keys(answers).length;

  const askSeed = useMemo(() => {
    if (!question || !picked) return null;
    const pickedText = question.options.find((o) => o.id === picked)?.text ?? picked;
    const optionList = question.options.map((o) => `${o.id}) ${o.text}`).join('\n');
    return {
      key: `${question.id}:${picked}`,
      message:
        `I got this practice question wrong and I want to understand why.\n\n` +
        `Question: ${question.question}\n\nOptions:\n${optionList}\n\n` +
        `I chose ${picked}) ${pickedText}. Do not tell me the answer — ask me what made me pick it, ` +
        `then walk me to the mistake.`,
    };
  }, [question, picked]);

  return (
    <Page
      title={t.practice.title}
      subtitle={t.practice.subtitle}
      actions={
        <div className="flex items-center gap-2">
          <label
            className="flex cursor-pointer select-none items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-[13px] font-medium text-ink-soft transition-colors hover:border-accent/40"
            title={t.practice.specialHint}
          >
            <input
              type="checkbox"
              checked={special}
              onChange={(e) => {
                setSpecial(e.target.checked);
                observe('practice.special', { on: e.target.checked });
              }}
              className="h-4 w-4 accent-[rgb(var(--s-accent))]"
            />
            {t.practice.special}
          </label>
          <label className="sr-only" htmlFor="subject-filter">
            {t.practice.subject}
          </label>
          <select
            id="subject-filter"
            value={subject}
            onChange={(e) => {
              const v = e.target.value;
              setSearchParams(v ? { subject: v } : {}, { replace: true });
            }}
            className="h-10 rounded-xl border border-line bg-surface px-3 text-[13.5px] text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          >
            <option value="">{t.practice.allSubjects}</option>
            {(subjects.data ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
          {!special ? (
            <Button variant="secondary" onClick={questionsQuery.reload}>
              <RotateCcw size={15} />
              {t.practice.newSet}
            </Button>
          ) : null}
        </div>
      }
    >
      {special ? (
        <SpecialExamples subjectId={subject || undefined} />
      ) : questionsQuery.status === 'loading' ? (
        <PracticeSkeleton />
      ) : questionsQuery.status === 'error' ? (
        <ErrorState error={questionsQuery.error} onRetry={questionsQuery.reload} />
      ) : !total ? (
        <EmptyState
          title={t.empty.questions}
          body={t.empty.questionsBody}
          icon={<Target size={22} />}
          action={
            <Button variant="secondary" onClick={() => setSearchParams({}, { replace: true })}>
              {t.practice.allSubjects}
            </Button>
          }
        />
      ) : finished ? (
        <Card className="relative mx-auto max-w-2xl overflow-hidden p-10 text-center shadow-glow">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                pct(score, total) >= 60
                  ? 'radial-gradient(70% 60% at 50% 0%, rgb(var(--s-success) / 0.16), transparent 66%)'
                  : 'radial-gradient(70% 60% at 50% 0%, rgb(var(--s-warning) / 0.16), transparent 66%)',
            }}
          />
          {/* laurel of rays behind the trophy plate */}
          <ScoreBurst
            className="pointer-events-none absolute left-1/2 top-4 h-56 w-56 -translate-x-1/2"
            tone={pct(score, total) >= 60 ? 'success' : 'warning'}
          />
          <span
            className={cn(
              'relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ring-1 ring-inset',
              pct(score, total) >= 60
                ? 'bg-success-bg text-success-text ring-success/30'
                : 'bg-warning-bg text-warning-text ring-warning/30',
            )}
          >
            <Trophy size={28} />
          </span>
          <h2 className="relative mt-6 text-2xl font-semibold tracking-[-0.02em] text-ink">
            {t.practice.resultsTitle}
          </h2>
          <p className="relative mt-2 text-sm text-ink-muted">
            {t.practice.resultsScore(score, total)}
          </p>
          <div className="relative mx-auto mt-6 max-w-xs">
            <ProgressBar
              value={pct(score, total)}
              tone={pct(score, total) >= 60 ? 'success' : 'accent'}
              label="Score"
            />
          </div>
          <div className="relative mt-8 flex justify-center gap-3">
            <Button onClick={questionsQuery.reload}>
              <RotateCcw size={15} />
              {t.practice.resultsAgain}
            </Button>
            <Button variant="secondary" onClick={resetSet}>
              {t.practice.resultsReview}
            </Button>
          </div>
        </Card>
      ) : question ? (
        <div className="mx-auto max-w-3xl">
          {/* meta bar */}
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <span className="text-[13px] font-medium text-ink-muted">
              {t.practice.questionOf(index + 1, total)}
            </span>
            <div className="flex items-center gap-2">
              {question.year ? <Badge tone="neutral">{question.year}</Badge> : null}
              {question.university ? (
                <Badge tone="neutral">{question.university.replace(/-/g, ' ')}</Badge>
              ) : null}
              <span className="text-2xs tabular-nums text-ink-faint">
                {answered ? `${score}/${answered}` : ''}
              </span>
              <Button variant="ghost" onClick={() => setNotebookOpen(true)} className="h-8 px-2.5">
                <NotebookPen size={15} />
                <span className="hidden sm:inline">{t.notebook.open}</span>
              </Button>
            </div>
          </div>
          <ProgressBar value={pct(index, total)} className="mb-8" label="Set progress" />

          <Card className="relative overflow-hidden p-8 shadow-card">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage:
                  'radial-gradient(60% 55% at 100% 0%, rgb(var(--s-grad-2) / 0.12), transparent 62%), radial-gradient(50% 45% at 0% 100%, rgb(var(--s-grad-1) / 0.08), transparent 62%)',
              }}
            />
            <h2 className="relative text-[19px] font-semibold leading-relaxed tracking-[-0.015em] text-ink">
              {question.question}
            </h2>

            <ul className="relative mt-7 space-y-2.5">
              {question.options.map((o, i) => {
                const isPicked = picked === o.id;
                const showCorrect = revealed && o.isCorrect;
                const showWrong = revealed && isPicked && !o.isCorrect;
                return (
                  <li key={o.id}>
                    <button
                      type="button"
                      disabled={revealed}
                      onClick={() => {
                        setPicked(o.id);
                        observe('practice.pick', { qid: question.id, option: o.id });
                      }}
                      aria-pressed={isPicked}
                      className={cn(
                        'relative flex w-full items-center gap-3.5 rounded-xl border px-4 py-3.5 text-left transition-all duration-200 ease-smooth',
                        'disabled:cursor-default',
                        showCorrect
                          ? 'border-success bg-success-bg shadow-soft'
                          : showWrong
                            ? 'border-danger bg-danger-bg'
                            : isPicked
                              ? 'border-accent bg-accent-soft shadow-glow-sm'
                              : 's-glass border-line hover:-translate-y-px hover:border-grad-2/45 hover:bg-surface-alt/80 hover:shadow-glow-sm',
                      )}
                    >
                      <span
                        className={cn(
                          'relative flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[12.5px] font-semibold',
                          showCorrect
                            ? 'bg-success text-white'
                            : showWrong
                              ? 'bg-danger text-white'
                              : isPicked
                                ? 's-gradient-fill text-white'
                                : 'bg-surface-alt text-ink-muted ring-1 ring-inset ring-line',
                        )}
                      >
                        {/* Fires once, and only when the student actually
                            picked the right answer — never on the option they
                            missed. */}
                        {showCorrect && isPicked ? <CorrectBurst /> : null}
                        {showCorrect ? (
                          <Check size={14} />
                        ) : showWrong ? (
                          <XIcon size={14} />
                        ) : (
                          o.id || String(i + 1)
                        )}
                      </span>
                      <span
                        className={cn(
                          'text-[14.5px] leading-relaxed',
                          showCorrect
                            ? 'font-medium text-success-text'
                            : showWrong
                              ? 'text-danger-text'
                              : 'text-ink-soft',
                        )}
                      >
                        {o.text}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {/* feedback */}
            {revealed ? (
              <FeedbackPanel
                correct={answers[question.id]?.correct ?? false}
                correctLabel={correctOption ? `${correctOption.id}) ${correctOption.text}` : ''}
                onAsk={() => setAskOpen(true)}
              />
            ) : null}

            <div className="relative mt-8 flex items-center justify-between gap-4 border-t border-line pt-6">
              <span className="text-2xs text-ink-faint">
                Press 1–{Math.min(9, question.options.length)} to choose · Enter to{' '}
                {revealed ? 'continue' : 'check'}
              </span>
              {revealed ? (
                <Button onClick={advance}>
                  {index + 1 >= total ? t.practice.finish : t.practice.nextQuestion}
                  <ArrowRight size={15} />
                </Button>
              ) : (
                <Button onClick={check} disabled={!picked}>
                  {t.practice.check}
                </Button>
              )}
            </div>
          </Card>
        </div>
      ) : null}

      {/* Ask-Sensei-why drawer, preloaded with the question and the wrong pick */}
      <Modal
        open={askOpen}
        onClose={() => setAskOpen(false)}
        title={t.practice.askWhy}
        description={t.tutor.subtitle}
        width="max-w-3xl"
      >
        <div className="-mx-6 -mb-5 h-[540px] border-t border-line">
          <TutorChat
            contextType="exam_review"
            contextData={{ subject: subject || undefined, question_id: question?.id }}
            seed={askOpen ? askSeed : null}
            title={t.tutor.title}
            subtitle={t.practice.askWhy}
            placeholder={t.tutor.placeholderFree}
            variant="docked"
          />
        </div>
      </Modal>

      {question ? (
        <NotebookSheet
          open={notebookOpen}
          onClose={() => setNotebookOpen(false)}
          context={{
            kind: 'practice',
            id: question.id,
            label: question.question.slice(0, 80),
          }}
        />
      ) : null}
    </Page>
  );
}

function FeedbackPanel({
  correct,
  correctLabel,
  onAsk,
}: {
  correct: boolean;
  correctLabel: string;
  onAsk: () => void;
}) {
  return (
    <div
      role="status"
      className={cn(
        'relative mt-7 animate-fade-up rounded-xl border px-5 py-4',
        correct ? 'border-success/40 bg-success-bg' : 'border-danger/40 bg-danger-bg',
      )}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-xl"
        style={{
          backgroundImage: correct
            ? 'radial-gradient(50% 140% at 0% 50%, rgb(var(--s-success) / 0.18), transparent 70%)'
            : 'radial-gradient(50% 140% at 0% 50%, rgb(var(--s-danger) / 0.15), transparent 70%)',
        }}
      />
      <div className="relative flex items-start gap-3">
        <span
          className={cn(
            'relative flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white',
            correct ? 'bg-success' : 'bg-danger',
          )}
        >
          {correct ? <Check size={15} /> : <XIcon size={15} />}
        </span>
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              'text-[14px] font-semibold',
              correct ? 'text-success-text' : 'text-danger-text',
            )}
          >
            {correct ? t.practice.correct : t.practice.incorrect}
          </p>
          <p
            className={cn(
              'mt-1 text-[13px] leading-relaxed',
              correct ? 'text-success-text/85' : 'text-danger-text/85',
            )}
          >
            {correct ? t.practice.correctBody : t.practice.incorrectBody}
          </p>
          {!correct && correctLabel ? (
            <p className="mt-2 text-[13px] font-medium text-danger-text">
              {t.practice.correctAnswerWas(correctLabel)}
            </p>
          ) : null}
          <Button
            variant={correct ? 'ghost' : 'primary'}
            size="sm"
            className="mt-4"
            onClick={onAsk}
          >
            <Sparkles size={14} />
            {t.practice.askWhy}
          </Button>
        </div>
      </div>
    </div>
  );
}

function PracticeSkeleton() {
  return (
    <div className="mx-auto max-w-3xl">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-5 h-2 w-full rounded-full" />
      <div className="mt-8 rounded-2xl border border-line bg-card p-8">
        <Skeleton className="h-6 w-full" />
        <Skeleton className="mt-2 h-6 w-2/3" />
        <div className="mt-7 space-y-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
