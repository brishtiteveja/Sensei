import { useCallback, useEffect, useRef, useState } from 'react';
import { streamTutor } from '@/lib/sse';
import {
  clearThread,
  getThread,
  setThread,
  subscribeThread,
  threadKeyFor,
} from '@/lib/conversations';
import type { ChatMessage } from '@/lib/conversations';
import type { ContextType, TutorContextData } from '@/lib/types';
import { uid } from '@/lib/utils';
import { learnerId } from '@/lib/learner';

export type { ChatMessage };

export type TutorPhase = 'idle' | 'connecting' | 'streaming';

interface UseTutorChatOptions {
  contextType: ContextType;
  /** Extra fields merged into `context_data` (lesson_id, subject, …). */
  contextData: Omit<TutorContextData, 'language'>;
  language: string;
  /** Override the thread this chat belongs to; defaults to the context's. */
  threadKey?: string;
}

export interface TutorChatApi {
  messages: ChatMessage[];
  phase: TutorPhase;
  /** Latest `progress` step from the server — e.g. model loading. */
  progressStep: string | null;
  sessionId: string | null;
  model: string | null;
  followUps: string[];
  /** `extra` is merged into context_data for this turn only. */
  send: (text: string, extra?: Record<string, unknown>) => void;
  stop: () => void;
  reset: () => void;
  retryLast: () => void;
}

export function useTutorChat({
  contextType,
  contextData,
  language,
  threadKey,
}: UseTutorChatOptions): TutorChatApi {
  // The conversation lives in a shared store, not component state, so the
  // floating owl and the tutor page are literally the same exchange.
  const key = threadKey ?? threadKeyFor(contextData as Record<string, unknown>);
  const [messages, setMessagesLocal] = useState<ChatMessage[]>(() => getThread(key).messages);
  const [phase, setPhase] = useState<TutorPhase>('idle');
  const [progressStep, setProgressStep] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [followUps, setFollowUps] = useState<string[]>([]);

  const keyRef = useRef(key);
  keyRef.current = key;

  /** Write through to the shared store so every mounted view updates. */
  const setMessages = useCallback(
    (update: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
      const k = keyRef.current;
      const prev = getThread(k).messages;
      const next = typeof update === 'function' ? update(prev) : update;
      setThread(k, { messages: next, sessionId: sessionIdRef.current });
    },
    [],
  );

  // Re-read whenever this thread changes anywhere, including from the owl.
  useEffect(() => {
    const sync = () => setMessagesLocal(getThread(key).messages);
    sync();
    const stored = getThread(key).sessionId;
    if (stored) sessionIdRef.current = stored;
    return subscribeThread(key, sync);
  }, [key]);

  const abortRef = useRef<AbortController | null>(null);
  const lastUserRef = useRef<string | null>(null);
  /** Read synchronously inside `send`, so it cannot be state. */
  const sessionIdRef = useRef<string | null>(null);

  // Keep the latest context in a ref so `send` stays referentially stable.
  const ctxRef = useRef({ contextType, contextData, language });
  ctxRef.current = { contextType, contextData, language };

  useEffect(() => () => abortRef.current?.abort(), []);

  /**
   * `extra` carries per-turn context the caller computed just now — the
   * workspace digest, and notes from any work the tutor was shown. It is merged
   * into context_data rather than held in state so it is always fresh for the
   * turn being sent.
   */
  const run = useCallback((text: string, extra?: Record<string, unknown>) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    lastUserRef.current = trimmed;
    const assistantId = uid('a');

    setFollowUps([]);
    setProgressStep(null);
    setPhase('connecting');
    setMessages((prev) => [
      ...prev,
      { id: uid('u'), role: 'user', text: trimmed },
      { id: assistantId, role: 'assistant', text: '', streaming: true },
    ]);

    const patch = (fn: (m: ChatMessage) => ChatMessage) =>
      setMessages((prev) => prev.map((m) => (m.id === assistantId ? fn(m) : m)));

    const { contextType: ct, contextData: cd, language: lang } = ctxRef.current;

    void streamTutor(
      {
        message: trimmed,
        session_id: sessionIdRef.current,
        context_type: ct,
        // learner_id is what lets the server load this student's profile into
        // the system prompt -- the difference between a tutor and a chatbot.
        context_data: { ...cd, language: lang, learner_id: learnerId(), ...(extra ?? {}) },
      },
      {
        onProgress: (p) => {
          if (p.session_id) {
            sessionIdRef.current = p.session_id;
            setSessionId(p.session_id);
          }
          if (p.step) setProgressStep(p.step);
        },
        onToken: (chunk) => {
          setPhase('streaming');
          patch((m) => ({ ...m, text: m.text + chunk }));
        },
        onSuggestions: (s) => setFollowUps(s.slice(0, 4)),
        onDone: (p) => {
          if (p.session_id) {
            sessionIdRef.current = p.session_id;
            setSessionId(p.session_id);
          }
          if (p.model) setModel(p.model);
          setPhase('idle');
          setProgressStep(null);
          patch((m) => ({
            ...m,
            streaming: false,
            // A done with no tokens at all is a failure worth surfacing.
            error: m.text.trim() ? undefined : 'The tutor returned an empty response.',
          }));
        },
        onError: (message) => {
          setPhase('idle');
          setProgressStep(null);
          patch((m) => ({ ...m, streaming: false, error: message }));
        },
      },
      controller.signal,
    );
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setPhase('idle');
    setProgressStep(null);
    setMessages((prev) =>
      prev.map((m) =>
        m.streaming ? { ...m, streaming: false, error: m.text ? undefined : 'Stopped.' } : m,
      ),
    );
  }, []);

  const reset = useCallback(() => {
    clearThread(keyRef.current);
    abortRef.current?.abort();
    abortRef.current = null;
    sessionIdRef.current = null;
    setMessages([]);
    setSessionId(null);
    setFollowUps([]);
    setPhase('idle');
    setProgressStep(null);
  }, []);

  const retryLast = useCallback(() => {
    const last = lastUserRef.current;
    if (!last) return;
    // Drop the failed exchange before replaying it.
    setMessages((prev) => prev.slice(0, -2));
    window.setTimeout(() => run(last), 0);
  }, [run]);

  return {
    messages,
    phase,
    progressStep,
    sessionId,
    model,
    followUps,
    send: run,
    stop,
    reset,
    retryLast,
  };
}
