import { Skia, type SkPath } from '@shopify/react-native-skia';

/**
 * Stroke geometry, shared by the canvas that draws it and the replay that
 * redraws it later.
 *
 * These two used to be the same code in two places on the web client, and a
 * shape drawn one way and replayed another is the kind of bug nobody catches
 * until a student says the playback looks wrong. One definition, both callers.
 */

export type Tool = 'pen' | 'line' | 'rect' | 'circle' | 'triangle' | 'arrow' | 'eraser';

export type Pt = { x: number; y: number };

/** A committed stroke as it is recorded: geometry, not pixels. */
export interface RecordedStroke {
  tool: Tool;
  color: string;
  width: number;
  /** [x, y] pairs. Freehand keeps its path; a shape keeps its two corners. */
  points: [number, number][];
}

/** The paper colour. The eraser is a fat brush of exactly this. */
export const PAPER = '#FFFFFF';

/**
 * Build the path for a shape tool from its start and current point. Called on
 * every gesture update while drawing, so shapes rubber-band as the finger
 * moves.
 */
export function buildShapePath(tool: Tool, a: Pt, b: Pt): SkPath {
  const p = Skia.Path.Make();
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const w = Math.abs(b.x - a.x);
  const h = Math.abs(b.y - a.y);

  if (tool === 'line' || tool === 'arrow') {
    p.moveTo(a.x, a.y);
    p.lineTo(b.x, b.y);
    if (tool === 'arrow') {
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      const head = 20;
      p.moveTo(b.x, b.y);
      p.lineTo(b.x - head * Math.cos(ang - Math.PI / 6), b.y - head * Math.sin(ang - Math.PI / 6));
      p.moveTo(b.x, b.y);
      p.lineTo(b.x - head * Math.cos(ang + Math.PI / 6), b.y - head * Math.sin(ang + Math.PI / 6));
    }
  } else if (tool === 'rect') {
    p.addRect(Skia.XYWHRect(x, y, w, h));
  } else if (tool === 'circle') {
    p.addOval(Skia.XYWHRect(x, y, w, h));
  } else if (tool === 'triangle') {
    p.moveTo(x + w / 2, y); // apex
    p.lineTo(x, y + h);
    p.lineTo(x + w, y + h);
    p.close();
  }
  return p;
}

/**
 * Rebuild a recorded stroke, optionally scaled — replay renders the same work
 * on a phone screen, a scrubber thumbnail and a contact-sheet panel, all
 * different sizes from the canvas it was drawn on.
 */
export function strokePath(s: RecordedStroke, scale = 1): SkPath {
  const pts = s.points ?? [];
  if (!pts.length) return Skia.Path.Make();

  const at = (i: number): Pt => ({ x: pts[i][0] * scale, y: pts[i][1] * scale });

  if (s.tool === 'pen' || s.tool === 'eraser') {
    const p = Skia.Path.Make();
    const first = at(0);
    p.moveTo(first.x, first.y);
    for (let i = 1; i < pts.length; i++) {
      const q = at(i);
      p.lineTo(q.x, q.y);
    }
    return p;
  }
  return buildShapePath(s.tool, at(0), at(pts.length - 1));
}
