/** localStorage with a namespace and total tolerance for it being unavailable. */

const NS = 'sensei.';

export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(NS + key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(NS + key, JSON.stringify(value));
  } catch {
    /* quota or private mode — progress is best-effort */
  }
}

export function readRaw(key: string): string | null {
  try {
    return window.localStorage.getItem(NS + key);
  } catch {
    return null;
  }
}

export function writeRaw(key: string, value: string): void {
  try {
    window.localStorage.setItem(NS + key, value);
  } catch {
    /* ignore */
  }
}

export function removeKey(key: string): void {
  try {
    window.localStorage.removeItem(NS + key);
  } catch {
    /* ignore */
  }
}
