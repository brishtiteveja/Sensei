import { Platform } from 'react-native';

/**
 * Where the tutor lives, and whether the phone can actually talk to it.
 *
 * Three ways this has silently broken, each of which looked like "the tutor is
 * down" from inside the app:
 *
 *  1. **Cleartext.** The app shipped pointing at `http://<ip>:4050`. iOS ATS
 *     and Android 9+ both block plain HTTP by default, so every request fails
 *     in a release build while working perfectly in dev.
 *  2. **A read-only edge.** The production HTTPS route serves GET fine and
 *     answers 405 to every POST at the nginx layer, so browsing curriculum
 *     works and the moment you say anything to the tutor it dies.
 *  3. **A wrong host** that happens to answer, which looks like reachability
 *     right up until the first real call.
 *
 * `diagnoseTutor()` tells these apart, so the person deploying gets the actual
 * problem instead of "could not reach the tutor".
 */

const RAW = process.env.EXPO_PUBLIC_SENSEI_API_URL?.trim();

/** Trailing slashes turn `${base}/tutor/see` into a 404 on some proxies. */
export const SENSEI_BASE_URL = (RAW || 'https://dev.perspectivity.co/sensei/api').replace(/\/+$/, '');

export const isCleartext = SENSEI_BASE_URL.startsWith('http://');

/**
 * Cleartext to a loopback or private address is normal during development —
 * a simulator talking to a laptop. Cleartext to a public host is the bug.
 */
export const isLocalHost = /^http:\/\/(localhost|127\.|10\.|192\.168\.|10\.0\.2\.2)/.test(
  SENSEI_BASE_URL,
);

export type TutorDiagnosis =
  | { ok: true }
  | { ok: false; kind: 'cleartext'; detail: string }
  | { ok: false; kind: 'unreachable'; detail: string }
  | { ok: false; kind: 'read-only'; detail: string };

/**
 * Probe the endpoint the way the app will actually use it: a GET to prove it
 * is there, then a POST, because an edge that allows one and not the other is
 * the failure that wasted the most time.
 */
export async function diagnoseTutor(timeoutMs = 8_000): Promise<TutorDiagnosis> {
  if (isCleartext && !isLocalHost) {
    return {
      ok: false,
      kind: 'cleartext',
      detail: `${SENSEI_BASE_URL} is plain HTTP. ${
        Platform.OS === 'ios' ? 'iOS ATS' : 'Android'
      } blocks this in a release build — serve the tutor over HTTPS.`,
    };
  }

  const withTimeout = async (path: string, method: 'GET' | 'POST') => {
    const c = new AbortController();
    const timer = setTimeout(() => c.abort(), timeoutMs);
    try {
      return await fetch(`${SENSEI_BASE_URL}${path}`, {
        method,
        headers: method === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
        body: method === 'POST' ? '{}' : undefined,
        signal: c.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  };

  try {
    const health = await withTimeout('/tutor/health', 'GET');
    if (!health.ok) {
      return { ok: false, kind: 'unreachable', detail: `GET /tutor/health returned ${health.status}.` };
    }
  } catch {
    return { ok: false, kind: 'unreachable', detail: `No answer from ${SENSEI_BASE_URL}.` };
  }

  try {
    const probe = await withTimeout('/tutor/see', 'POST');
    // 422 is the healthy answer: the route exists and rejected an empty body.
    // 405 means something in front of the app is refusing the method outright.
    if (probe.status === 405) {
      return {
        ok: false,
        kind: 'read-only',
        detail:
          'The server answers GET but rejects POST (405). Chat, the vision coach and recording all POST — the proxy in front of the tutor needs to pass them through.',
      };
    }
  } catch {
    return { ok: false, kind: 'unreachable', detail: 'The endpoint accepted GET but dropped POST.' };
  }

  return { ok: true };
}
