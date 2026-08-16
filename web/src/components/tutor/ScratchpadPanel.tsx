import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Circle as CircleIcon,
  Download,
  Eraser,
  Minus,
  Pencil,
  Square as SquareIcon,
  Triangle as TriangleIcon,
  Undo2,
} from 'lucide-react';
import { Button, IconButton } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
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

export function ScratchpadPanel({
  open,
  onClose,
  onAsk,
}: {
  open: boolean;
  onClose: () => void;
  onAsk: (message: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState(COLORS[0]);
  const [width, setWidth] = useState(WIDTHS[1]);

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

  useEffect(() => {
    if (open) return;
    // Reset when closed so the next open is a fresh page.
    setShapes([]);
    draftRef.current = null;
  }, [open]);

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
  };

  const undo = () => setShapes((s) => s.slice(0, -1));
  const clear = () => {
    if (shapes.length && !window.confirm(t.scratch.clearConfirm)) return;
    setShapes([]);
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
    onAsk(t.scratch.sendNote);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t.scratch.title}
      description={t.scratch.subtitle}
      width="max-w-3xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button variant="secondary" onClick={download} disabled={!shapes.length}>
            <Download size={15} />
            {t.scratch.download}
          </Button>
          <Button onClick={ask} disabled={!shapes.length}>
            {t.scratch.send}
          </Button>
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

          <div className="ml-auto flex items-center gap-1">
            <IconButton label={t.scratch.undo} onClick={undo} disabled={!shapes.length}>
              <Undo2 size={16} />
            </IconButton>
            <IconButton label={t.scratch.clear} onClick={clear} disabled={!shapes.length}>
              <Eraser size={16} />
            </IconButton>
          </div>
        </div>

        {/* canvas */}
        <div className="overflow-hidden rounded-xl border border-line bg-white shadow-inner">
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerLeave={onUp}
            className="block aspect-[900/560] w-full touch-none"
            style={{ cursor: 'crosshair' }}
          />
        </div>

        <p className="text-2xs leading-relaxed text-ink-faint">{t.scratch.notWired}</p>
      </div>
    </Modal>
  );
}
