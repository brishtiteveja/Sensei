import { API_BASE_URL } from '@/lib/api';

/**
 * Phone handoff: use a phone as the drawing tablet and camera for the desktop app.
 *
 * Drawing a diagram with a trackpad is genuinely hard, and the photo of a page
 * of working is on the phone anyway. The desktop shows a QR code, the phone
 * opens it and draws or shoots, and the image comes back to the desktop surface
 * that asked for it.
 *
 * The pairing code is generated on the desktop, so the QR appears instantly with
 * no server round-trip. The server slot is one-shot and short-lived — it is a
 * pipe between two devices that are both online, not storage.
 */

/** Unguessable enough for a 10-minute, one-shot, contents-only slot. */
export function newPairingCode(): string {
  const bytes = new Uint8Array(9);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 14);
}

export type HandoffMode = 'draw' | 'photo';

/** The URL the phone opens. Absolute, because it is leaving this device. */
export function handoffUrl(code: string, mode: HandoffMode): string {
  const base = `${window.location.origin}${import.meta.env.BASE_URL}handoff`;
  return `${base}?c=${encodeURIComponent(code)}&m=${mode}`;
}

/** Phone side: hand the image to the waiting desktop. */
export async function sendHandoff(
  code: string,
  image: string,
  kind: 'sketch' | 'image',
): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/handoff/${encodeURIComponent(code)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image, kind }),
  });
  if (!res.ok) throw new Error(`handoff failed (${res.status})`);
}

/**
 * Desktop side: poll until the phone sends something, the caller aborts, or we
 * give up. Resolves null on timeout so the UI can say so rather than hang.
 */
export async function waitForHandoff(
  code: string,
  signal: AbortSignal,
  { intervalMs = 1500, timeoutMs = 600_000 } = {},
): Promise<{ image: string; kind: string } | null> {
  const deadline = Date.now() + timeoutMs;
  while (!signal.aborted && Date.now() < deadline) {
    try {
      const res = await fetch(`${API_BASE_URL}/handoff/${encodeURIComponent(code)}`, { signal });
      if (res.ok) {
        const body = (await res.json()) as { image: string | null; kind?: string };
        if (body.image) return { image: body.image, kind: body.kind ?? 'image' };
      }
    } catch {
      // A blip between polls is normal; keep waiting until the deadline.
      if (signal.aborted) return null;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return null;
}
