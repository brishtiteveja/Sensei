import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Circle as CircleIcon,
  Download,
  Eraser,
  Maximize2,
  Minus,
  Pencil,
  Plus,
  Smartphone,
  Square as SquareIcon,
  Triangle as TriangleIcon,
  Undo2,
} from 'lucide-react';
import { Button, IconButton } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { PhoneHandoff } from '@/components/tutor/PhoneHandoff';
import { observe } from '@/lib/observe';
import { readJSON, removeKey, writeJSON } from '@/lib/storage';
import { t } from '@/i18n/strings';
import { cn } from '@/lib/utils';

/**
 * A drawing scratchpad with a geometry toolbox — freehand pen plus straight
 * lines, rectangles, circles, triangles and arrows — for sketching diagrams
 * and working. Mirrors the phone app's canvas tool.
 *
 * Shapes are kept as a list and the whole canvas is redrawn on each change, so
 * undo is just "drop the last shape" and export is a clean re-render. The
 * canvas paints on white paper regardless of theme so a saved PNG reads the
 * same everywhere and the eraser can simply paint white.
 *
 * The tutor is text-only on this server, so "Ask Sensei about this" saves the
 * PNG locally and sends a described prompt — the same honest behaviour as the
 * image-upload panel until a vision route exists.
 */

type Tool = 'pen' | 'line' | 'rect' | 'circle' | 'triangle' | 'arrow' | 'eraser';
type Pt = { x: number; y: number };
interface Shape {
  tool: Tool;
  color: string;
  width: number;
  points: Pt[];
}

const W = 900;
const H = 560;
const PAPER = '#ffffff';

