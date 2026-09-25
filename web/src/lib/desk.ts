import { readJSON, writeJSON } from './storage';

/**
 * Client for the Sensei Desk gateway (SenseiAI/gateway on the DGX Spark): the phone on the
 * pan-tilt head calls it over WebRTC, and the SenseiDesk tab watches and steers that call.
 *
 * This is a different service from Sensei-NemoClaw (api.ts): the gateway owns the live call,
 * the tutor loop, the ears and the head. Every request carries the gateway's access key. The
 * key is typed in by the person using the desk and kept in this browser only; it is never
 * part of the build, because this web app is public.
 */

export interface DeskConfig {
  url: string; // e.g. https://spark-e257.tail803c7f.ts.net:8443
  key: string;
}

const STORE = 'sensei.desk';

/** Where the gateway usually is, relative to where this page is served. */
function defaultUrl(): string {
  const { protocol, hostname } = window.location;
  // Behind Tailscale Funnel the gateway is on :8443 of the same host; on a LAN or the
  // tailnet it is plain http on :8787.
  return protocol === 'https:' ? `https://${hostname}:8443` : `http://${hostname}:8787`;
}

export function loadDeskConfig(): DeskConfig {
  const saved = readJSON<Partial<DeskConfig>>(STORE, {});
  return { url: saved.url || defaultUrl(), key: saved.key || '' };
}

export function saveDeskConfig(cfg: DeskConfig): void {
  writeJSON(STORE, { url: cfg.url.replace(/\/+$/, ''), key: cfg.key });
}

export class DeskError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function call<T>(cfg: DeskConfig, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${cfg.url}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      'X-Sensei-Key': cfg.key,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      detail = (await res.json()).detail ?? detail;
    } catch {
      /* not JSON */
    }
    throw new DeskError(String(detail), res.status);
  }
  return (await res.json()) as T;
}

/** A URL the browser can load directly (img src, EventSource): the key goes in the query. */
export function deskUrl(cfg: DeskConfig, path: string): string {
  const sep = path.includes('?') ? '&' : '?';
  return `${cfg.url}${path}${sep}key=${encodeURIComponent(cfg.key)}`;
}

// --- what the gateway reports -----------------------------------------------------------------

export interface TutorState {
  type: 'tutor';
  phase: 'idle' | 'watching' | 'paused' | 'ended';
  remaining_s: number;
  thinking: boolean;
  problem: string | null;
  subject: string | null;
  topic: string | null;
  hint_level: number;
  hints_given: number;
}

export interface HeadState {
  port?: string;
  connected?: boolean;
  pan?: number;
  tilt?: number;
  error?: string | null;
  auto?: boolean;
  looking_at?: string;
  why?: string;
}

export interface DeskStatus {
  connected: boolean;
  state?: string;
  seconds?: number;
  fps?: number;
  route?: string | null;
  voice?: boolean;
  tutor?: TutorState | null;
  brain?: string | null;
  jev?: { on: boolean; available: boolean; backend?: string };
  ears?: string | null;
  head?: HeadState;
}

/** One line of the session's log.jsonl, as streamed: `t` is seconds since the call started. */
export interface DeskEvent {
  type: 'event';
  session: string;
  t: number;
  event: string;
  [field: string]: unknown;
}

export type DeskMessage =
  | { type: 'hello'; status: DeskStatus; history: DeskEvent[]; session: string | null }
  | DeskEvent
  | { type: 'phone'; session: string; msg: { type: string; [k: string]: unknown } };

// --- controls ---------------------------------------------------------------------------------

export type TutorAction = 'start' | 'hint' | 'check' | 'look' | 'repeat' | 'pause' | 'resume' | 'end';

export const desk = {
  status: (cfg: DeskConfig) => call<DeskStatus>(cfg, '/status'),
  iceServers: async (cfg: DeskConfig) =>
    (await call<{ iceServers: RTCIceServer[] }>(cfg, '/config')).iceServers,
  tutor: (cfg: DeskConfig, action: TutorAction, minutes = 10) =>
    call(cfg, '/tutor', { action, minutes }),
  say: (cfg: DeskConfig, text: string) => call(cfg, '/say', { text }),
  hush: (cfg: DeskConfig) => call(cfg, '/hush', {}),
  head: (cfg: DeskConfig, body: Record<string, unknown>) => call(cfg, '/head', body),
  tapOnly: (cfg: DeskConfig, on: boolean) => call(cfg, '/tap_only', { on }),
  jev: (cfg: DeskConfig, on: boolean) => call(cfg, '/jev', { on }),
};

/** Every session event and every message to the phone, live. Returns a function that stops it. */
export function subscribe(
  cfg: DeskConfig,
  onMessage: (m: DeskMessage) => void,
  onState: (open: boolean) => void,
): () => void {
  const source = new EventSource(deskUrl(cfg, '/events'));
  source.onopen = () => onState(true);
  source.onerror = () => onState(false); // EventSource reconnects by itself
  source.onmessage = (e) => {
    try {
      onMessage(JSON.parse(e.data) as DeskMessage);
    } catch {
      /* a malformed frame is skipped, not fatal */
    }
  };
  return () => source.close();
}

/**
 * Receive the phone's live video and audio: a receive-only WebRTC call to the gateway, which
 * relays the phone's tracks. Uses the gateway's TURN relay when there is one, so it works
 * from outside the Spark's network too.
 */
export async function watchCall(cfg: DeskConfig, video: HTMLVideoElement): Promise<RTCPeerConnection> {
  const pc = new RTCPeerConnection({ iceServers: await desk.iceServers(cfg) });
  pc.addTransceiver('video', { direction: 'recvonly' });
  pc.addTransceiver('audio', { direction: 'recvonly' });
  const stream = new MediaStream();
  pc.ontrack = (e) => {
    stream.addTrack(e.track);
    video.srcObject = stream;
  };
  await pc.setLocalDescription(await pc.createOffer());
  await gatheringComplete(pc); // the gateway doesn't trickle: send every candidate at once
  const answer = await call<RTCSessionDescriptionInit>(cfg, '/watch', {
    sdp: pc.localDescription!.sdp,
    type: pc.localDescription!.type,
  });
  await pc.setRemoteDescription(answer);
  return pc;
}

function gatheringComplete(pc: RTCPeerConnection, timeoutMs = 4000): Promise<void> {
  if (pc.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      pc.removeEventListener('icegatheringstatechange', check);
      resolve();
    };
    const check = () => pc.iceGatheringState === 'complete' && done();
    pc.addEventListener('icegatheringstatechange', check);
    setTimeout(done, timeoutMs); // enough candidates by now; don't hang on a slow TURN
  });
}
