import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, type AppStateStatus } from 'react-native';

import { postAttemptSummary, postObservations } from '@/api/sensei-work';
import { learnerId } from './learner';

/**
 * The session flight recorder.
 *
 * The tutor can only be Socratic about work it can actually see. Rather than
 * screen-record — a permission prompt, lossy pixels, and a vision model we
 * cannot afford to run every turn — the app reports what the student *did*:
 * each stroke, block edit, answer and question, as semantic events. Lossless,
 * tiny, and something a text model can reason over directly.
 *
 * Two consumers:
 *  - `digest()` folds the last couple of minutes into the tutor's prompt, so
 *    its questions react to the actual workspace.
 *  - the server appends every batch to a per-session JSONL — the dataset of how
 *    students of different abilities actually go wrong.
 *
 * Ported from the web recorder with one real difference: the browser can flush
 * on `pagehide` with `keepalive`, and React Native cannot. Here the trigger is
 * the app going to background, which is the moment a phone session ends.
 *
 * Failures are swallowed by design. Losing telemetry must never interrupt a
 * lesson, so nothing in this file throws and nothing needs awaiting.
 */

export interface ObsEvent {
  t: number;
  type: string;
  data?: Record<string, unknown>;
  /** Problem/attempt this happened inside, when there is one. */
  ctx?: Record<string, unknown>;
}

const ON_KEY = 'dikkha_obs_on';
const SESSION_KEY = 'dikkha_obs_session';

const FLUSH_MS = 5_000;
const FLUSH_AT = 25;
/** How far back the tutor digest looks. */
const DIGEST_WINDOW_MS = 150_000;
const DIGEST_MAX = 40;
/** Rolling tail kept in memory, the source for replay. */
const TAIL_MAX = 400;

let queue: ObsEvent[] = [];
let tail: ObsEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let enabled = true;
let session: string | null = null;
let context: Record<string, unknown> = {};

type Listener = (on: boolean) => void;
const listeners = new Set<Listener>();

