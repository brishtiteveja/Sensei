import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, Eraser, ImageUp, Send, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { SenseiOwl } from '@/components/art/SenseiOwl';
import { fileToDownscaledDataUri } from '@/lib/image';
import { sendHandoff, type HandoffMode } from '@/lib/handoff';
import { t } from '@/i18n/strings';
import { cn } from '@/lib/utils';

/**
 * The page the phone opens after scanning the desktop's QR.
 *
 * Deliberately standalone — no app shell, no sidebar, nothing to navigate. One
 * job: draw or photograph something and send it to the waiting desktop. Sized
 * for a thumb, and finger drawing is the whole point, so the canvas is big and
 * `touch-none` keeps a stroke from scrolling the page.
 */
export function HandoffPage() {
  const [params] = useSearchParams();
  const code = params.get('c') ?? '';
  const mode = (params.get('m') as HandoffMode) || 'draw';

  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(
    async (dataUri: string, kind: 'sketch' | 'image') => {
      if (!code) {
        setError(t.phone.noCode);
        return;
      }
      setBusy(true);
      setError(null);
      try {
        await sendHandoff(code, dataUri, kind);
        setSent(true);
      } catch {
        setError(t.phone.sendFailed);
      } finally {
        setBusy(false);
      }
    },
    [code],
  );

  if (sent) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-success-bg text-success-text">
            <Check size={26} />
          </span>
          <p className="text-lg font-semibold text-ink">{t.phone.sentTitle}</p>
          <p className="max-w-xs text-[13.5px] text-ink-muted">{t.phone.sentBody}</p>
          <Button variant="secondary" onClick={() => setSent(false)} className="mt-2">
            {t.phone.sendAnother}
          </Button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      {error ? (
        <p role="alert" className="mb-3 text-[13px] font-medium text-danger-text">
          {error}
        </p>
      ) : null}
      {mode === 'photo' ? (
        <PhotoPane busy={busy} onSend={(uri) => void send(uri, 'image')} />
      ) : (
        <DrawPane busy={busy} onSend={(uri) => void send(uri, 'sketch')} />
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-page px-4 py-5">
      <div className="mx-auto max-w-lg">
        <div className="mb-4 flex items-center gap-2.5">
          <SenseiOwl size={30} />
          <div>
            <p className="text-[15px] font-semibold text-ink">{t.app.name}</p>
            <p className="text-2xs text-ink-muted">{t.phone.header}</p>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

function PhotoPane({ busy, onSend }: { busy: boolean; onSend: (uri: string) => void }) {
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const accept = async (file: File | undefined | null) => {
    if (!file) return;
    try {
      setPreview(await fileToDownscaledDataUri(file));
    } catch {
      /* handled by the parent's error slot on send */
    }
  };

  return (
    <div className="space-y-4">
      {preview ? (
        <div className="overflow-hidden rounded-xl border border-line bg-white">
          <img src={preview} alt="" className="mx-auto max-h-[60dvh] w-auto" />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed border-line bg-surface-alt/60 px-6 py-16"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-surface text-accent shadow-soft">
            <ImageUp size={24} />
          </span>
          <span className="text-[15px] font-medium text-ink">{t.phone.takePhoto}</span>
          <span className="text-2xs text-ink-muted">{t.handwriting.accepted}</span>
        </button>
      )}
      {/* `capture` opens the camera directly on a phone; without it you get the
          picker, which is the right fallback on a laptop. */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => void accept(e.target.files?.[0])}
      />
      <div className="flex gap-2">
        {preview ? (
          <Button variant="secondary" onClick={() => setPreview(null)} className="flex-1">
            {t.phone.retake}
          </Button>
        ) : null}
        <Button
          onClick={() => preview && onSend(preview)}
          disabled={!preview || busy}
          className="flex-1"
        >
          <Send size={15} />
          {busy ? t.phone.sending : t.phone.send}
        </Button>
      </div>
    </div>
  );
}

const COLORS = ['#1e1e1e', '#e5484d', '#3b82f6', '#22c55e'];
const W = 1000;
const H = 1400;

function DrawPane({ busy, onSend }: { busy: boolean; onSend: (uri: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [strokes, setStrokes] = useState<{ color: string; width: number; pts: { x: number; y: number }[] }[]>(
    [],
  );
  const [color, setColor] = useState(COLORS[0]);
  const drawing = useRef(false);
  const draft = useRef<{ color: string; width: number; pts: { x: number; y: number }[] } | null>(null);

  const repaint = useCallback(
    (extra?: typeof draft.current) => {
      const cv = canvasRef.current;
      const ctx = cv?.getContext('2d');
      if (!cv || !ctx) return;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, W, H);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const s of [...strokes, ...(extra ? [extra] : [])]) {
        if (!s.pts.length) continue;
        ctx.strokeStyle = s.color;
        ctx.lineWidth = s.width;
        ctx.beginPath();
        ctx.moveTo(s.pts[0].x, s.pts[0].y);
        for (let i = 1; i < s.pts.length; i++) ctx.lineTo(s.pts[i].x, s.pts[i].y);
        ctx.stroke();
      }
    },
    [strokes],
  );

  useEffect(() => repaint(), [repaint]);

  const at = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={c}
            onClick={() => setColor(c)}
            style={{ background: c }}
            className={cn(
              'h-9 w-9 rounded-full ring-offset-2 ring-offset-page',
              color === c ? 'ring-2 ring-accent' : 'ring-1 ring-line',
            )}
          />
        ))}
        <div className="ml-auto flex gap-1.5">
          <Button
            variant="ghost"
            onClick={() => setStrokes((s) => s.slice(0, -1))}
            disabled={!strokes.length}
            className="h-9 px-2.5"
          >
            <Undo2 size={16} />
          </Button>
          <Button
            variant="ghost"
            onClick={() => setStrokes([])}
            disabled={!strokes.length}
            className="h-9 px-2.5"
          >
            <Eraser size={16} />
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-white">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="block w-full touch-none"
          style={{ aspectRatio: `${W}/${H}` }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            drawing.current = true;
            draft.current = { color, width: 6, pts: [at(e)] };
            repaint(draft.current);
          }}
          onPointerMove={(e) => {
            if (!drawing.current || !draft.current) return;
            draft.current.pts.push(at(e));
            repaint(draft.current);
          }}
          onPointerUp={() => {
            if (!drawing.current) return;
            drawing.current = false;
            const d = draft.current;
            draft.current = null;
            if (d && d.pts.length > 1) setStrokes((s) => [...s, d]);
          }}
        />
      </div>

      <Button
        onClick={() => canvasRef.current && onSend(canvasRef.current.toDataURL('image/png'))}
        disabled={!strokes.length || busy}
        className="w-full"
      >
        <Send size={15} />
        {busy ? t.phone.sending : t.phone.send}
      </Button>
    </div>
  );
}
