/**
 * The one HTTP path in the app. Everything goes through XMLHttpRequest.
 *
 * Two reasons, both hard-won:
 *
 * 1. `fetch` in React Native cannot stream (no ReadableStream on the response body).
 *    Streaming has to be XHR anyway -- see ./stream.ts -- so using XHR everywhere keeps
 *    one set of timeout/error semantics instead of two.
 * 2. `fetch` has no timeout knob. RN's default differs per platform, and the platform
 *    defaults are all far below what this backend needs.
 *
 * The timeout is the thing to be careful with: the vllm router keeps exactly one model
 * resident and serves a cold swap *on the same HTTP call*, which takes 1-5 minutes. A
 * 60s timeout would abort a perfectly healthy request and look identical to a crash.
 */

/** >= 600s is the hard floor (worst-case cold swap). 900s matches SENSEI_TIMEOUT. */
export const REQUEST_TIMEOUT_MS = 900_000;

/**
 * The one deliberate exception to the 600s floor. `/health` only reads which model is
 * resident -- it never triggers a swap -- and it is the "is the box even there?" probe,
 * so it has to fail fast or an unreachable box looks identical to a warming one. Kept
 * generously above a LAN round trip in case the router is busy mid-load.
 */
export const HEALTH_TIMEOUT_MS = 20_000;

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * Accept whatever the operator types at the event -- "192.168.1.42",
 * "192.168.1.42:8080", "http://box.local:8080/" -- and produce a usable origin.
 * Typing a bare IP under time pressure should not silently produce a dead URL.
 */
export function normalizeBaseUrl(raw: string): string {
  let s = (raw || '').trim();
  if (!s) return '';
  if (!/^https?:\/\//i.test(s)) s = 'http://' + s;
  s = s.replace(/\/+$/, '');

  const m = /^(https?:\/\/)([^/]+)(\/.*)?$/i.exec(s);
  if (!m) return s;
  const [, scheme, authority, path = ''] = m;

  // Default the port to 8080 only for a bare LAN host -- the common case, where
  // someone types `192.168.1.42` and means the box.
  //
  // Do NOT default it when the URL is https or carries a path. Both indicate a
  // deliberate address, typically the nginx-proxied web deployment at
  // `https://host/sensei/api`. Appending :8080 there yields a URL that resolves,
  // reaches the wrong service, and fails looking exactly like a dead backend.
  const hasPath = path !== '' && path !== '/';
  const isHttps = /^https:/i.test(scheme);
  const explicitPort = /:\d+$/.test(authority);
  const withPort =
    explicitPort || hasPath || isHttps ? authority : `${authority}:8080`;
  return scheme + withPort + path;
}

export function joinUrl(baseUrl: string, path: string): string {
  return normalizeBaseUrl(baseUrl) + (path.startsWith('/') ? path : '/' + path);
}

type RequestOptions = {
  baseUrl: string;
  path: string;
  method?: 'GET' | 'POST';
  /** JSON body. Mutually exclusive with `form`. */
  json?: unknown;
  /** Multipart body. Content-Type is left to the platform so it sets the boundary. */
  form?: FormData;
  timeoutMs?: number;
};

export function request<T>(opts: RequestOptions): Promise<T> {
  const { baseUrl, path, method = 'GET', json, form } = opts;
  const timeoutMs = opts.timeoutMs ?? REQUEST_TIMEOUT_MS;

  return new Promise<T>((resolve, reject) => {
    if (!normalizeBaseUrl(baseUrl)) {
      reject(new ApiError('No backend URL set. Open Settings and enter the box IP.'));
      return;
    }
    const url = joinUrl(baseUrl, path);
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    xhr.timeout = timeoutMs;
    xhr.setRequestHeader('Accept', 'application/json');
    if (json !== undefined) xhr.setRequestHeader('Content-Type', 'application/json');

    xhr.onload = () => {
      const body = xhr.responseText ?? '';
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new ApiError(describeHttpFailure(xhr.status, body), xhr.status));
        return;
      }
      try {
        resolve((body ? JSON.parse(body) : null) as T);
      } catch {
        reject(new ApiError('Backend returned something that is not JSON.', xhr.status));
      }
    };
    xhr.onerror = () => reject(new ApiError(`Cannot reach ${url}. Check the URL in Settings and that you are on the same network as the box.`));
    xhr.ontimeout = () => reject(new ApiError(`Timed out after ${Math.round(timeoutMs / 1000)}s.`));
    xhr.onabort = () => reject(new ApiError('Request cancelled.'));

    if (form) xhr.send(form);
    else if (json !== undefined) xhr.send(JSON.stringify(json));
    else xhr.send();
  });
}

/** FastAPI puts the useful part in `detail`; surface it rather than a bare status. */
export function describeHttpFailure(status: number, body: string): string {
  try {
    const parsed = JSON.parse(body);
    const detail = parsed?.detail;
    if (typeof detail === 'string') return `${status}: ${detail}`;
    if (detail) return `${status}: ${JSON.stringify(detail)}`;
  } catch {
    /* not JSON; fall through */
  }
  const trimmed = (body || '').trim().slice(0, 200);
  return trimmed ? `${status}: ${trimmed}` : `HTTP ${status}`;
}
