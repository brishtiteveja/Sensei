/**
 * The rest of SenseiClaw: seeing work, coaching on it, remembering the student,
 * and recording what they did.
 *
 * `sensei.ts` next door covers conversation (`/tutor/stream`, `/tutor/query`).
 * These are the routes the web client has always used and the phone never has,
 * kept in one place so the two clients speak identical shapes — if a contract
 * moves, it moves in both.
 *
 * Images travel as `data:` URIs, the same as on the web, so a Skia snapshot or
 * a camera roll photo can be handed over without an upload step.
 */

import { SENSEI_BASE_URL } from './sensei';

/** A cold model swap is served on the same call, so vision routes wait it out. */
const LONG_TIMEOUT_MS = 900_000;
const DEFAULT_TIMEOUT_MS = 20_000;

export class SenseiWorkError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** True when the phone could not reach the server at all. */
    readonly network = false,
  ) {
    super(message);
    this.name = 'SenseiWorkError';
  }
}

async function call<T>(
  path: string,
  opts: { method?: string; body?: unknown; timeoutMs?: number; signal?: AbortSignal } = {},
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  // Caller cancellation and our own timeout both have to reach the same fetch.
  const onAbort = () => controller.abort();
  opts.signal?.addEventListener('abort', onAbort);

  try {
    const res = await fetch(`${SENSEI_BASE_URL}${path}`, {
      method: opts.method ?? 'GET',
      headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new SenseiWorkError(`${path} failed (${res.status})`, res.status);
    }
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof SenseiWorkError) throw err;
    const aborted = (err as Error)?.name === 'AbortError';
    throw new SenseiWorkError(
      aborted ? 'The tutor took too long to answer.' : 'Could not reach the tutor server.',
      0,
      !aborted,
    );
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener('abort', onAbort);
  }
}

// ---------------------------------------------------------------- vision ----

export interface SeeResult {
  /** Null when the server has no vision-capable model loaded. */
  note: string | null;
  reason?: string;
  model?: string;
}

/**
 * Read a piece of work and describe it. Stage one on its own, for when the
 * caller wants the reading rather than a teaching move.
 */
export function seeWork(
  image: string,
  problem: string | undefined,
  language: string,
  signal?: AbortSignal,
): Promise<SeeResult> {
  return call<SeeResult>('/tutor/see', {
    method: 'POST',
    body: { image, problem, language },
    timeoutMs: LONG_TIMEOUT_MS,
    signal,
  });
}

export interface CoachResult {
  reading: string | null;
  coach: {
    status: 'correct' | 'error' | 'incomplete' | 'blank';
    hint: string;
    question: string;
    focus: string | null;
  } | null;
  reason?: string;
  models?: { reading: string; coaching: string };
}

/**
 * Look at work in progress and come back with one Socratic nudge.
 *
 * Two stages server-side: a vision pass that reads the page, then a text pass
 * that decides what to ask. The split is what lets the reading run on a vision
 * model and the teaching on whichever model teaches best.
 */
export function coachWork(
  image: string,
  problem: string | undefined,
  language: string,
  models?: { reading?: string; coaching?: string },
  signal?: AbortSignal,
): Promise<CoachResult> {
  return call<CoachResult>('/tutor/coach', {
    method: 'POST',
    body: {
      image,
      problem,
      language,
      reading_model: models?.reading,
      coaching_model: models?.coaching,
    },
    timeoutMs: LONG_TIMEOUT_MS,
    signal,
  });
}

// --------------------------------------------------------------- learner ----

export interface LearnerState {
  profile: {
    id: string;
    name: string | null;
    language: string;
    exam: string | null;
    exam_date: string | null;
    strengths: string[];
    weaknesses: string[];
    recent_mistakes: string[];
  };
  mastery: Record<string, number>;
  unlocked: string[];
  next_concept: string | null;
  next_label: string | null;
}

export function saveLearner(
  id: string,
  fields: { name?: string; language?: string; exam?: string; exam_date?: string },
  signal?: AbortSignal,
): Promise<{ ok: boolean }> {
  return call(`/learner/${encodeURIComponent(id)}`, { method: 'POST', body: fields, signal });
}

export function getLearner(id: string, signal?: AbortSignal): Promise<LearnerState> {
  return call(`/learner/${encodeURIComponent(id)}`, { signal });
}

/**
 * Record one graded moment. On a wrong answer the server consults the concept
 * graph and may name the root cause — the upstream concept actually missing,
 * rather than the symptom the student just got wrong.
 */
export function recordObservation(
  id: string,
  body: { topic: string; correct: boolean; note?: string },
  signal?: AbortSignal,
): Promise<{
  ok: boolean;
  mastery: number | null;
  root_cause: string | null;
  next_concept: string | null;
}> {
  return call(`/learner/${encodeURIComponent(id)}/observation`, {
    method: 'POST',
    body,
    signal,
  });
}

// ------------------------------------------------------------- telemetry ----

/**
 * Fire-and-forget. Never throws and never awaited by callers: losing telemetry
 * must not interrupt a lesson.
 *
 * The web uses `keepalive` so a flush survives the tab closing. React Native's
 * fetch has no such flag, so the recorder flushes when the app backgrounds
 * instead — see `lib/observe.ts`.
 */
export function postObservations(
  session: string,
  events: unknown[],
  learner?: string,
): Promise<void> {
  return fetch(`${SENSEI_BASE_URL}/observe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session, events, learner }),
  }).then(
    () => undefined,
    () => undefined,
  );
}

export function postAttemptSummary(
  session: string,
  summary: unknown,
  learner?: string,
): Promise<void> {
  return fetch(`${SENSEI_BASE_URL}/observe/attempt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session, summary, learner }),
  }).then(
    () => undefined,
    () => undefined,
  );
}

// --------------------------------------------------------------- teacher ----

export interface GradeReport {
  summary: string;
  score: number;
  grade: string;
  questions?: {
    label: string;
    verdict: 'correct' | 'partial' | 'wrong';
    error: string | null;
    feedback: string;
  }[];
  strengths?: string[];
  next_steps?: string[];
}

/** Grade submitted work. Files are data URIs — photos and/or PDFs. */
export function gradeWork(
  files: { data: string; mime: string; name: string }[],
  rubric: string | undefined,
  language: string,
  signal?: AbortSignal,
): Promise<{ report: GradeReport; model: string }> {
  return call('/grade', {
    method: 'POST',
    body: { files, rubric, language },
    timeoutMs: LONG_TIMEOUT_MS,
    signal,
  });
}

export interface DraftedQuestion {
  id: string;
  subject: string;
  title: string;
  level: string;
  problem: string;
  answer: string;
  solution_steps?: string[];
  common_mistake?: string;
}

/** Turn a rough problem — typed or photographed — into a finished question. */
export function draftQuestion(
  input: { text?: string; image?: string; subject_hint?: string },
  language: string,
  signal?: AbortSignal,
): Promise<{ question: DraftedQuestion }> {
  return call('/samples/draft', {
    method: 'POST',
    body: { ...input, language },
    timeoutMs: LONG_TIMEOUT_MS,
    signal,
  });
}

export function getCustomQuestions(signal?: AbortSignal): Promise<{ questions: DraftedQuestion[] }> {
  return call('/samples/custom', { signal, timeoutMs: 15_000 });
}
