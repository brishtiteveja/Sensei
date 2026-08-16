import { readJSON, writeJSON } from '@/lib/storage';
import type { ObsEvent } from '@/lib/observe';

/**
 * An attempt: one sitting at one problem.
 *
 * Recording used to be a single global stream, which made replay a shapeless
 * "everything you did today". Work is really a sequence of attempts at specific
 * problems, so the recording is scoped the same way. That gives a history a
 * student or teacher can actually read — "your three goes at the friction
 * question" — and gives the tutor the problem text alongside the events.
 */
export interface Attempt {
  id: string;
  /** Notebook-style context key: practice:sample:<id>, lesson:<id>, free:<id>. */
  problemKey: string;
  problemTitle: string;
  problemText?: string;
  subject?: string;
  startedAt: number;
  endedAt: number;
  events: ObsEvent[];
  /** Set when the attempt ends in a graded answer. */
  outcome?: 'correct' | 'wrong';
}

const KEY = 'attempts.v1';
/** Recordings are for review, not archive; keep the history bounded. */
const MAX_ATTEMPTS = 40;

export function listAttempts(): Attempt[] {
  return readJSON<Attempt[]>(KEY, []).sort((a, b) => b.startedAt - a.startedAt);
}

export function attemptsFor(problemKey: string): Attempt[] {
  return listAttempts().filter((a) => a.problemKey === problemKey);
}

export function getAttempt(id: string): Attempt | null {
  return listAttempts().find((a) => a.id === id) ?? null;
}

/**
 * Persist an attempt. Events are stored as-is: they are already compact, and
 * the stroke geometry in them is what replay redraws from.
 */
export function saveAttempt(a: Attempt): void {
  if (!a.events.length) return;
  const all = readJSON<Attempt[]>(KEY, []).filter((x) => x.id !== a.id);
  all.push(a);
  writeJSON(
    KEY,
    all.sort((x, y) => y.startedAt - x.startedAt).slice(0, MAX_ATTEMPTS),
  );
}

export function deleteAttempt(id: string): void {
  writeJSON(
    KEY,
    readJSON<Attempt[]>(KEY, []).filter((a) => a.id !== id),
  );
}

export function newAttemptId(): string {
  return `at_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
}
