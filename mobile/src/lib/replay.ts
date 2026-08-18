import { Skia, BlendMode, ClipOp, PaintStyle, type SkCanvas } from '@shopify/react-native-skia';

import type { ObsEvent } from './observe';
import { PAPER, strokePath, type RecordedStroke } from './strokes';

/**
 * Session replay — and the bridge from recorded events to a vision model.
 *
 * The recorder stores what the student *did*, not pixels: far smaller, lossless,
 * and no screen-recording permission. A vision model needs an image, though,
 * and the resolution is that strokes are geometry, so any moment of a session
 * can be *redrawn* on demand. Replay is a deterministic re-render of the log.
 *
 * That buys something a screen recording cannot. Instead of sampling frames on
 * a timer and hoping the interesting instants were caught, frames are taken at
 * moments that mean something — each committed stroke, each erase, each answer
 * — and tiled into one contact sheet. A single image carries the whole
 * progression, so the model sees *how* the work developed in one call rather
 * than N calls over a video.
 *
 * Ported from the web renderer, with Skia in place of canvas 2D. One
 * deliberate difference: the web bakes captions into the sheet with fillText,
 * which on Skia would mean shipping and loading a typeface. The captions ride
 * as prompt text instead, keyed to panel numbers — same information to the
 * model, no font dependency.
 */

/** The space a contact-sheet panel is drawn in. */
const PANEL_W = 460;
const PANEL_H = 286;

export interface ReplayFrame {
  /** ms since the session's first event. */
  at: number;
  /** What happened at this instant, for the caption. */
  label: string;
  strokes: RecordedStroke[];
  /** The canvas the work was drawn on, for aspect-correct rescaling. */
  source: { w: number; h: number };
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
    case 'coach.ask':
      return 'asked for a look';
    default:
      return null;
  }
}

/**
 * Walk the log and emit one frame per meaningful moment, each carrying the
 * canvas as it stood at that instant.
 */
export function buildFrames(events: ObsEvent[]): ReplayFrame[] {
  if (!events.length) return [];
  const t0 = events[0].t;
  const strokes: RecordedStroke[] = [];
  const frames: ReplayFrame[] = [];
  // Sticky: undo and clear events carry no dimensions of their own.
  let source = { w: PANEL_W, h: PANEL_H };

  for (const ev of events) {
    if (ev.type === 'sketch.shape') {
      const d = ev.data as unknown as RecordedStroke & { w?: number; h?: number };
      if (Array.isArray(d?.points)) strokes.push(d);
      if (d?.w && d?.h) source = { w: d.w, h: d.h };
    } else if (ev.type === 'sketch.undo') {
      strokes.pop();
    } else if (ev.type === 'sketch.clear') {
      strokes.length = 0;
    }
    const label = captionFor(ev);
    if (label) frames.push({ at: ev.t - t0, label, strokes: [...strokes], source: { ...source } });
  }
  return frames;
}

/** mm:ss for a caption. */
export function stamp(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/** Paint one frame's strokes into a canvas of the given size, letterboxed. */
function paintFrame(canvas: SkCanvas, frame: ReplayFrame, w: number, h: number): void {
  const paper = Skia.Paint();
  paper.setColor(Skia.Color(PAPER));
  canvas.drawRect(Skia.XYWHRect(0, 0, w, h), paper);

  // Preserve the drawing's aspect: a portrait phone sketch squeezed into a
  // landscape panel would misrepresent the geometry the student drew.
  const scale = Math.min(w / frame.source.w, h / frame.source.h) || 1;

  for (const s of frame.strokes) {
    const paint = Skia.Paint();
    paint.setStyle(PaintStyle.Stroke);
    paint.setStrokeWidth(Math.max(1, s.width * scale));
    paint.setColor(Skia.Color(s.tool === 'eraser' ? PAPER : s.color));
    paint.setAntiAlias(true);
    // The eraser paints paper over ink, exactly as it did live.
    if (s.tool === 'eraser') paint.setBlendMode(BlendMode.Src);
    canvas.drawPath(strokePath(s, scale), paint);
  }
}

/**
 * Tile up to `max` frames into a single contact sheet, returned as a data URI
 * alongside the captions for each panel.
 *
 * One image beats N calls: the model can compare panel 3 with panel 4 and see
 * what changed, which is exactly the question worth asking of a work session,
 * and it costs one request instead of a dozen.
 */
export function contactSheet(
  frames: ReplayFrame[],
  max = 9,
): { image: string; captions: string[] } | null {
  const withArt = frames.filter((f) => f.strokes.length);
  if (!withArt.length) return null;

  // Evenly spaced across the session, so the sheet shows the progression rather
  // than just the last few seconds of it.
  const step = Math.max(1, Math.ceil(withArt.length / max));
  const picked = withArt.filter((_, i) => i % step === 0).slice(0, max);

  const cols = Math.min(3, picked.length);
  const rows = Math.ceil(picked.length / cols);

  const surface = Skia.Surface.MakeOffscreen(cols * PANEL_W, rows * PANEL_H);
  if (!surface) return null;
  const canvas = surface.getCanvas();

  const bg = Skia.Paint();
  bg.setColor(Skia.Color('#EEF0F4'));
  canvas.drawRect(Skia.XYWHRect(0, 0, cols * PANEL_W, rows * PANEL_H), bg);

  const border = Skia.Paint();
  border.setStyle(PaintStyle.Stroke);
  border.setStrokeWidth(2);
  border.setColor(Skia.Color('#C9CCD4'));

  picked.forEach((f, i) => {
    const x = (i % cols) * PANEL_W;
    const y = Math.floor(i / cols) * PANEL_H;
    canvas.save();
    canvas.translate(x, y);
    // Inset so neighbouring panels stay visually separate.
    canvas.clipRect(Skia.XYWHRect(4, 4, PANEL_W - 8, PANEL_H - 8), ClipOp.Intersect, true);
    canvas.translate(4, 4);
    paintFrame(canvas, f, PANEL_W - 8, PANEL_H - 8);
    canvas.restore();
    canvas.drawRect(Skia.XYWHRect(x + 4, y + 4, PANEL_W - 8, PANEL_H - 8), border);
  });

  const image = surface.makeImageSnapshot();
  const base64 = image.encodeToBase64();

  return {
    image: `data:image/png;base64,${base64}`,
    captions: picked.map((f, i) => `${i + 1}. ${stamp(f.at)} — ${f.label}`),
  };
}

/**
 * The prompt that goes with the sheet.
 *
 * The panels are numbered but unlabelled, so the ordering and timing have to be
 * stated in words. Being explicit that the panels are one student's work over
 * time — not several students, not alternatives — is what stops the model
 * describing them as separate images.
 */
export function contactSheetPrompt(captions: string[], problem?: string): string {
  return [
    `This is one student's work on a single problem, over time.`,
    `The image is a grid of ${captions.length} panels, left to right, top to bottom, in chronological order:`,
    captions.join('\n'),
    problem ? `\nThe problem they are working on: ${problem}` : '',
    `\nLook at how the work develops from panel to panel. Find the first place it goes wrong,`,
    `and ask one question that would get them to notice it themselves. Do not give the answer.`,
  ]
    .filter(Boolean)
    .join('\n');
}
