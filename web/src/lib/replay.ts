import type { ObsEvent } from '@/lib/observe';

/**
 * Session replay — and the bridge from recorded events to a vision model.
 *
 * The recorder stores what the student *did*, not pixels. That is far smaller
 * and lossless, but a vision model needs an image. The resolution is that
 * strokes are stored as geometry, so any moment of the session can be *redrawn*
 * on demand: replay is a deterministic re-render of the event log.
 *
 * That buys something a screen recording cannot. Instead of sampling frames on
 * a timer and hoping the interesting instants were caught, we pick frames at
 * moments that mean something — each committed stroke, each erase, each answer
 * — and tile them into one contact sheet. A single image carries the whole
 * progression, so the model sees *how* the work developed in one call rather
 * than N calls over a video.
 */

const W = 900;
const H = 560;
const PAPER = '#ffffff';

interface Stroke {
  tool: string;
  color: string;
  width: number;
  points: [number, number][];
}

export interface ReplayFrame {
  /** ms since the session's first event. */
  at: number;
  /** What happened at this instant, for the caption. */
  label: string;
  strokes: Stroke[];
}

function drawStroke(ctx: CanvasRenderingContext2D, s: Stroke) {
  const pts = s.points;
  if (!pts?.length) return;
  const erase = s.tool === 'eraser';
  ctx.strokeStyle = erase ? PAPER : s.color;
  ctx.fillStyle = ctx.strokeStyle;
  ctx.lineWidth = erase ? Math.max(s.width * 4, 16) : s.width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const [ax, ay] = pts[0];
  const [bx, by] = pts[pts.length - 1];

  if (s.tool === 'pen' || erase) {
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    for (const [x, y] of pts.slice(1)) ctx.lineTo(x, y);
    ctx.stroke();
    return;
  }
  if (s.tool === 'line' || s.tool === 'arrow') {
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
    if (s.tool === 'arrow') {
      const ang = Math.atan2(by - ay, bx - ax);
      const head = Math.max(10, s.width * 3);
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx - head * Math.cos(ang - Math.PI / 6), by - head * Math.sin(ang - Math.PI / 6));
      ctx.lineTo(bx - head * Math.cos(ang + Math.PI / 6), by - head * Math.sin(ang + Math.PI / 6));
      ctx.closePath();
      ctx.fill();
    }
    return;
  }
  if (s.tool === 'rect') {
    ctx.strokeRect(ax, ay, bx - ax, by - ay);
    return;
  }
  if (s.tool === 'circle') {
    ctx.beginPath();
    ctx.ellipse((ax + bx) / 2, (ay + by) / 2, Math.abs(bx - ax) / 2, Math.abs(by - ay) / 2, 0, 0, Math.PI * 2);
    ctx.stroke();
    return;
  }
  if (s.tool === 'triangle') {
    const x1 = Math.min(ax, bx);
    const x2 = Math.max(ax, bx);
    const yT = Math.min(ay, by);
    const yB = Math.max(ay, by);
    ctx.beginPath();
    ctx.moveTo((x1 + x2) / 2, yT);
    ctx.lineTo(x1, yB);
    ctx.lineTo(x2, yB);
    ctx.closePath();
    ctx.stroke();
  }
}

/** Short caption describing the moment a frame was taken. */
function captionFor(ev: ObsEvent): string | null {
  const d = (ev.data ?? {}) as Record<string, any>;
  switch (ev.type) {
    case 'sketch.shape':
      return d.tool === 'eraser' ? 'erased' : `drew ${d.tool}`;
    case 'sketch.undo':
      return 'undo';
    case 'sketch.clear':
      return 'cleared';
    case 'practice.check':
      return d.correct ? 'answered — correct' : 'answered — wrong';
    case 'notebook.block':
      return d.op === 'add' ? `added ${d.blockType}` : d.op === 'edit' ? 'wrote a step' : null;
    case 'tutor.user':
      return 'asked Sensei';
    default:
      return null;
  }
}

/**
 * Walk the log and emit one frame per meaningful moment, each carrying the
 * canvas state as it stood at that instant.
 */
export function buildFrames(events: ObsEvent[]): ReplayFrame[] {
  if (!events.length) return [];
  const t0 = events[0].t;
  const strokes: Stroke[] = [];
  const frames: ReplayFrame[] = [];

  for (const ev of events) {
    if (ev.type === 'sketch.shape') {
      const d = ev.data as unknown as Stroke;
      if (Array.isArray(d?.points)) strokes.push(d);
    } else if (ev.type === 'sketch.undo') {
      strokes.pop();
    } else if (ev.type === 'sketch.clear') {
      strokes.length = 0;
    }
    const label = captionFor(ev);
    if (label) frames.push({ at: ev.t - t0, label, strokes: [...strokes] });
  }
  return frames;
}

function paint(ctx: CanvasRenderingContext2D, strokes: Stroke[], w = W, h = H) {
  ctx.save();
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, w, h);
  ctx.scale(w / W, h / H);
  for (const s of strokes) drawStroke(ctx, s);
  ctx.restore();
}

/** Render one frame full size — used by the scrubber. */
export function renderFrame(canvas: HTMLCanvasElement, frame: ReplayFrame | null): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  paint(ctx, frame?.strokes ?? []);
}

/** mm:ss for a caption. */
export function stamp(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * Tile up to `max` frames into a single labelled contact sheet.
 *
 * This is what a vision model is given. One image beats N calls: the model can
 * compare panel 3 with panel 4 and see what changed, which is exactly the
 * question worth asking of a work session, and it costs one request instead of
 * a dozen.
 */
export function contactSheet(frames: ReplayFrame[], max = 9): string | null {
  const withArt = frames.filter((f) => f.strokes.length);
  if (!withArt.length) return null;

  // Evenly spaced across the session so the sheet shows progression, not just
  // the last few seconds.
  const step = Math.max(1, Math.ceil(withArt.length / max));
  const picked = withArt.filter((_, i) => i % step === 0).slice(0, max);

  const cols = Math.min(3, picked.length);
  const rows = Math.ceil(picked.length / cols);
  const cw = 460;
  const ch = Math.round((cw * H) / W);
  const pad = 26; // caption strip

  const cv = document.createElement('canvas');
  cv.width = cols * cw;
  cv.height = rows * (ch + pad);
  const ctx = cv.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#eef0f4';
  ctx.fillRect(0, 0, cv.width, cv.height);

  picked.forEach((f, i) => {
    const x = (i % cols) * cw;
    const y = Math.floor(i / cols) * (ch + pad);

    ctx.save();
    ctx.translate(x, y + pad);
    paint(ctx, f.strokes, cw, ch);
    ctx.restore();

    ctx.fillStyle = '#1e1e1e';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText(`${i + 1}. ${stamp(f.at)} — ${f.label}`, x + 8, y + 18);
    ctx.strokeStyle = '#c9ccd4';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + pad + 0.5, cw - 1, ch - 1);
  });

  return cv.toDataURL('image/jpeg', 0.82);
}
