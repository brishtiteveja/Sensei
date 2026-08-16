import { useCallback, useEffect, useRef, useState } from 'react';
import { Eye, Loader2, Send, Sparkles, X } from 'lucide-react';
import { SenseiOwl } from '@/components/art/SenseiOwl';
import { RichText } from '@/components/ui/RichText';
import { Button, IconButton } from '@/components/ui/Button';
import { coachWork, seeWork } from '@/lib/api';
import { useTutorChat } from '@/hooks/useTutorChat';
import { digest, observe } from '@/lib/observe';
import { activeSurface, onSurfaceChange, type Surface } from '@/lib/senseiSurface';
import { readRaw, writeRaw } from '@/lib/storage';
import { useSettings } from '@/state/settings';
import { t } from '@/i18n/strings';
import { cn } from '@/lib/utils';

/**
 * Sensei as a presence, not a page.
 *
 * One owl, mounted in the shell, follows the student everywhere and can be
 * dragged wherever it is least in the way (its position persists). Tapping it
 * opens a conversation — and the conversation is *per problem*: each problem
 * gets its own thread, the way you would start a new chat per topic, so asking
 * about friction never drags in yesterday's algebra.
 *
 * "Look at my work" is the shortcut that matters: it snapshots whatever surface
 * is currently registered and runs the two-stage pipeline, dropping the reading
 * into this thread so the follow-up conversation already knows what is on the page.
 */

const POS_KEY = 'owl.pos';

