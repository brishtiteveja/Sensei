/**
 * SSE over XMLHttpRequest.
 *
 * DO NOT rewrite this with `fetch`. React Native's fetch does not implement
 * `response.body` as a ReadableStream, so a fetch-based reader does not error -- it
 * just resolves once with the whole body, or hangs. On device that looks like the model
 * "thinking" forever. XHR is the only transport in RN that hands you bytes as they land.
 *
 * The mechanics: RN enables incremental delivery only when `onprogress` (or
 * `onreadystatechange`) is assigned *before* send(), and only for a text responseType.
 * Each progress event hands us the whole `responseText` so far, so we keep a cursor of
 * how much we have already consumed and slice off the new tail.
 */

import { ApiError, REQUEST_TIMEOUT_MS, describeHttpFailure, joinUrl, normalizeBaseUrl } from './http';
import type { TutorStreamRequest } from './types';

export type StreamHandlers = {
  /** `rootCause` is a human-readable redirect ("go back to vector decomposition") or null. */
  onStart?: (info: { model: string; rootCause: string | null }) => void;
  onToken?: (text: string) => void;
  onDone?: () => void;
  onError?: (message: string) => void;
};

export type StreamHandle = {
  /** Idempotent. Fires no handlers -- the caller already knows it cancelled. */
  cancel: () => void;
};

export function streamTutor(
  baseUrl: string,
  body: TutorStreamRequest,
  handlers: StreamHandlers,
): StreamHandle {
  const noop: StreamHandle = { cancel: () => {} };

  if (!normalizeBaseUrl(baseUrl)) {
    handlers.onError?.('No backend URL set. Open Settings and enter the box IP.');
    return noop;
  }

  const url = joinUrl(baseUrl, '/tutor/stream');
  const xhr = new XMLHttpRequest();

  let cursor = 0; // bytes of responseText already folded into `buffer`
  let buffer = ''; // partial SSE frame carried between progress events
  let settled = false; // done/error is terminal; never fire twice
  let cancelled = false;

  const finishOk = () => {
    if (settled || cancelled) return;
    settled = true;
    handlers.onDone?.();
  };
  const finishErr = (message: string) => {
    if (settled || cancelled) return;
    settled = true;
    handlers.onError?.(message);
  };

  const dispatch = (frame: string) => {
    if (settled) return;
    let event = 'message';
    const dataLines: string[] = [];

    for (const rawLine of frame.split('\n')) {
      const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine;
      if (!line || line.startsWith(':')) continue; // blank or SSE comment/keepalive
      const colon = line.indexOf(':');
      const field = colon === -1 ? line : line.slice(0, colon);
      let value = colon === -1 ? '' : line.slice(colon + 1);
      if (value.startsWith(' ')) value = value.slice(1);
      if (field === 'event') event = value;
      else if (field === 'data') dataLines.push(value);
    }

    const payload = dataLines.join('\n');
    if (!payload && event === 'message') return;

    let data: any = {};
    if (payload) {
      try {
        data = JSON.parse(payload);
      } catch {
        // A frame we cannot parse is not worth killing a live stream over.
        return;
      }
    }

    switch (event) {
      case 'start':
        handlers.onStart?.({
          model: typeof data.model === 'string' ? data.model : '',
          rootCause: typeof data.root_cause === 'string' && data.root_cause ? data.root_cause : null,
        });
        break;
      case 'token':
        if (typeof data.text === 'string' && data.text.length > 0) handlers.onToken?.(data.text);
        break;
      case 'done':
        finishOk();
        break;
      case 'error':
        finishErr(typeof data.message === 'string' ? data.message : 'The tutor stopped unexpectedly.');
        break;
      default:
        break;
    }
  };

  /** Consume everything newly arrived, leaving any half-written frame in `buffer`. */
  const drain = () => {
    const text = xhr.responseText;
    if (typeof text !== 'string' || text.length <= cursor) return;
    buffer += text.slice(cursor);
    cursor = text.length;

    // Frames are separated by a blank line. The backend json-encodes each payload, so
    // no literal "\n\n" can occur inside one -- splitting on it is safe.
    let idx: number;
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const frame = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      if (frame.trim()) dispatch(frame);
    }
  };

  xhr.open('POST', url);
  // Must be assigned before send(): this is what switches RN into incremental mode.
  xhr.onprogress = () => {
    if (cancelled) return;
    drain();
  };
  xhr.timeout = REQUEST_TIMEOUT_MS; // a cold model swap is served on this same request
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.setRequestHeader('Accept', 'text/event-stream');
  xhr.setRequestHeader('Cache-Control', 'no-cache');

  xhr.onload = () => {
    if (cancelled) return;
    if (xhr.status < 200 || xhr.status >= 300) {
      finishErr(describeHttpFailure(xhr.status, xhr.responseText ?? ''));
      return;
    }
    drain();
    if (buffer.trim()) {
      dispatch(buffer); // trailing frame with no terminating blank line
      buffer = '';
    }
    // A stream that ends without an explicit `done` still ended; treat it as complete
    // rather than leaving the UI spinning forever.
    finishOk();
  };
  xhr.onerror = () =>
    finishErr(`Cannot reach ${url}. Check the URL in Settings and that you are on the same network as the box.`);
  xhr.ontimeout = () => finishErr(`Timed out after ${Math.round(REQUEST_TIMEOUT_MS / 1000)}s.`);
  xhr.onabort = () => {
    /* cancelled by the user; stay silent */
  };

  try {
    xhr.send(JSON.stringify(body));
  } catch (e) {
    finishErr(e instanceof ApiError ? e.message : String(e));
    return noop;
  }

  return {
    cancel: () => {
      if (cancelled) return;
      cancelled = true;
      settled = true;
      try {
        xhr.abort();
      } catch {
        /* already finished */
      }
    },
  };
}