function newSessionId(): string {
  return `s_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
}

/** Session id, synchronously; persisted so a reload continues the same file. */
function sessionId(): string {
  if (!session) {
    session = newSessionId();
    void AsyncStorage.setItem(SESSION_KEY, session).catch(() => undefined);
  }
  return session;
}

/**
 * Load the persisted flag and session id, and start listening for the app
 * going to background. Call once from the root layout.
 */
export async function hydrateObserve(): Promise<void> {
  try {
    const [[, on], [, sid]] = await AsyncStorage.multiGet([ON_KEY, SESSION_KEY]);
    enabled = on !== '0';
    if (sid) session = sid;
  } catch {
    /* defaults are fine */
  }

  const onAppState = (state: AppStateStatus) => {
    // Backgrounding is this platform's "page is closing": flush now, because
    // the OS may freeze or kill us before the next interval fires.
    if (state !== 'active') flush();
  };
  AppState.addEventListener('change', onAppState);

  for (const fn of listeners) fn(enabled);
}

export function setObserveEnabled(on: boolean): void {
  enabled = on;
  // Stopping keeps the tail: the reason to stop is usually to look at what was
  // just recorded. Use clearRecording() to actually discard it.
  if (!on) queue = [];
  void AsyncStorage.setItem(ON_KEY, on ? '1' : '0').catch(() => undefined);
  for (const fn of listeners) fn(on);
}

export function isObserveEnabled(): boolean {
  return enabled;
}

/** Notify the UI when recording is toggled, so an indicator can track it. */
export function onObserveChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/**
 * What the student is working on right now. Merged into every event, so a row
 * in the dataset says which problem and attempt it belongs to instead of being
 * an anonymous stroke in a stream.
 */
export function setObserveContext(ctx: Record<string, unknown> | null): void {
  context = ctx ?? {};
}

/** Everything still in the rolling tail — the source for replay. */
export function recordedEvents(): ObsEvent[] {
  return [...tail];
}

export function clearRecording(): void {
  tail = [];
}

function flush(): void {
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }
  if (!queue.length) return;
  const batch = queue;
  queue = [];
  void postObservations(sessionId(), batch, learnerId());
}

/** Record one workspace event. Synchronous and cheap: called from gestures. */
export function observe(type: string, data?: Record<string, unknown>): void {
  if (!enabled) return;
  const ev: ObsEvent = {
    t: Date.now(),
    type,
    ...(data ? { data } : {}),
    ...(Object.keys(context).length ? { ctx: { ...context } } : {}),
  };

  queue.push(ev);
  tail.push(ev);
  if (tail.length > TAIL_MAX) tail = tail.slice(-TAIL_MAX);

  if (queue.length >= FLUSH_AT) {
    flush();
  } else if (timer === null) {
    timer = setTimeout(flush, FLUSH_MS);
  }
}

/** Ship an attempt summary under the current session id. */
export function reportAttempt(summary: unknown): void {
  if (!enabled) return;
  void postAttemptSummary(sessionId(), summary, learnerId());
}

/** One short human-readable line per event, for the tutor's prompt. */
function describe(ev: ObsEvent): string | null {
  const d = (ev.data ?? {}) as Record<string, any>;
  switch (ev.type) {
    case 'route':
      return `moved to ${d.path}`;
    case 'practice.question':
      return `opened practice question ${d.index ?? ''} (${d.subject ?? 'any subject'}): ${trim(d.text, 90)}`;
    case 'practice.pick':
      return `selected option ${d.option}`;
    case 'practice.check':
      return d.correct ? `answered ${d.picked} — correct` : `answered ${d.picked} — WRONG`;
    case 'notebook.open':
      return `opened their notebook${d.label ? ` for "${trim(d.label, 60)}"` : ''}`;
    case 'notebook.block':
      if (d.op === 'add') return `added a ${d.blockType} block to the notebook`;
      if (d.op === 'remove') return `deleted a ${d.blockType} block`;
      if (d.op === 'move') return 'reordered their notebook blocks';
      return `wrote in the notebook: ${trim(d.text, 160)}`;
    case 'sketch.shape':
      return `drew ${article(d.tool)} on the canvas`;
    case 'sketch.undo':
      return 'undid the last thing they drew';
    case 'sketch.clear':
      return 'cleared the whole drawing';
    case 'sketch.insert':
      return 'put their sketch into the conversation';
    case 'image.insert':
      return 'sent a photo of their work';
    case 'coach.ask':
      return 'asked the tutor to look at their work';
    case 'tutor.user':
      return `asked: ${trim(d.text, 140)}`;
    default:
      return null;
  }
}

function article(tool: unknown): string {
  const name = String(tool ?? 'something');
  if (name === 'eraser') return 'with the eraser';
  if (name === 'pen') return 'freehand';
  return `a ${name}`;
}

function trim(v: unknown, n: number): string {
  const s = String(v ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

/**
 * A compact account of recent activity for the tutor's prompt.
 *
 * Consecutive identical lines collapse with a count, because twenty "drew
 * freehand" lines say the same thing as "drew freehand (x20)" and would
 * otherwise crowd out everything that matters.
 */
export function digest(): string | null {
  if (!enabled) return null;
  const since = Date.now() - DIGEST_WINDOW_MS;
  const lines: string[] = [];

  for (const ev of tail) {
    if (ev.t < since) continue;
    const line = describe(ev);
    if (line) lines.push(line);
  }
  if (!lines.length) return null;

  const collapsed: string[] = [];
  let run = 1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] === lines[i + 1]) {
      run += 1;
      continue;
    }
    collapsed.push(run > 1 ? `${lines[i]} (x${run})` : lines[i]);
    run = 1;
  }

  return collapsed
    .slice(-DIGEST_MAX)
    .map((l) => `- ${l}`)
    .join('\n');
}
