import { postObservations } from '@/lib/api';
import { readRaw, writeRaw } from '@/lib/storage';

/**
 * The session flight recorder.
 *
 * The tutor can only be Socratic about work it can see. Rather than screen-record
 * (a browser permission prompt, lossy pixels, and a vision model we cannot afford
 * to run on every turn), the app reports what the student *did* — each stroke,
 * block edit, answer and turn — as semantic events. That is lossless, tiny, and
 * something a text model can reason over directly.
 *
 * Two consumers:
 *  - `digest()` feeds the last couple of minutes into the tutor's system prompt,
 *    so its questions react to the actual workspace.
 *  - the server appends every batch to a per-session JSONL, which is the dataset
 *    of how students of different abilities actually go wrong.
 *
 * Failures are swallowed by design: losing telemetry must never interrupt a lesson.
 */

export interface ObsEvent {
  t: number;
  type: string;
  data?: Record<string, unknown>;
}

const FLUSH_MS = 5_000;
const FLUSH_AT = 25;
/** How much history the tutor digest looks back over. */
const DIGEST_WINDOW_MS = 150_000;
const DIGEST_MAX = 40;
/** Rolling tail kept in memory for the digest. */
const TAIL_MAX = 200;

let queue: ObsEvent[] = [];
let tail: ObsEvent[] = [];
let timer: number | null = null;
let enabled = readRaw('obs.on') !== '0';

/** Stable per-browser-tab session id, so a reload continues the same session file. */
function sessionId(): string {
  let id = readRaw('obs.session');
  if (!id) {
    id = `s_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
    writeRaw('obs.session', id);
  }
  return id;
}

export function setObserveEnabled(on: boolean): void {
  enabled = on;
  // Stopping keeps the tail: the point of stopping is usually to look at what
  // was just recorded. Use clearRecording() to actually discard it.
  if (!on) queue = [];
  writeRaw('obs.on', on ? '1' : '0');
  for (const fn of listeners) fn(on);
}

export function isObserveEnabled(): boolean {
  return enabled;
}

/** Everything still in the rolling tail — the source for replay. */
export function recordedEvents(): ObsEvent[] {
  return [...tail];
}

export function clearRecording(): void {
  tail = [];
}

/** Notify the UI when recording is toggled, so an indicator can track it. */
type Listener = (on: boolean) => void;
const listeners = new Set<Listener>();

export function onObserveChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function flush(): void {
  if (timer !== null) {
    window.clearTimeout(timer);
    timer = null;
  }
  if (!queue.length) return;
  const batch = queue;
  queue = [];
  void postObservations(sessionId(), batch);
}

/** Record one workspace event. */
export function observe(type: string, data?: Record<string, unknown>): void {
  if (!enabled) return;
  const ev: ObsEvent = { t: Date.now(), type, ...(data ? { data } : {}) };

  queue.push(ev);
  tail.push(ev);
  if (tail.length > TAIL_MAX) tail = tail.slice(-TAIL_MAX);

  if (queue.length >= FLUSH_AT) {
    flush();
  } else if (timer === null) {
    timer = window.setTimeout(flush, FLUSH_MS);
  }
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
    case 'practice.special':
      return d.on ? 'switched to the curated example problems' : 'switched back to random questions';
    case 'notebook.open':
      return `opened their notebook${d.label ? ` for "${trim(d.label, 60)}"` : ''}`;
    case 'notebook.block':
      if (d.op === 'add') return `added a ${d.blockType} block to the notebook`;
      if (d.op === 'remove') return `deleted a ${d.blockType} block`;
      if (d.op === 'move') return 'reordered their notebook blocks';
      return `wrote in the notebook: ${trim(d.text, 160)}`;
    case 'sketch.shape':
      return `drew ${article(d.tool)} on the scratchpad`;
    case 'sketch.undo':
      return 'undid the last thing they drew';
    case 'sketch.clear':
      return 'cleared the whole drawing';
    case 'sketch.insert':
      return 'put their sketch into the conversation';
    case 'image.insert':
      return 'uploaded a photo of their work';
    case 'tutor.user':
      return `asked: ${trim(d.text, 140)}`;
    default:
      return null;
  }
}

function article(tool: unknown): string {
  const t = String(tool ?? 'something');
  if (t === 'eraser') return 'with the eraser';
  if (t === 'pen') return 'freehand';
  return `a ${t}`;
}

function trim(v: unknown, n: number): string {
  const s = String(v ?? '').replace(/\s+/g, ' ').trim();
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

/**
 * A compact account of recent activity for the tutor's system prompt.
 *
 * Consecutive identical lines are collapsed with a count, because twenty
 * "drew freehand" lines say the same thing as "drew freehand (x20)" and would
 * otherwise crowd out everything else.
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

// Best-effort final flush so the tail of a session is not lost on close.
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
}
