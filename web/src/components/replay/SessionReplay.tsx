import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Circle, Eye, Pause, Play, Square, Trash2 } from 'lucide-react';
import { Button, IconButton } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { RichText } from '@/components/ui/RichText';
import {
  clearRecording,
  isObserveEnabled,
  onObserveChange,
  recordedEvents,
  setObserveEnabled,
} from '@/lib/observe';
import { buildFrames, contactSheet, renderFrame, stamp, type ReplayFrame } from '@/lib/replay';
import { seeWork } from '@/lib/api';
import { useSettings } from '@/state/settings';
import { t } from '@/i18n/strings';
import { cn } from '@/lib/utils';

/**
 * The recording control and session replay.
 *
 * Recording is a visible, switchable thing rather than something that silently
 * happens — a student (or a teacher watching) should be able to see that the
 * session is being observed and stop it.
 *
 * Replay redraws the canvas from the recorded stroke geometry, so scrubbing is
 * a re-render rather than video playback. "Show Sensei" turns the same frames
 * into one labelled contact sheet and sends it to the vision endpoint: the
 * model sees how the work developed, not just where it ended up.
 */
export function SessionReplay() {
  const { language } = useSettings();
  const [recording, setRecording] = useState(isObserveEnabled);
  const [open, setOpen] = useState(false);

  useEffect(() => onObserveChange(setRecording), []);

  return (
    <>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setObserveEnabled(!recording)}
          title={recording ? t.replay.stopHint : t.replay.startHint}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-2xs font-medium transition-colors',
            recording
              ? 'border-danger/40 bg-danger-bg text-danger-text'
              : 'border-line bg-surface text-ink-muted hover:text-ink',
          )}
        >
          {recording ? (
            <>
              <Circle size={9} className="animate-pulse fill-current" />
              {t.replay.recording}
            </>
          ) : (
            <>
              <Square size={9} className="fill-current" />
              {t.replay.paused}
            </>
          )}
        </button>
        <IconButton label={t.replay.open} onClick={() => setOpen(true)}>
          <Play size={15} />
        </IconButton>
      </div>

      <ReplayModal open={open} onClose={() => setOpen(false)} language={language} />
    </>
  );
}

function ReplayModal({
  open,
  onClose,
  language,
}: {
  open: boolean;
  onClose: () => void;
  language: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [frames, setFrames] = useState<ReplayFrame[]>([]);
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Snapshot the log when the dialog opens, so the timeline does not shift
  // under the scrubber while the student keeps working behind it.
  useEffect(() => {
    if (!open) return;
    const f = buildFrames(recordedEvents());
    setFrames(f);
    setI(Math.max(0, f.length - 1));
    setPlaying(false);
    setNote(null);
  }, [open]);

  useEffect(() => {
    if (canvasRef.current) renderFrame(canvasRef.current, frames[i] ?? null);
  }, [frames, i]);

  useEffect(() => {
    if (!playing || !frames.length) return;
    const id = window.setInterval(() => {
      setI((prev) => {
        if (prev + 1 >= frames.length) {
          setPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 700);
    return () => window.clearInterval(id);
  }, [playing, frames.length]);

  const sheet = useMemo(() => (open && frames.length ? contactSheet(frames) : null), [open, frames]);

  const showSensei = useCallback(async () => {
    if (!sheet) return;
    setBusy(true);
    setNote(null);
    try {
      const r = await seeWork(sheet, t.replay.visionPrompt, language);
      setNote(r.note ?? t.replay.visionFailed);
    } catch {
      setNote(t.replay.visionFailed);
    } finally {
      setBusy(false);
    }
  }, [sheet, language]);

  const frame = frames[i];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t.replay.title}
      description={t.replay.subtitle}
      width="max-w-3xl"
      footer={
        <>
          <Button
            variant="ghost"
            onClick={() => {
              clearRecording();
              setFrames([]);
              setNote(null);
            }}
            disabled={!frames.length}
          >
            <Trash2 size={15} />
            {t.replay.clear}
          </Button>
          <Button onClick={() => void showSensei()} disabled={!sheet || busy}>
            <Eye size={15} />
            {busy ? t.replay.looking : t.replay.showSensei}
          </Button>
        </>
      }
    >
      {!frames.length ? (
        <p className="py-10 text-center text-[13.5px] text-ink-muted">{t.replay.empty}</p>
      ) : (
        <div className="space-y-3">
          <div className="overflow-hidden rounded-xl border border-line bg-white">
            <canvas ref={canvasRef} width={900} height={560} className="block w-full" />
          </div>

          <div className="flex items-center gap-3">
            <IconButton
              label={playing ? t.tutor.stop : t.replay.play}
              onClick={() => setPlaying((p) => !p)}
            >
              {playing ? <Pause size={16} /> : <Play size={16} />}
            </IconButton>
            <input
              type="range"
              min={0}
              max={frames.length - 1}
              value={i}
              onChange={(e) => {
                setPlaying(false);
                setI(Number(e.target.value));
              }}
              aria-label={t.replay.title}
              className="h-1.5 flex-1 accent-[rgb(var(--s-accent))]"
            />
            <span className="w-28 shrink-0 truncate text-right text-2xs tabular-nums text-ink-muted">
              {frame ? `${stamp(frame.at)} · ${frame.label}` : ''}
            </span>
          </div>

          <p className="text-2xs text-ink-faint">{t.replay.frameCount(frames.length)}</p>

          {note ? (
            <div className="rounded-xl border border-accent/30 bg-accent-soft/40 p-4">
              <p className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-accent">
                {t.replay.senseiSaw}
              </p>
              <RichText className="text-[13px] text-ink-soft">{note}</RichText>
            </div>
          ) : null}
        </div>
      )}
    </Modal>
  );
}
