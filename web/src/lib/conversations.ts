import { readJSON, writeJSON } from '@/lib/storage';

/**
 * One conversation per problem, shared by every surface that shows it.
 *
 * The floating owl and the Ask Sensei page are the same tutor, so they must be
 * the same conversation: say something to the owl mid-problem, open the tutor
 * page, and the exchange is there. Keeping the messages in React state made
 * them per-component, which quietly produced two tutors that could not see each
 * other's turns.
 *
 * Threads are keyed by problem (`lesson:<id>`, `practice:<id>`, `free`), so
 * moving between problems switches conversation the way a chat app switches
 * threads. Persisted, so a reload does not lose the exchange.
 */

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  error?: string;
  streaming?: boolean;
}

export interface Thread {
  messages: ChatMessage[];
  /** Server session, so the backend keeps its own history for this thread. */
  sessionId: string | null;
}

const KEY = 'threads.v2';
/** Conversations are a convenience, not an archive. */
const MAX_MESSAGES = 60;

type Store = Record<string, Thread>;

const listeners = new Map<string, Set<() => void>>();
let cache: Store | null = null;

function store(): Store {
  if (!cache) cache = readJSON<Store>(KEY, {});
  return cache;
}

function persist(): void {
  if (cache) writeJSON(KEY, cache);
}

export const EMPTY_THREAD: Thread = { messages: [], sessionId: null };

export function getThread(key: string): Thread {
  return store()[key] ?? EMPTY_THREAD;
}

export function setThread(key: string, thread: Thread): void {
  const s = store();
  // A streaming message is mid-flight and must not be written to disk as such.
  s[key] = {
    sessionId: thread.sessionId,
    messages: thread.messages.slice(-MAX_MESSAGES),
  };
  persist();
  for (const fn of listeners.get(key) ?? []) fn();
}

export function clearThread(key: string): void {
  const s = store();
  delete s[key];
  persist();
  for (const fn of listeners.get(key) ?? []) fn();
}

/** Subscribe to one thread; returns an unsubscribe. */
export function subscribeThread(key: string, fn: () => void): () => void {
  let set = listeners.get(key);
  if (!set) {
    set = new Set();
    listeners.set(key, set);
  }
  set.add(fn);
  return () => set!.delete(fn);
}

/**
 * The thread a piece of context belongs to. Both the owl and the chat page
 * derive their key here so they cannot drift apart.
 */
export function threadKeyFor(ctx: {
  lesson_id?: unknown;
  question_id?: unknown;
  contextKey?: string;
}): string {
  if (ctx.contextKey) return ctx.contextKey;
  if (ctx.lesson_id) return `lesson:${String(ctx.lesson_id)}`;
  if (ctx.question_id) return `practice:${String(ctx.question_id)}`;
  return 'free';
}
