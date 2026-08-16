import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Eye, Pause, Play, Trash2 } from 'lucide-react';
import { Button, IconButton } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { RichText } from '@/components/ui/RichText';
import { buildFrames, contactSheet, renderFrame, stamp, type ReplayFrame } from '@/lib/replay';
import { deleteAttempt, getAttempt } from '@/lib/attempts';
import { recordedEvents } from '@/lib/observe';
import { seeWork } from '@/lib/api';
import { useSettings } from '@/state/settings';
import { t } from '@/i18n/strings';

/**
 * Plays one recording back and, on request, shows it to a vision model.
 *
 * With an `attemptId` it replays that sitting; without one it falls back to
 * whatever is in the live recorder, which is what the standalone control uses.
 * Playback is a re-render from stored stroke geometry rather than video, so
 * scrubbing is exact at any size.
 */
export function ReplayModal({
  open,
  onClose,
  attemptId,
}: {
  open: boolean;
  onClose: () => void;
  attemptId?: string | null;
}) {
  const { language } = useSettings();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [frames, setFrames] = useState<ReplayFrame[]>([]);
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Snapshot when the dialog opens so the timeline cannot shift under the
  // scrubber while work continues behind it.
  useEffect(() => {
    if (!open) return;
    const events = attemptId ? (getAttempt(attemptId)?.events ?? []) : recordedEvents();
    const f = buildFrames(events);
    setFrames(f);
    setI(Math.max(0, f.length - 1));
    setPlaying(false);
    setNote(null);
  }, [open, attemptId]);

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
          {attemptId ? (
            <Button
              variant="ghost"
              onClick={() => {
                deleteAttempt(attemptId);
                setFrames([]);
                onClose();
              }}
            >
              <Trash2 size={15} />
              {t.replay.clear}
            </Button>
          ) : null}
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
