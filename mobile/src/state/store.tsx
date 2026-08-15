/**
 * One app-wide store.
 *
 * It is deliberately a single provider rather than per-screen state: the tab bar
 * unmounts screens, and losing a live conversation (or a 60-second diagnosis that is
 * still in flight) because someone tapped "Path" mid-demo is not acceptable. Anything
 * expensive or in-flight lives here.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { diagnoseWork, getCoursePath, getHealth, type ImageUpload } from '../api/sensei';
import { streamTutor, type StreamHandle } from '../api/stream';
import type { CoursePath, Diagnosis, Health, Turn } from '../api/types';
import { normalizeBaseUrl } from '../api/http';

export type Tab = 'chat' | 'work' | 'path' | 'settings';

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  /** Set on the tutor turn when the graph redirected teaching upstream. */
  rootCause?: string | null;
  streaming?: boolean;
  error?: string | null;
};

export type ActiveConcept = { id: string; label: string } | null;

const KEY_BASE_URL = 'sensei.baseUrl';
const KEY_LEARNER_ID = 'sensei.learnerId';

/**
 * A guess, and it is meant to be wrong. The GB10's LAN address is unknown until we are
 * standing next to it, which is exactly why this is editable in Settings and persisted
 * -- pointing the app at the box must never require a rebuild.
 */
export const DEFAULT_BASE_URL = 'http://192.168.1.100:8080';
export const DEFAULT_LEARNER_ID = 'demo';

/** Tokens arrive faster than the UI needs to repaint; coalesce them. */
const TOKEN_FLUSH_MS = 60;
const HEALTH_POLL_MS = 30_000;

let idCounter = 0;
const nextId = () => `m${Date.now().toString(36)}${(idCounter++).toString(36)}`;

type Store = {
  hydrated: boolean;

  tab: Tab;
  setTab: (t: Tab) => void;

  baseUrl: string;
  setBaseUrl: (v: string) => void;
  learnerId: string;
  setLearnerId: (v: string) => void;

  health: Health | null;
  healthError: string | null;
  healthChecking: boolean;
  refreshHealth: () => void;

  path: CoursePath | null;
  pathError: string | null;
  pathLoading: boolean;
  refreshPath: () => void;

  activeConcept: ActiveConcept;
  setActiveConcept: (c: ActiveConcept) => void;

  messages: ChatMessage[];
  streaming: boolean;
  send: (text: string) => void;
  stop: () => void;
  clearChat: () => void;
  pushTutorTurn: (text: string) => void;

  diagnosis: Diagnosis | null;
  diagnosing: boolean;
  diagnoseError: string | null;
  runDiagnose: (image: ImageUpload, problem: string) => Promise<void>;
  clearDiagnosis: () => void;
};