export function GlobalSensei() {
  const { language } = useSettings();
  const [surface, setSurface] = useState<Surface | null>(activeSurface);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [looking, setLooking] = useState(false);
  const [nudge, setNudge] = useState(false);

  // Bottom-right by default; dragged position is remembered.
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    const raw = readRaw(POS_KEY);
    if (raw) {
      try {
        return JSON.parse(raw) as { x: number; y: number };
      } catch {
        /* fall through */
      }
    }
    return { x: -1, y: -1 };
  });
  const drag = useRef<{ dx: number; dy: number; moved: boolean } | null>(null);

  useEffect(() => onSurfaceChange(setSurface), []);

  /**
   * The same hook the Ask Sensei page uses, on the same thread key — so the owl
   * and that page are one conversation, not two tutors talking past each other.
   */
  const threadKey = surface?.contextKey ?? 'free';
  const chat = useTutorChat({
    contextType: 'free_chat',
    contextData: surface?.problem ? { problem: surface.problem } : {},
    language,
    threadKey,
  });

  useEffect(() => {
    const bob = () => {
      setNudge(true);
      window.setTimeout(() => setNudge(false), 700);
    };
    window.addEventListener('sensei:activity', bob);
    return () => window.removeEventListener('sensei:activity', bob);
  }, []);

  // ---- dragging -------------------------------------------------------------
  const onPointerDown = (e: React.PointerEvent) => {
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    const r = el.getBoundingClientRect();
    drag.current = { dx: e.clientX - r.left, dy: e.clientY - r.top, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    d.moved = true;
    setPos({
      x: Math.min(Math.max(0, e.clientX - d.dx), window.innerWidth - 72),
      y: Math.min(Math.max(0, e.clientY - d.dy), window.innerHeight - 72),
    });
  };
  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (d.moved) writeRaw(POS_KEY, JSON.stringify(pos));
    // A drag must not also count as a tap.
    else setOpen((v) => !v);
  };

  // ---- actions --------------------------------------------------------------
  const busy = looking || chat.phase !== 'idle';

  /**
   * Read the current work and bring it into the conversation. The reading goes
   * in as the student's turn so the tutor answers it like any other message --
   * which keeps one thread rather than a side-channel of coach bubbles.
   */
  const lookAtWork = useCallback(async () => {
    const s = activeSurface();
    if (!s || busy) return;
    setOpen(true);
    setLooking(true);
    observe('coach.ask', { problem: s.problem?.slice(0, 80) });
    try {
      const image = await s.getImage();
      if (!image) {
        chat.send(t.coach.nothingToSee);
        return;
      }
      const r = await coachWork(image, s.problem, language);
      if (r.coach) {
        observe('coach.reply', { status: r.coach.status, hint: r.coach.hint });
        const focus = r.coach.focus ? ` Look at ${r.coach.focus}.` : '';
        chat.send(
          `${t.coach.lookAtMyWork}\n\n[${t.coach.readingLabel}: ${r.reading ?? ''}]${focus}`,
          { seen_work: r.reading ?? undefined, observation: digest() ?? undefined },
        );
      } else {
        chat.send(t.coach.lookAtMyWork, { observation: digest() ?? undefined });
      }
    } catch {
      chat.send(t.coach.lookAtMyWork);
    } finally {
      setLooking(false);
    }
  }, [busy, language, chat]);

  const send = useCallback(
    (text: string) => {
      const value = text.trim();
      if (!value || busy) return;
      setInput('');
      observe('tutor.user', { text: value });
      chat.send(value, { observation: digest() ?? undefined });
    },
    [busy, chat],
  );

  // Replay and other surfaces can drop material straight into this thread.
  useEffect(() => {
    const onInsert = async (ev: Event) => {
      const detail = (ev as CustomEvent<{ image?: string; text?: string; prompt?: string }>).detail;
      if (!detail) return;
      setOpen(true);
      if (!detail.image) {
        if (detail.text) chat.send(detail.text);
        return;
      }
      setLooking(true);
      try {
        const r = await seeWork(detail.image, detail.prompt, language);
        chat.send(detail.text ?? t.replay.insertedWork, { seen_work: r.note ?? undefined });
      } catch {
        chat.send(detail.text ?? t.replay.insertedWork);
      } finally {
        setLooking(false);
      }
    };
    window.addEventListener('sensei:insert', onInsert as EventListener);
    return () => window.removeEventListener('sensei:insert', onInsert as EventListener);
  }, [language, chat]);

  const style: React.CSSProperties =
    pos.x < 0 ? { right: 20, bottom: 20 } : { left: pos.x, top: pos.y };

  return (
    <div id="sensei-owl" className="pointer-events-none fixed z-[60]" style={style}>
      <div className="pointer-events-auto flex flex-col items-end gap-2">
        {open ? (
          <div className="flex h-[26rem] w-[22rem] flex-col overflow-hidden rounded-2xl border border-line bg-surface/95 shadow-lift backdrop-blur">
            <div className="flex shrink-0 items-center gap-2 border-b border-line px-3 py-2">
              <SenseiOwl size={22} />
              <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink">
                {surface?.label ?? t.tutor.title}
              </p>
              <IconButton label={t.common.close} onClick={() => setOpen(false)}>
                <X size={14} />
              </IconButton>
            </div>

            <div className="s-scroll min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3 py-3">
              {!chat.messages.length ? (
                <p className="py-6 text-center text-[13px] text-ink-muted">{t.coach.threadEmpty}</p>
              ) : (
                chat.messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      'max-w-[92%] rounded-xl px-3 py-2 text-[13px] leading-relaxed',
                      m.role === 'user'
                        ? 's-gradient-fill ml-auto text-white'
                        : 'bg-surface-alt text-ink-soft',
                    )}
                  >
                    <RichText className="text-[13px]">{m.text || '…'}</RichText>
                  </div>
                ))
              )}
              {busy ? (
                <p className="flex items-center gap-1.5 text-2xs text-ink-muted">
                  <Loader2 size={11} className="animate-spin" />
                  {t.coach.looking}
                </p>
              ) : null}
            </div>

            <div className="shrink-0 space-y-2 border-t border-line px-3 py-2.5">
              <Button
                variant="secondary"
                className="h-8 w-full text-2xs"
                onClick={() => void lookAtWork()}
                disabled={busy || !surface}
              >
                <Eye size={13} />
                {surface ? t.coach.lookAtMyWork : t.coach.noSurface}
              </Button>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send(input);
                }}
                className="flex items-center gap-1.5"
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t.tutor.placeholderFree}
                  className="h-8 min-w-0 flex-1 rounded-lg border border-line bg-surface-alt px-2.5 text-[12.5px] text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
                />
                <Button type="submit" className="h-8 w-8 px-0" disabled={!input.trim() || busy}>
                  <Send size={13} />
                </Button>
              </form>
            </div>
          </div>
        ) : null}

        <button
          type="button"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          aria-label={t.coach.ask}
          title={t.coach.dragHint}
          className={cn(
            'relative cursor-grab touch-none rounded-2xl transition-transform duration-500 ease-smooth active:cursor-grabbing',
            'hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
            nudge && 'animate-float',
          )}
        >
          <SenseiOwl size={56} className="shadow-glow-sm rounded-2xl" />
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white shadow-soft">
            {busy ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
          </span>
        </button>
      </div>
    </div>
  );
}

/** Drop material (a replay contact sheet, a sketch) into the owl's thread. */
export function insertToSensei(detail: { image?: string; text?: string; prompt?: string }): void {
  window.dispatchEvent(new CustomEvent('sensei:insert', { detail }));
}
