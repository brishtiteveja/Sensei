import { API_BASE_URL, LONG_TIMEOUT_MS } from './api';
import type { TutorRequest } from './types';

/**
 * SSE client for POST /tutor/stream.
 *
 * The browser's EventSource cannot POST, so we use fetch + ReadableStream and
 * parse the `event:` / `data:` frames ourselves with a TextDecoder. This is the
 * one place the web client diverges from the React Native app (which needs
 * XMLHttpRequest because RN's fetch has no streaming body).
 *
 * Timeout is deliberately huge: a local model cold swap is served on this same
 * request and can take 1–5 minutes before the first token arrives. The idle
 * watchdog is reset by every byte received, so a slow-but-alive stream never
 * gets killed.
 */

export interface TutorStreamHandlers {
  onProgress?: (payload: { step?: string; session_id?: string }) => void;
  onToken?: (text: string) => void;
  onSuggestions?: (suggestions: string[]) => void;
  onDone?: (payload: { session_id?: string; model?: string; usage?: unknown }) => void;
  onError?: (message: string) => void;
}

/** No bytes at all for this long => treat the connection as dead. */
const IDLE_TIMEOUT_MS = LONG_TIMEOUT_MS;

export async function streamTutor(
  body: TutorRequest,
  handlers: TutorStreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const controller = new AbortController();
  const abortOuter = () => controller.abort(signal?.reason);
  if (signal) {
    if (signal.aborted) abortOuter();
    else signal.addEventListener('abort', abortOuter, { once: true });
  }

  let idleTimer = 0;
  const resetIdle = () => {
    window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(() => {
      controller.abort(new DOMException('Stream idle timeout', 'TimeoutError'));
    }, IDLE_TIMEOUT_MS);
  };

  const cleanup = () => {
    window.clearTimeout(idleTimer);
    signal?.removeEventListener('abort', abortOuter);
  };

  try {
    resetIdle();

    const res = await fetch(`${API_BASE_URL}/tutor/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      handlers.onError?.(
        detail?.slice(0, 240) || `Tutor request failed (HTTP ${res.status}).`,
      );
      return;
    }
    if (!res.body) {
      handlers.onError?.('This browser cannot read streaming responses.');
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let sawDone = false;

    // Parse one complete SSE frame ("event: x\ndata: {...}").
    const handleFrame = (raw: string) => {
      let eventName = 'message';
      const dataLines: string[] = [];

      for (const line of raw.split('\n')) {
        if (!line || line.startsWith(':')) continue;
        if (line.startsWith('event:')) eventName = line.slice(6).trim();
        else if (line.startsWith('data:')) dataLines.push(line.slice(5).replace(/^ /, ''));
      }
      if (!dataLines.length) return;

      const dataStr = dataLines.join('\n');
      let payload: Record<string, unknown> = {};
      try {
        payload = JSON.parse(dataStr) as Record<string, unknown>;
      } catch {
        // Non-JSON data frame — treat as a raw token so nothing is lost.
        if (eventName === 'token') handlers.onToken?.(dataStr);
        return;
      }

      switch (eventName) {
        case 'progress':
          handlers.onProgress?.(payload as { step?: string; session_id?: string });
          break;
        case 'token': {
          // The API can emit an empty-string delta; forwarding it is harmless
          // but pointless, and `typeof` guards against a null text field.
          const text = payload.text;
          if (typeof text === 'string' && text.length > 0) handlers.onToken?.(text);
          break;
        }
        case 'suggestions': {
          const s = payload.suggestions;
          if (Array.isArray(s)) handlers.onSuggestions?.(s.filter((x): x is string => typeof x === 'string'));
          break;
        }
        case 'done':
          sawDone = true;
          handlers.onDone?.(payload as { session_id?: string; model?: string });
          break;
        case 'error':
          handlers.onError?.(
            typeof payload.message === 'string' ? payload.message : 'The tutor hit an error.',
          );
          break;
        default:
          break;
      }
    };

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      resetIdle();
      buffer += decoder.decode(value, { stream: true });

      // Frames are separated by a blank line; tolerate CRLF.
      let sep: number;
      while ((sep = findFrameBreak(buffer)) !== -1) {
        const [raw, consumed] = splitFrame(buffer, sep);
        buffer = buffer.slice(consumed);
        handleFrame(raw);
      }
    }

    buffer += decoder.decode();
    if (buffer.trim()) handleFrame(buffer.trim());

    // Server closed without a `done` frame — surface it rather than leaving the
    // UI stuck in a "streaming" state forever.
    if (!sawDone) handlers.onDone?.({});
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      if (signal?.aborted) return; // caller cancelled on purpose
      handlers.onError?.(
        'The tutor stopped responding. If you just switched to a local model it may still be loading.',
      );
      return;
    }
    handlers.onError?.(
      err instanceof Error && err.message
        ? `Could not reach the tutor: ${err.message}`
        : 'Could not reach the tutor.',
    );
  } finally {
    cleanup();
  }
}

function findFrameBreak(buf: string): number {
  const a = buf.indexOf('\n\n');
  const b = buf.indexOf('\r\n\r\n');
  if (a === -1) return b;
  if (b === -1) return a;
  return Math.min(a, b);
}

function splitFrame(buf: string, idx: number): [string, number] {
  const isCrlf = buf.startsWith('\r\n\r\n', idx);
  return [buf.slice(0, idx).replace(/\r/g, ''), idx + (isCrlf ? 4 : 2)];
}