const StoreContext = createContext<Store | null>(null);

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [tab, setTab] = useState<Tab>('chat');

  const [baseUrl, setBaseUrlState] = useState(DEFAULT_BASE_URL);
  const [learnerId, setLearnerIdState] = useState(DEFAULT_LEARNER_ID);

  const [health, setHealth] = useState<Health | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [healthChecking, setHealthChecking] = useState(false);

  const [path, setPath] = useState<CoursePath | null>(null);
  const [pathError, setPathError] = useState<string | null>(null);
  const [pathLoading, setPathLoading] = useState(false);

  const [activeConcept, setActiveConcept] = useState<ActiveConcept>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);

  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [diagnosing, setDiagnosing] = useState(false);
  const [diagnoseError, setDiagnoseError] = useState<string | null>(null);

  // Refs mirror state that callbacks need without re-creating the callback.
  const messagesRef = useRef<ChatMessage[]>([]);
  const baseUrlRef = useRef(baseUrl);
  const learnerIdRef = useRef(learnerId);
  const conceptRef = useRef<ActiveConcept>(null);
  const streamRef = useRef<StreamHandle | null>(null);
  const pendingRef = useRef('');
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeMsgRef = useRef<string | null>(null);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  useEffect(() => {
    baseUrlRef.current = baseUrl;
  }, [baseUrl]);
  useEffect(() => {
    learnerIdRef.current = learnerId;
  }, [learnerId]);
  useEffect(() => {
    conceptRef.current = activeConcept;
  }, [activeConcept]);

  // ------------------------------------------------------------- persistence

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const pairs = await AsyncStorage.multiGet([KEY_BASE_URL, KEY_LEARNER_ID]);
        if (!alive) return;
        for (const [k, v] of pairs) {
          if (!v) continue;
          if (k === KEY_BASE_URL) setBaseUrlState(v);
          if (k === KEY_LEARNER_ID) setLearnerIdState(v);
        }
      } catch {
        // Storage failure is not fatal; the defaults still let the app run.
      } finally {
        if (alive) setHydrated(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const setBaseUrl = useCallback((v: string) => {
    setBaseUrlState(v);
    AsyncStorage.setItem(KEY_BASE_URL, v).catch(() => {});
  }, []);

  const setLearnerId = useCallback((v: string) => {
    const id = v.trim() || DEFAULT_LEARNER_ID;
    setLearnerIdState(id);
    AsyncStorage.setItem(KEY_LEARNER_ID, id).catch(() => {});
  }, []);

  // ------------------------------------------------------------------ health

  const refreshHealth = useCallback(() => {
    const url = baseUrlRef.current;
    if (!normalizeBaseUrl(url)) return;
    setHealthChecking(true);
    getHealth(url)
      .then((h) => {
        setHealth(h);
        setHealthError(null);
      })
      .catch((e: Error) => {
        setHealth(null);
        setHealthError(e.message);
      })
      .finally(() => setHealthChecking(false));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    refreshHealth();
    const t = setInterval(refreshHealth, HEALTH_POLL_MS);
    return () => clearInterval(t);
    // Re-probe whenever the operator retargets the app at a different box.
  }, [hydrated, baseUrl, refreshHealth]);

  // -------------------------------------------------------------- course path

  const refreshPath = useCallback(() => {
    const url = baseUrlRef.current;
    if (!normalizeBaseUrl(url)) return;
    setPathLoading(true);
    getCoursePath(url, learnerIdRef.current)
      .then((p) => {
        setPath(p);
        setPathError(null);
      })
      .catch((e: Error) => setPathError(e.message))
      .finally(() => setPathLoading(false));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    refreshPath();
  }, [hydrated, baseUrl, learnerId, refreshPath]);

  /**
   * Default the tutoring target to whatever the course says is next, so the root-cause
   * redirect can fire without the student first having to pick a concept by hand.
   */
  useEffect(() => {
    if (!path || conceptRef.current) return;
    const target = path.next;
    if (!target) return;
    const c = path.concepts.find((x) => x.id === target);
    setActiveConcept({ id: target, label: c ? c.name_local || c.name : target });
  }, [path]);

  // -------------------------------------------------------------------- chat

  const stopFlushTimer = useCallback(() => {
    if (flushTimerRef.current) {
      clearInterval(flushTimerRef.current);
      flushTimerRef.current = null;
    }
  }, []);

  const flushTokens = useCallback(() => {
    const chunk = pendingRef.current;
    const id = activeMsgRef.current;
    if (!chunk || !id) return;
    pendingRef.current = '';
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, content: m.content + chunk } : m)));
  }, []);

  const patchActive = useCallback((patch: Partial<ChatMessage>) => {
    const id = activeMsgRef.current;
    if (!id) return;
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }, []);

  const send = useCallback(
    (text: string) => {
      const message = text.trim();
      if (!message || streamRef.current) return;

      const history: Turn[] = messagesRef.current
        .filter((m) => !m.error && m.content.trim().length > 0)
        .map((m) => ({ role: m.role, content: m.content }));

      const userMsg: ChatMessage = { id: nextId(), role: 'user', content: message };
      const tutorMsg: ChatMessage = {
        id: nextId(),
        role: 'assistant',
        content: '',
        rootCause: null,
        streaming: true,
      };
      activeMsgRef.current = tutorMsg.id;
      pendingRef.current = '';
      setMessages((prev) => [...prev, userMsg, tutorMsg]);
      setStreaming(true);

      stopFlushTimer();
      flushTimerRef.current = setInterval(flushTokens, TOKEN_FLUSH_MS);

      // streamTutor can fail synchronously (no base URL configured), in which case
      // `settle` runs before the handle exists. Without this flag the stale handle
      // would be written back afterwards and block every subsequent send.
      let settled = false;
      const settle = () => {
        settled = true;
        stopFlushTimer();
        flushTokens();
        streamRef.current = null;
        setStreaming(false);
      };

      const handle = streamTutor(
        baseUrlRef.current,
        {
          learner_id: learnerIdRef.current,
          message,
          concept_id: conceptRef.current?.id ?? null,
          history,
        },
        {
          onStart: ({ rootCause }) => patchActive({ rootCause }),
          onToken: (t) => {
            pendingRef.current += t;
          },
          onDone: () => {
            settle();
            patchActive({ streaming: false });
          },
          onError: (msg) => {
            settle();
            patchActive({ streaming: false, error: msg });
          },
        },
      );
      if (!settled) streamRef.current = handle;
    },
    [flushTokens, patchActive, stopFlushTimer],
  );

  const stop = useCallback(() => {
    streamRef.current?.cancel();
    streamRef.current = null;
    stopFlushTimer();
    flushTokens();
    setStreaming(false);
    patchActive({ streaming: false });
  }, [flushTokens, patchActive, stopFlushTimer]);

  const clearChat = useCallback(() => {
    streamRef.current?.cancel();
    streamRef.current = null;
    stopFlushTimer();
    pendingRef.current = '';
    activeMsgRef.current = null;
    setStreaming(false);
    setMessages([]);
  }, [stopFlushTimer]);

  /** Drop a tutor turn into the conversation (used to hand off from the photo flow). */
  const pushTutorTurn = useCallback((text: string) => {
    if (!text.trim()) return;
    setMessages((prev) => [...prev, { id: nextId(), role: 'assistant', content: text.trim() }]);
  }, []);

  useEffect(() => stopFlushTimer, [stopFlushTimer]);

  // ---------------------------------------------------------------- diagnose

  const runDiagnose = useCallback(async (image: ImageUpload, problem: string) => {
    setDiagnosing(true);
    setDiagnoseError(null);
    setDiagnosis(null);
    try {
      const result = await diagnoseWork(baseUrlRef.current, {
        learnerId: learnerIdRef.current,
        problem,
        image,
      });
      setDiagnosis(result);
    } catch (e) {
      setDiagnoseError(e instanceof Error ? e.message : String(e));
    } finally {
      setDiagnosing(false);
    }
  }, []);

  const clearDiagnosis = useCallback(() => {
    setDiagnosis(null);
    setDiagnoseError(null);
  }, []);

  const value = useMemo<Store>(
    () => ({
      hydrated,
      tab,
      setTab,
      baseUrl,
      setBaseUrl,
      learnerId,
      setLearnerId,
      health,
      healthError,
      healthChecking,
      refreshHealth,
      path,
      pathError,
      pathLoading,
      refreshPath,
      activeConcept,
      setActiveConcept,
      messages,
      streaming,
      send,
      stop,
      clearChat,
      pushTutorTurn,
      diagnosis,
      diagnosing,
      diagnoseError,
      runDiagnose,
      clearDiagnosis,
    }),
    [
      hydrated,
      tab,
      baseUrl,
      setBaseUrl,
      learnerId,
      setLearnerId,
      health,
      healthError,
      healthChecking,
      refreshHealth,
      path,
      pathError,
      pathLoading,
      refreshPath,
      activeConcept,
      messages,
      streaming,
      send,
      stop,
      clearChat,
      pushTutorTurn,
      diagnosis,
      diagnosing,
      diagnoseError,
      runDiagnose,
      clearDiagnosis,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
