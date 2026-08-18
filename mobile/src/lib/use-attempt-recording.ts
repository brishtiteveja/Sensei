import { useEffect, useRef } from 'react';

import {
  appendToAttempt,
  closeAttempt,
  createAttempt,
  resumableFor,
  type Attempt,
} from './attempts';
import { observe, recordedEvents, setObserveContext } from './observe';

/**
 * Scope the recorder to the problem on screen.
 *
 * Without this the recorder is one long tape of the day, and a replay is a
 * shapeless "everything you did". An attempt opens when a problem opens and
 * collects the work done while it is there.
 *
 * Resumable on purpose: coming back to a problem continues the last unclosed
 * attempt rather than starting a stub, the same way returning to a chat
 * continues the thread. Ending it is an explicit act — answering the question,
 * or calling `finish()`.
 */
export function useAttemptRecording(problem: {
  /** Stable key: practice:<id>, lesson:<id>, free:<id>. */
  key: string;
  title: string;
  text?: string;
  subject?: string;
  /** Skip while the problem is still loading. */
  enabled?: boolean;
}): { finish: (outcome?: 'correct' | 'wrong') => void } {
  const attemptRef = useRef<Attempt | null>(null);
  // Everything the recorder had seen when this attempt opened; work is the
  // difference between then and now, so a previous problem's strokes cannot
  // leak into this attempt.
  const markRef = useRef(0);
  const finishedRef = useRef(false);

  const { key, title, text, subject, enabled = true } = problem;

  useEffect(() => {
    if (!enabled || !key) return;

    const existing = resumableFor(key);
    const attempt = existing ?? createAttempt({ problemKey: key, problemTitle: title, problemText: text, subject });
    attemptRef.current = attempt;
    markRef.current = recordedEvents().length;
    finishedRef.current = false;

    // Every event from here carries the problem, so a row in the dataset says
    // what it belonged to instead of being an anonymous stroke.
    setObserveContext({ problem: key, attempt: attempt.id, subject });
    observe('problem.open', { key, title, resumed: Boolean(existing) });

    return () => {
      const events = recordedEvents().slice(markRef.current);
      appendToAttempt(attempt.id, events);
      setObserveContext(null);
    };
  }, [enabled, key, title, text, subject]);

  return {
    finish: (outcome) => {
      const attempt = attemptRef.current;
      if (!attempt || finishedRef.current) return;
      finishedRef.current = true;
      // Flush before closing: the events since the mark are this attempt's
      // whole story, and closing without them would leave an empty recording.
      appendToAttempt(attempt.id, recordedEvents().slice(markRef.current));
      closeAttempt(attempt.id, outcome);
    },
  };
}