const COLORS = ['#1e1e1e', '#e5484d', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6'];
const WIDTHS = [2, 4, 7];

type LabelKey = 'pen' | 'line' | 'rectangle' | 'circle' | 'triangle' | 'arrow' | 'eraser';
const TOOLS: { tool: Tool; icon: typeof Pencil; key: LabelKey }[] = [
  { tool: 'pen', icon: Pencil, key: 'pen' },
  { tool: 'line', icon: Minus, key: 'line' },
  { tool: 'rect', icon: SquareIcon, key: 'rectangle' },
  { tool: 'circle', icon: CircleIcon, key: 'circle' },
  { tool: 'triangle', icon: TriangleIcon, key: 'triangle' },
  { tool: 'arrow', icon: ArrowUpRight, key: 'arrow' },
  { tool: 'eraser', icon: Eraser, key: 'eraser' },
];

function drawShape(ctx: CanvasRenderingContext2D, s: Shape) {
  const pts = s.points;
  if (!pts.length) return;
  ctx.strokeStyle = s.tool === 'eraser' ? PAPER : s.color;
  ctx.fillStyle = ctx.strokeStyle;
  ctx.lineWidth = s.tool === 'eraser' ? Math.max(s.width * 4, 16) : s.width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (s.tool === 'pen' || s.tool === 'eraser') {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
    return;
  }

  const a = pts[0];
  const b = pts[pts.length - 1];

  if (s.tool === 'line') {
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    return;
  }

  if (s.tool === 'arrow') {
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    const head = Math.max(10, s.width * 3);
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(b.x - head * Math.cos(ang - Math.PI / 6), b.y - head * Math.sin(ang - Math.PI / 6));
    ctx.lineTo(b.x - head * Math.cos(ang + Math.PI / 6), b.y - head * Math.sin(ang + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
    return;
  }

  if (s.tool === 'rect') {
    ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
    return;
  }

  if (s.tool === 'circle') {
    ctx.beginPath();
    ctx.ellipse(
      (a.x + b.x) / 2,
      (a.y + b.y) / 2,
      Math.abs(b.x - a.x) / 2,
      Math.abs(b.y - a.y) / 2,
      0,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
    return;
  }

  if (s.tool === 'triangle') {
    const x1 = Math.min(a.x, b.x);
    const x2 = Math.max(a.x, b.x);
    const yTop = Math.min(a.y, b.y);
    const yBot = Math.max(a.y, b.y);
    ctx.beginPath();
    ctx.moveTo((x1 + x2) / 2, yTop); // apex
    ctx.lineTo(x1, yBot);
    ctx.lineTo(x2, yBot);
    ctx.closePath();
    ctx.stroke();
  }
}

const ZOOMS = [1, 1.5, 2, 3];

/** Keep at most `max` evenly spaced points, always including the last one. */
function decimate(pts: Pt[], max: number): Pt[] {
  if (pts.length <= max) return pts;
  const step = (pts.length - 1) / (max - 1);
  return Array.from({ length: max }, (_, i) => pts[Math.round(i * step)]);
}

export function ScratchpadPanel({
  open,
  onClose,
  onAsk,
  onInsert,
  insertLabel,
  draftKey = 'scratch.draft',
  title,
}: {
  open: boolean;
  onClose: () => void;
  /** Tutor mode: send a described prompt (server has no vision route). */
  onAsk?: (message: string) => void;
  /** Notebook/chat mode: hand back the drawing as a PNG data URI. */
  onInsert?: (pngDataUri: string) => void;
  /** Label for the insert action — where the drawing is going. */
  insertLabel?: string;
  /** Storage slot for the unfinished drawing; per-surface so they don't collide. */
  draftKey?: string;
  title?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState(COLORS[0]);
  const [width, setWidth] = useState(WIDTHS[1]);
  const [zoom, setZoom] = useState(1);
  const [phoneOpen, setPhoneOpen] = useState(false);

  // Refs so the pointer handlers never read stale tool/colour/width.
  const draftRef = useRef<Shape | null>(null);
  const drawingRef = useRef(false);

  const repaint = useCallback(
    (draft?: Shape | null) => {
      const cv = canvasRef.current;
      const ctx = cv?.getContext('2d');
      if (!cv || !ctx) return;
      ctx.fillStyle = PAPER;
      ctx.fillRect(0, 0, W, H);
      for (const s of shapes) drawShape(ctx, s);
      if (draft) drawShape(ctx, draft);
    },
    [shapes],
  );

  useEffect(() => {
    if (open) repaint();
  }, [open, repaint]);

  // Restore an unfinished drawing. Closing the dialog by mis-clicking the
  // backdrop used to throw the work away; now only inserting or an explicit
  // Clear ends a drawing, and it even survives a reload.
  useEffect(() => {
    if (!open) return;
    setZoom(1);
    draftRef.current = null;
    setShapes(readJSON<Shape[]>(draftKey, []));
  }, [open, draftKey]);

  useEffect(() => {
    if (!open) return;
    writeJSON(draftKey, shapes);
  }, [open, shapes, draftKey]);

  // getBoundingClientRect reflects the zoomed on-screen size, so mapping a
  // pointer through the rect's ratio lands on the right canvas pixel at any
  // zoom — the scroll position is baked into rect.left/top for free.
  const toCanvas = (e: React.PointerEvent): Pt => {
    const cv = canvasRef.current!;
    const r = cv.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  };

  const onDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    const p = toCanvas(e);
    draftRef.current = { tool, color, width, points: [p] };
    repaint(draftRef.current);
  };

  const onMove = (e: React.PointerEvent) => {
    if (!drawingRef.current || !draftRef.current) return;
    const p = toCanvas(e);
    const d = draftRef.current;
    // Freehand accumulates points; shapes only need start + current.
    d.points = d.tool === 'pen' || d.tool === 'eraser' ? [...d.points, p] : [d.points[0], p];
    repaint(d);
  };

  const onUp = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const d = draftRef.current;
    draftRef.current = null;
    if (!d) return;
    // Ignore an accidental dot from a shape tool (click without drag).
    if (d.tool !== 'pen' && d.tool !== 'eraser' && d.points.length < 2) {
      repaint();
      return;
    }
    setShapes((prev) => [...prev, d]);
    // The tutor teaches against what was actually drawn, so each committed
    // stroke is reported — not the intermediate drag.
    // The geometry, not just a count: replay redraws the canvas from these, and
    // the frames it renders are what a vision model is later shown. Freehand is
    // decimated because a 400-point scribble replays identically at 60.
    observe('sketch.shape', {
      tool: d.tool,
      color: d.color,
      width: d.width,
      points: decimate(d.points, 60).map((p) => [Math.round(p.x), Math.round(p.y)]),
    });
  };

  const undo = () => {
    setShapes((s) => s.slice(0, -1));
    observe('sketch.undo');
  };
  const clear = () => {
    if (shapes.length && !window.confirm(t.scratch.clearConfirm)) return;
    setShapes([]);
    removeKey(draftKey);
    observe('sketch.clear');
  };

  const download = () => {
    const cv = canvasRef.current;
    if (!cv) return;
    const a = document.createElement('a');
    a.href = cv.toDataURL('image/png');
    a.download = 'sensei-sketch.png';
    a.click();
  };

  const ask = () => {
    if (!shapes.length) return;
    download(); // keep a copy in front of the student
    onAsk?.(t.scratch.sendNote);
    onClose();
  };

  const insert = () => {
    const cv = canvasRef.current;
    if (!cv || !shapes.length) return;
    onInsert?.(cv.toDataURL('image/png'));
    setShapes([]);
    removeKey(draftKey);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title ?? t.scratch.title}
      description={t.scratch.subtitle}
      width="max-w-3xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
          {/* Saving a PNG is the side errand, so it stays a quiet ghost button.
              The primary action is putting the drawing where it gets used. */}
          <Button variant="ghost" onClick={download} disabled={!shapes.length} title={t.scratch.download}>
            <Download size={15} />
          </Button>
          {onInsert ? (
            <Button onClick={insert} disabled={!shapes.length}>
              {insertLabel ?? t.scratch.insert}
            </Button>
          ) : (
            <Button onClick={ask} disabled={!shapes.length}>
              {t.scratch.send}
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-3">
        {/* tool + colour + width bar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg border border-line bg-surface-alt p-1">
            {TOOLS.map(({ tool: tl, icon: Icon, key }) => (
              <button
                key={tl}
                type="button"
                aria-label={t.scratch[key]}
                title={t.scratch[key]}
                aria-pressed={tool === tl}
                onClick={() => setTool(tl)}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-md transition-colors',
                  tool === tl ? 'bg-accent text-white shadow-soft' : 'text-ink-soft hover:bg-surface',
                )}
              >
                <Icon size={16} />
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5" role="group" aria-label={t.scratch.color}>
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={c}
                aria-pressed={color === c}
                onClick={() => setColor(c)}
                style={{ background: c }}
                className={cn(
                  'h-6 w-6 rounded-full ring-offset-2 ring-offset-surface transition',
                  color === c ? 'ring-2 ring-accent' : 'ring-1 ring-line',
                )}
              />
            ))}
          </div>

          <div className="flex items-center gap-1" role="group" aria-label={t.scratch.width}>
            {WIDTHS.map((w) => (
              <button
                key={w}
                type="button"
                aria-label={`${w}px`}
                aria-pressed={width === w}
                onClick={() => setWidth(w)}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-md border transition-colors',
                  width === w ? 'border-accent bg-accent-soft' : 'border-line hover:bg-surface-alt',
                )}
              >
                <span className="rounded-full bg-ink" style={{ width: w + 2, height: w + 2 }} />
              </button>
            ))}
          </div>

          {/* zoom */}
          <div className="flex items-center gap-1 rounded-lg border border-line bg-surface-alt p-0.5">
            <IconButton
              label={t.scratch.zoomOut}
              onClick={() => setZoom((z) => Math.max(ZOOMS[0], z - 0.5))}
              disabled={zoom <= ZOOMS[0]}
            >
              <Minus size={15} />
            </IconButton>
            <button
              type="button"
              onClick={() => setZoom(1)}
              className="w-11 text-center text-2xs font-semibold tabular-nums text-ink-soft hover:text-ink"
              title={t.scratch.zoomFit}
            >
              {Math.round(zoom * 100)}%
            </button>
            <IconButton
              label={t.scratch.zoomIn}
              onClick={() => setZoom((z) => Math.min(ZOOMS[ZOOMS.length - 1], z + 0.5))}
              disabled={zoom >= ZOOMS[ZOOMS.length - 1]}
            >
              <Plus size={15} />
            </IconButton>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              onClick={() => setPhoneOpen((v) => !v)}
              className="h-8 px-2.5"
              title={t.phone.drawTitle}
            >
              <Smartphone size={15} />
              <span className="hidden sm:inline">{t.phone.usePhone}</span>
            </Button>
            <IconButton label={t.scratch.undo} onClick={undo} disabled={!shapes.length}>
              <Undo2 size={16} />
            </IconButton>
            <IconButton label={t.scratch.clear} onClick={clear} disabled={!shapes.length}>
              <Eraser size={16} />
            </IconButton>
          </div>
        </div>

        {phoneOpen ? (
          <PhoneHandoff
            mode="draw"
            onClose={() => setPhoneOpen(false)}
            // A drawing done on the phone is already the finished thing, so it
            // goes straight where this panel was going to send it.
            onImage={(dataUri) => {
              setPhoneOpen(false);
              if (onInsert) {
                onInsert(dataUri);
                onClose();
              } else {
                onAsk?.(t.scratch.sendNote);
                onClose();
              }
            }}
          />
        ) : null}

        {/* canvas — scrolls within a fixed viewport once zoomed past 100% */}
        <div
          ref={scrollRef}
          className="s-scroll max-h-[58vh] overflow-auto rounded-xl border border-line bg-white shadow-inner"
        >
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerLeave={onUp}
            className="block aspect-[900/560] touch-none"
            style={{ width: `${zoom * 100}%`, cursor: 'crosshair' }}
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-2xs leading-relaxed text-ink-faint">
            {onInsert ? t.scratch.notWiredNotebook : t.scratch.notWired}
          </p>
          {zoom > 1 ? (
            <button
              type="button"
              onClick={() => setZoom(1)}
              className="inline-flex shrink-0 items-center gap-1 text-2xs font-medium text-ink-faint hover:text-ink"
            >
              <Maximize2 size={11} />
              {t.scratch.zoomFit}
            </button>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
