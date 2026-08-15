import type {
  LanguageMap,
  LessonContent,
  ModelCatalog,
  ModelSwitchResult,
  PracticeQuestion,
  SubjectDetail,
  SubjectSummary,
  TutorHealth,
} from './types';

export const API_BASE_URL = (
  (import.meta.env.VITE_SENSEI_API_URL as string | undefined) || 'http://167.86.98.204:4050'
).replace(/\/+$/, '');

/**
 * A local model cold-swap is served on the same HTTP request and takes 1–5
 * minutes, so anything that can touch the model must allow >= 600s.
 */
export const LONG_TIMEOUT_MS = 900_000;
const DEFAULT_TIMEOUT_MS = 30_000;

export class ApiError extends Error {
  status: number;
  /** True when the request never reached the server (offline / DNS / CORS). */
  network: boolean;

  constructor(message: string, status = 0, network = false) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.network = network;
  }
}

interface RequestOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
  method?: string;
  body?: unknown;
}

/** Merge an external abort signal with an internal timeout. */
function withTimeout(timeoutMs: number, external?: AbortSignal) {
  const controller = new AbortController();
  const timer = window.setTimeout(
    () => controller.abort(new DOMException('Request timed out', 'TimeoutError')),
    timeoutMs,
  );
  const onAbort = () => controller.abort(external?.reason);
  if (external) {
    if (external.aborted) onAbort();
    else external.addEventListener('abort', onAbort, { once: true });
  }
  return {
    signal: controller.signal,
    cleanup: () => {
      window.clearTimeout(timer);
      external?.removeEventListener('abort', onAbort);
    },
  };
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { signal, timeoutMs = DEFAULT_TIMEOUT_MS, method = 'GET', body } = options;
  const { signal: merged, cleanup } = withTimeout(timeoutMs, signal);

  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: merged,
    });

    if (!res.ok) {
      let detail = '';
      try {
        detail = (await res.text()).slice(0, 300);
      } catch {
        /* body unreadable */
      }
      throw new ApiError(detail || `Request failed with status ${res.status}`, res.status);
    }

    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof DOMException && err.name === 'AbortError') {
      // Distinguish "we timed out" from "the caller cancelled".
      if (signal?.aborted) throw err;
      throw new ApiError('The tutor server took too long to respond.', 0, true);
    }
    throw new ApiError(
      err instanceof Error ? err.message : 'Could not reach the Sensei server.',
      0,
      true,
    );
  } finally {
    cleanup();
  }
}

const qs = (params: Record<string, string | number | undefined>) => {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '' && v !== null) sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
};

/* ------------------------------------------------------------------ */
/* Curriculum                                                          */
/* ------------------------------------------------------------------ */

export function getSubjects(lang: string, signal?: AbortSignal) {
  return apiFetch<{ subjects: SubjectSummary[] }>(
    `/curriculum/subjects${qs({ lang })}`,
    { signal },
  ).then((r) => r.subjects ?? []);
}

export function getSubject(id: string, lang: string, signal?: AbortSignal) {
  return apiFetch<SubjectDetail>(`/curriculum/subjects/${encodeURIComponent(id)}${qs({ lang })}`, {
    signal,
    timeoutMs: 45_000,
  });
}

export function getLessonContent(lessonId: string, signal?: AbortSignal) {
  return apiFetch<LessonContent>(
    `/curriculum/lessons/${encodeURIComponent(lessonId)}/content`,
    { signal, timeoutMs: 45_000 },
  );
}

export function getLanguages(signal?: AbortSignal) {
  return apiFetch<{ languages: LanguageMap }>('/curriculum/languages', { signal }).then(
    (r) => r.languages ?? {},
  );
}

/* ------------------------------------------------------------------ */
/* Practice                                                            */
/* ------------------------------------------------------------------ */

export function getPracticeQuestions(
  params: { subject?: string; chapter?: string; university?: string; limit?: number; lang: string },
  signal?: AbortSignal,
) {
  return apiFetch<{ questions: PracticeQuestion[] }>(`/practice/questions${qs(params)}`, {
    signal,
    // Observed ~25s cold; the endpoint translates on demand.
    timeoutMs: 90_000,
  }).then((r) => r.questions ?? []);
}

/* ------------------------------------------------------------------ */
/* Admin / models                                                      */
/* ------------------------------------------------------------------ */

export function getModelCatalog(signal?: AbortSignal) {
  return apiFetch<ModelCatalog>('/admin/models', { signal });
}

/**
 * Switching to a non-resident local model triggers a 1–5 min cold swap that is
 * served on this very request, hence the long timeout.
 */
export function setModel(mode: 'local' | 'cloud', model: string, signal?: AbortSignal) {
  return apiFetch<ModelSwitchResult>('/admin/model', {
    method: 'POST',
    body: { mode, model },
    timeoutMs: LONG_TIMEOUT_MS,
    signal,
  });
}

export function getTutorHealth(signal?: AbortSignal) {
  return apiFetch<TutorHealth>('/tutor/health', { signal, timeoutMs: 12_000 });
}
