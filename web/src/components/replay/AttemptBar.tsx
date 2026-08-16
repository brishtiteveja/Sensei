import { useCallback, useEffect, useRef, useState } from 'react';
import { History, Play, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ReplayModal } from '@/components/replay/ReplayModal';
import { recordedEvents, reportAttempt, setObserveContext } from '@/lib/observe';
import {
  appendToAttempt,
  getAttempt,
  summarize,
  attemptsFor,
  closeAttempt,
  createAttempt,
  pruneEmpty,
  resumableFor,
  type Attempt,
} from '@/lib/attempts';
import { t } from '@/i18n/strings';
import { cn } from '@/lib/utils';

/**
 * Records the sitting, and lets the student pick which sitting they are in.
 *
 * An attempt opens with the solve sheet and takes whatever the recorder
 * captures while it is open. Reopening the problem walks back into the same
 * attempt rather than starting a stub — the same way returning to a chat
 * continues the conversation — and "New attempt" is the explicit way to start
 * a clean go, which is what you want before a second, honest try.
 */
export function AttemptBar({
  problemKey,
  problemTitle,
  problemText,
  subject,
}: {
  problemKey: string;
  problemTitle: string;
  problemText?: string;
  subject?: string;
}) {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [replayId, setReplayId] = useState<string | null>(null);

  /** Events from this instant on belong to the attempt in progress. */
  const sinceRef = useRef<number>(Date.now());
  const currentRef = useRef<string | null>(null);
  currentRef.current = currentId;

  const flush = useCallback(() => {
    const id = currentRef.current;
    if (!id) return;
    appendToAttempt(
      id,
      recordedEvents().filter((e) => e.t >= sinceRef.current),
    );
    sinceRef.current = Date.now();
  }, []);

  const refresh = useCallback(() => setAttempts(attemptsFor(problemKey)), [problemKey]);

  // Open (or resume) an attempt for this problem while the sheet is mounted.
  useEffect(() => {
    pruneEmpty();
    const existing = resumableFor(problemKey);
    const a =
      existing ?? createAttempt({ problemKey, problemTitle, problemText, subject });
    sinceRef.current = Date.now();
    setCurrentId(a.id);
    const list = attemptsFor(problemKey);
    setAttempts(list);
    // Every event recorded from here carries which problem and which try it is.
    setObserveContext({
      attempt: a.id,
      problemKey,
      problemTitle,
      subject,
      attemptNo: Math.max(1, list.findIndex((x) => x.id === a.id) + 1),
    });

    // Unmount = the sheet closed. Keep the attempt open so returning resumes it;
    // only its work is banked.
    return () => {
      appendToAttempt(
        a.id,
        recordedEvents().filter((e) => e.t >= sinceRef.current),
      );
      const done = getAttempt(a.id);
      if (done?.events.length) {
        const no = Math.max(1, attemptsFor(problemKey).findIndex((x) => x.id === a.id) + 1);
        reportAttempt(summarize(done, no));
      }
      setObserveContext(null);
      pruneEmpty();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problemKey]);

  // Bank work periodically too, so a crash or a hard reload keeps the sitting.
  useEffect(() => {
    const id = window.setInterval(flush, 10_000);
    return () => window.clearInterval(id);
  }, [flush]);

  const startNew = () => {
    flush();
    if (currentRef.current) closeAttempt(currentRef.current);
    const a = createAttempt({ problemKey, problemTitle, problemText, subject });
    sinceRef.current = Date.now();
    setCurrentId(a.id);
    const list = attemptsFor(problemKey);
    setAttempts(list);
    setObserveContext({
      attempt: a.id,
      problemKey,
      problemTitle,
      subject,
      attemptNo: Math.max(1, list.findIndex((x) => x.id === a.id) + 1),
    });
  };

  const index = attempts.findIndex((a) => a.id === currentId);
  const withWork = attempts.filter((a) => a.events.length);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface-alt/60 px-3 py-2">
        <History size={14} className="shrink-0 text-ink-faint" />
        <span className="text-2xs font-medium text-ink-soft">
          {index >= 0 ? t.attempt.current(index + 1) : t.attempt.recording}
        </span>

        {withWork.length ? (
          <div className="flex flex-wrap items-center gap-1">
            {withWork.map((a, i) => (
              <button
                key={a.id}
                type="button"
                onClick={() => {
                  flush();
                  setReplayId(a.id);
                }}
                title={t.attempt.replayNth(i + 1)}
                className={cn(
                  'rounded-md px-1.5 py-0.5 text-2xs tabular-nums transition-colors',
                  a.id === currentId
                    ? 'bg-accent text-white'
                    : 'bg-surface text-ink-muted hover:text-ink',
                )}
              >
                {i + 1}
              </button>
            ))}
          </div>
        ) : null}

        <div className="ml-auto flex items-center gap-1.5">
          {currentId && attempts.find((a) => a.id === currentId)?.events.length ? (
            <Button
              variant="ghost"
              className="h-7 px-2 text-2xs"
              onClick={() => {
                flush();
                setReplayId(currentId);
              }}
            >
              <Play size={12} />
              {t.attempt.replay}
            </Button>
          ) : null}
          <Button variant="ghost" className="h-7 px-2 text-2xs" onClick={startNew}>
            <Plus size={12} />
            {t.attempt.startNew}
          </Button>
        </div>
      </div>

      <ReplayModal
        open={replayId !== null}
        onClose={() => {
          setReplayId(null);
          refresh();
        }}
        attemptId={replayId}
      />
    </>
  );
}
