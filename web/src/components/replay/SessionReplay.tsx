import { useEffect, useState } from 'react';
import { Circle, Play, Square } from 'lucide-react';
import { IconButton } from '@/components/ui/Button';
import { isObserveEnabled, onObserveChange, setObserveEnabled } from '@/lib/observe';
import { ReplayModal } from '@/components/replay/ReplayModal';
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
  const [recording, setRecording] = useState(isObserveEnabled);
  const [open, setOpen] = useState(false);

  useEffect(() => onObserveChange(setRecording), []);

  return (
    <>
      <div className="flex items-center gap-1" data-tour="record">
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

      <ReplayModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
