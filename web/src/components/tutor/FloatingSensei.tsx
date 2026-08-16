import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, MessageCircleQuestion, X } from 'lucide-react';
import { SenseiOwl } from '@/components/art/SenseiOwl';
import { RichText } from '@/components/ui/RichText';
import { Button } from '@/components/ui/Button';
import { coachWork, type CoachResult } from '@/lib/api';
import { observe } from '@/lib/observe';
import { useSettings } from '@/state/settings';
import { t } from '@/i18n/strings';
import { cn } from '@/lib/utils';

/**
 * Sensei, watching over your shoulder while you work.
 *
 * The owl sits beside the work surface and reacts as you go, so the tutor reads
 * as present rather than as a form you submit to. Tapping it takes a snapshot
 * of whatever you have drawn and runs the two-stage pipeline: read the page,
 * then ask one question about it. The reply lands in a speech bubble next to
 * your working rather than in a chat somewhere else.
 *
 * `getImage` is a callback rather than a prop so the owl never holds a stale
 * canvas: it asks for the pixels at the instant it is tapped.
 */
export function FloatingSensei({
  getImage,
  problem,
  className,
  onOpenChat,
}: {
  getImage: () => string | null | Promise<string | null>;
  problem?: string;
  className?: string;
  /** Escalate from the one-line nudge into a full conversation. */
  onOpenChat?: (message: string) => void;
}) {
  const { language } = useSettings();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CoachResult | null>(null);
  const [nudge, setNudge] = useState(false);
  const idleRef = useRef<number | null>(null);

  // A small bob whenever the student does something, so the owl feels like it
  // is following along. Purely a tell that it is watching -- no request is made.
  useEffect(() => {
    const bob = () => {
      setNudge(true);
      window.setTimeout(() => setNudge(false), 700);
    };
    window.addEventListener('sensei:activity', bob);
    return () => window.removeEventListener('sensei:activity', bob);
  }, []);

  useEffect(
    () => () => {
      if (idleRef.current) window.clearTimeout(idleRef.current);
    },
    [],
  );

  const ask = useCallback(async () => {
    if (busy) return;
    const image = await getImage();
    if (!image) return;
    setBusy(true);
    setResult(null);
    observe('coach.ask', { problem: problem?.slice(0, 80) });
    try {
      const r = await coachWork(image, problem, language);
      setResult(r);
      if (r.coach) observe('coach.reply', { status: r.coach.status, hint: r.coach.hint });
    } catch {
      setResult({ reading: null, coach: null, reason: t.coach.failed });
    } finally {
      setBusy(false);
    }
  }, [getImage, busy, problem, language]);

  const coach = result?.coach;
  const tone =
    coach?.status === 'correct' ? 'success' : coach?.status === 'error' ? 'warning' : 'accent';

  return (
    <div className={cn('pointer-events-none absolute bottom-4 left-4 z-20 flex items-end gap-3', className)}>
      <button
        type="button"
        onClick={() => void ask()}
        disabled={busy}
        aria-label={t.coach.ask}
        title={t.coach.ask}
        className={cn(
          'pointer-events-auto relative shrink-0 rounded-2xl transition-transform duration-500 ease-smooth',
          'hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
          nudge && 'animate-float',
          busy && 'opacity-90',
        )}
      >
        <SenseiOwl size={54} className="shadow-glow-sm rounded-2xl" />
        <span
          className={cn(
            'absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-white shadow-soft',
            busy ? 'bg-accent' : 'bg-accent/90',
          )}
        >
          {busy ? (
            <Loader2 size={11} className="animate-spin" />
          ) : (
            <MessageCircleQuestion size={11} />
          )}
        </span>
      </button>

      {busy || coach || result?.reason ? (
        <div
          className={cn(
            'pointer-events-auto max-w-sm animate-fade-up rounded-2xl rounded-bl-sm border p-3.5 shadow-card backdrop-blur',
            tone === 'success' && 'border-success/35 bg-success-bg/95',
            tone === 'warning' && 'border-warning/40 bg-warning-bg/95',
            tone === 'accent' && 'border-accent/30 bg-surface/95',
          )}
        >
          {busy ? (
            <p className="text-[13px] text-ink-muted">{t.coach.looking}</p>
          ) : coach ? (
            <div className="space-y-2">
              <RichText className="text-[13.5px] font-medium leading-snug text-ink">
                {coach.hint}
              </RichText>
              {coach.focus ? (
                <p className="text-2xs uppercase tracking-wide text-ink-faint">
                  {t.coach.lookAt}: {coach.focus}
                </p>
              ) : null}
              {coach.question ? (
                <RichText className="text-[13px] leading-relaxed text-ink-soft">
                  {coach.question}
                </RichText>
              ) : null}
              <div className="flex items-center gap-2 pt-0.5">
                {onOpenChat && coach.question ? (
                  <Button
                    variant="secondary"
                    className="h-7 px-2.5 text-2xs"
                    onClick={() => onOpenChat(coach.question)}
                  >
                    {t.coach.discuss}
                  </Button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setResult(null)}
                  aria-label={t.common.close}
                  className="ml-auto text-ink-faint hover:text-ink"
                >
                  <X size={13} />
                </button>
              </div>
            </div>
          ) : (
            <p className="text-[13px] text-ink-muted">{result?.reason}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

/** Tell any mounted owl that the student just did something. */
export function pokeSensei(): void {
  window.dispatchEvent(new Event('sensei:activity'));
}
