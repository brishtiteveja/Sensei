import { readJSON, writeJSON } from '@/lib/storage';
import type { ObsEvent } from '@/lib/observe';

/**
 * An attempt: one sitting at one problem.
 *
 * Recording used to be a single global stream, which made replay a shapeless
 * "everything you did today". Work is really a sequence of attempts at specific
 * problems, so the recording is scoped the same way — that gives a history a
 * student or teacher can read ("your three goes at the friction question") and
 * gives the tutor the problem text alongside the events.
 *
 * An attempt opens when the solve sheet opens and closes when it does, but it
 * is *resumable*: coming back to a problem continues the same attempt rather
 * than fragmenting the story across a dozen stubs, exactly as a chat session
 * continues. Starting a genuinely fresh go is an explicit act.
 */
export interface Attempt {
  id: string;
  /** Notebook-style context key: practice:sample:<id>, lesson:<id>, free:<id>. */
  problemKey: string;
  problemTitle: string;
  problemText?: string;
  subject?: string;
  startedAt: number;
  /** Last time work was appended. */
  updatedAt: number;
  /** Set once the attempt is deliberately finished; undefined means resumable. */
  closedAt?: number;
  events: ObsEvent[];
  outcome?: 'correct' | 'wrong';
}

const KEY = 'attempts.v1';
/** Recordings are for review, not archive; keep the history bounded. */
const MAX_ATTEMPTS = 60;
/** Events per attempt — a long sitting should not grow without limit. */
const MAX_EVENTS = 400;

function all(): Attempt[] {
  return readJSON<Attempt[]>(KEY, []);
}

function persist(list: Attempt[]): void {
  writeJSON(
    KEY,
    list.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_ATTEMPTS),
  );
}

export function listAttempts(): Attempt[] {
  return all().sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Every attempt at one problem, oldest first — the order they were made in. */
export function attemptsFor(problemKey: string): Attempt[] {
  return all()
    .filter((a) => a.problemKey === problemKey)
    .sort((a, b) => a.startedAt - b.startedAt);
}

export function getAttempt(id: string): Attempt | null {
  return all().find((a) => a.id === id) ?? null;
}

/** The attempt a student would expect to walk back into: the last unclosed one. */
export function resumableFor(problemKey: string): Attempt | null {
  const open = attemptsFor(problemKey).filter((a) => !a.closedAt);
  return open.length ? open[open.length - 1] : null;
}

export function createAttempt(seed: {
  problemKey: string;
  problemTitle: string;
  problemText?: string;
  subject?: string;
}): Attempt {
  const now = Date.now();
  const a: Attempt = {
    id: `at_${now.toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`,
    ...seed,
    startedAt: now,
    updatedAt: now,
    events: [],
  };
  persist([...all(), a]);
  return a;
}

/**
 * Add work to an attempt. Events already present are skipped, so appending the
 * same slice twice (a re-render, a double close) cannot duplicate the timeline.
 */
export function appendToAttempt(id: string, events: ObsEvent[]): void {
  if (!events.length) return;
  const list = all();
  const a = list.find((x) => x.id === id);
  if (!a) return;

  const seen = new Set(a.events.map((e) => `${e.t}:${e.type}`));
  const fresh = events.filter((e) => !seen.has(`${e.t}:${e.type}`));
  if (!fresh.length) return;

  a.events = [...a.events, ...fresh].slice(-MAX_EVENTS);
  a.updatedAt = Date.now();
  persist(list);
}

/** Finish an attempt so the next visit starts a new one. */
export function closeAttempt(id: string, outcome?: 'correct' | 'wrong'): void {
  const list = all();
  const a = list.find((x) => x.id === id);
  if (!a) return;
  a.closedAt = Date.now();
  a.updatedAt = a.closedAt;
  if (outcome) a.outcome = outcome;
  persist(list);
}

export function deleteAttempt(id: string): void {
  persist(all().filter((a) => a.id !== id));
}

/** Attempts that captured nothing are noise in the history. */
export function pruneEmpty(): void {
  persist(all().filter((a) => a.events.length > 0));
}

/**
 * A one-row account of an attempt, for the dataset.
 *
 * The event log says exactly what happened; this says what it *meant*. The
 * signals here are the ones learning research actually asks for and that a raw
 * stroke list buries: how long before the student committed to anything
 * (hesitation), how much they took back (uncertainty), whether they asked for
 * help before or after going wrong, and how it ended. Computed client-side
 * because the events are already here, and it keeps the server a plain sink.
 */
export interface AttemptSummary {
  attempt: string;
  problemKey: string;
  problemTitle: string;
  subject?: string;
  attemptNo: number;
  startedAt: number;
  durationMs: number;
  events: number;
  /** ms from opening the problem to the first mark made. */
  timeToFirstActionMs: number | null;
  strokes: number;
  undos: number;
  clears: number;
  erases: number;
  notesWritten: number;
  /** Times the student asked the watching tutor to look. */
  coachAsks: number;
  /** What the tutor said about the work, in order. */
  coachVerdicts: string[];
  tutorTurns: number;
  outcome?: 'correct' | 'wrong';
}

export function summarize(a: Attempt, attemptNo: number): AttemptSummary {
  const count = (type: string) => a.events.filter((e) => e.type === type).length;
  const first = a.events.find((e) =>
    ['sketch.shape', 'notebook.block', 'practice.pick', 'tutor.user'].includes(e.type),
  );
  const last = a.events[a.events.length - 1];

  return {
    attempt: a.id,
    problemKey: a.problemKey,
    problemTitle: a.problemTitle,
    subject: a.subject,
    attemptNo,
    startedAt: a.startedAt,
    durationMs: (last?.t ?? a.updatedAt) - a.startedAt,
    events: a.events.length,
    timeToFirstActionMs: first ? first.t - a.startedAt : null,
    strokes: count('sketch.shape'),
    undos: count('sketch.undo'),
    clears: count('sketch.clear'),
    erases: a.events.filter(
      (e) => e.type === 'sketch.shape' && (e.data as { tool?: string } | undefined)?.tool === 'eraser',
    ).length,
    notesWritten: a.events.filter(
      (e) => e.type === 'notebook.block' && (e.data as { op?: string } | undefined)?.op === 'edit',
    ).length,
    coachAsks: count('coach.ask'),
    coachVerdicts: a.events
      .filter((e) => e.type === 'coach.reply')
      .map((e) => String((e.data as { status?: string } | undefined)?.status ?? '')),
    tutorTurns: count('tutor.user'),
    outcome: a.outcome,
  };
}
