import { useCallback, useEffect, useRef, useState } from 'react';
import { Eye, Loader2, Move, Pin, Send, Sparkles, X } from 'lucide-react';
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
 *
 * It also *behaves* like a presence: the pupils track the cursor and the whole
 * mark leans toward it, trailing colour as it moves. That is not decoration --
 * a tutor that visibly watches you work is the difference between a help button
 * and someone sitting beside you. See the animation loop below.
 */

const POS_KEY = 'owl.pos';
const MOTION_KEY = 'owl.motion';
const PANEL_W = 352;
const PANEL_H = 416;

/** How far the owl will lean sideways out of its margin, in px. */
const MAX_LEAN = 34;
/** Keeps the travelling owl clear of the very top and bottom edges. */
const HOME_MARGIN = 56;
/** How far off the cursor line the owl settles, in px. */
const STANDOFF = 76;
/**
 * Come this close and it stops travelling and waits to be clicked. Without
 * this the standoff turns it into a button that dodges the cursor reaching
 * for it, which is maddening.
 */
const APPROACH_HOLD = 116;
/** First wander, after the page settles. Early enough to be noticed. */
const FIRST_ROAM_MS = 11_000;
/** And roughly every this often after that, jittered. */
const ROAM_EVERY_MS = 42_000;
/** How long it stays put once it has arrived and said its piece. */
const ROAM_HOLD_MS = 9_000;
/** Comet length. Each node is one past position, oldest last. */
const TRAIL = 9;
/** Brand palette, head to tail: indigo into cyan into gold. */
const TRAIL_COLORS = [
  '#4F46E5',
  '#5B5BEA',
  '#6366F1',
  '#22D3EE',
  '#06B6D4',
  '#22D3EE',
  '#F4C542',
  '#F4C542',
  '#4F46E5',
];

export function GlobalSensei() {
  const { language } = useSettings();
  const [surface, setSurface] = useState<Surface | null>(activeSurface);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [looking, setLooking] = useState(false);
  const [nudge, setNudge] = useState(false);
  const [says, setSays] = useState<{ text: string; left: boolean } | null>(null);
  /**
   * The knob. On by default, but off out of the box for anyone whose system
   * asks for reduced motion -- who can still switch it on, which an
   * unconditional opt-out would not allow.
   */
  const [moves, setMoves] = useState(() => {
    const saved = readRaw(MOTION_KEY);
    if (saved != null) return saved === '1';
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

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
  const owlRef = useRef<HTMLButtonElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const leanRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<(HTMLSpanElement | null)[]>([]);
  /** The live follow offset, shared between the animation loop and dragging. */
  const offsetRef = useRef({ x: 0, y: 0 });
  /** Set whenever the owl's home moves, so the loop re-measures it once. */
  const homeDirty = useRef(true);
  /** Where it has wandered off to, and until when it stays there. */
  const roamRef = useRef<{ x: number; y: number; until: number } | null>(null);
  const movesRef = useRef(moves);
  movesRef.current = moves;
  // Read by the animation loop without restarting it.
  const openRef = useRef(open);
  openRef.current = open;
  const excitedRef = useRef(0);

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
      excitedRef.current = 1;
      window.setTimeout(() => setNudge(false), 700);
    };
    window.addEventListener('sensei:activity', bob);
    return () => window.removeEventListener('sensei:activity', bob);
  }, []);

  /**
   * Follow, watch, and trail colour.
   *
   * One rAF loop drives all three, writing straight to the DOM -- a per-frame
   * setState here would re-render the whole conversation sixty times a second.
   *
   * It travels *vertically* with the cursor and only leans sideways, so it
   * keeps you company down the page while staying in the margin: a companion
   * that wandered across the problem would be an obstacle. The lag is
   * deliberate — it arrives a beat after you, which is what makes it read as
   * following rather than as a cursor decoration.
   *
   * The trail is a ring buffer of past centres, so it stretches into a comet
   * exactly when the owl is moving and collapses to nothing when it is parked
   * -- no permanent smear behind a still button.
   */
  useEffect(() => {
    const pointer = { x: -1, y: -1 };
    const lean = offsetRef.current;
    const path = Array.from({ length: TRAIL + 1 }, () => ({ x: -999, y: -999 }));
    let glow = 0;
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
    };
    window.addEventListener('pointermove', onMove, { passive: true });

    /*
     * The home centre, cached. The host is fixed and never transformed, so its
     * box only moves when the owl is dropped somewhere new or the window is
     * resized — measuring it every frame would force a layout flush sixty
     * times a second for a number that almost never changes.
     */
    let home = { x: 0, y: 0 };
    const measure = () => {
      const host = hostRef.current;
      if (!host) return;
      const r = host.getBoundingClientRect();
      home = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    };
    window.addEventListener('resize', measure);

    const frame = () => {
      raf = requestAnimationFrame(frame);
      const host = hostRef.current;
      const el = leanRef.current;
      if (!host || !el) return;

      // Mid-drag the home moves with the finger, so it is re-read every frame;
      // otherwise only after it has been dropped somewhere new.
      if (drag.current || homeDirty.current) {
        measure();
        homeDirty.current = false;
      }
      const cx = home.x;
      const cy = home.y;

      const roam = roamRef.current && roamRef.current.until > Date.now() ? roamRef.current : null;
      // Reasons to hold position: the knob is off; being dragged; the panel is
      // open (it is placed against the owl and would drift away from it); a
      // tour is spotlighting it; or you are reaching for it -- though a wander
      // already in progress is allowed to finish.
      const reaching =
        !roam &&
        pointer.x >= 0 &&
        Math.hypot(pointer.x - (cx + lean.x), pointer.y - (cy + lean.y)) < APPROACH_HOLD;
      const parked = !movesRef.current;
      if (!drag.current && !openRef.current && !document.body.dataset.tour && !reaching) {
        let tx = 0;
        let ty = 0;
        let easeX = 0.085;
        // Lazier than the lean, so it arrives a beat after you do and draws a
        // longer tail on the way.
        let easeY = 0.055;
        if (parked) {
          // Knob off: settle back into the corner and stay there.
          easeX = easeY = 0.12;
        } else if (roam) {
          // Off across the screen, and this one is deliberately not capped --
          // crossing the page is the whole point of a wander.
          tx = roam.x - cx;
          ty = roam.y - cy;
          easeX = easeY = 0.055;
        } else if (pointer.x >= 0) {
          // Sideways it only *leans* -- capped, so it stays in the margin and
          // does not sit on the work. Vertically it travels the whole
          // viewport, gliding along beside whatever line you are on.
          const dx = pointer.x - cx;
          tx = Math.max(-MAX_LEAN, Math.min(MAX_LEAN, dx * 0.12));
          // Alongside you, never underneath: it holds a standoff on its home
          // side of the cursor, so it can't end up swallowing a click meant
          // for the page.
          const away = cy >= pointer.y ? 1 : -1;
          const wantY = Math.max(
            HOME_MARGIN,
            Math.min(window.innerHeight - HOME_MARGIN, pointer.y + away * STANDOFF),
          );
          ty = wantY - cy;
        }
        lean.x += (tx - lean.x) * easeX;
        lean.y += (ty - lean.y) * easeY;
        el.style.transform = `translate3d(${lean.x.toFixed(2)}px, ${lean.y.toFixed(2)}px, 0)`;
      }

      const nx = cx + lean.x;
      const ny = cy + lean.y;

      // Gaze is measured from where the owl actually *is*, not from its home --
      // otherwise it stares off at an angle the whole time it is travelling.
      if (pointer.x >= 0 && !parked) {
        const gx = Math.max(-1, Math.min(1, (pointer.x - nx) / 220));
        const gy = Math.max(-1, Math.min(1, (pointer.y - ny) / 220));
        host.style.setProperty('--gaze-x', gx.toFixed(3));
        host.style.setProperty('--gaze-y', gy.toFixed(3));
      }

      const head = path[0];
      const speed = Math.hypot(nx - head.x, ny - head.y);
      path.pop();
      path.unshift({ x: nx, y: ny });

      // Brightness follows speed, with a floor while something just happened --
      // that is the owl reacting to you rather than to the mouse.
      const target = parked ? 0 : Math.min(1, speed / 4) * 0.9 + excitedRef.current * 0.4;
      glow += (Math.min(1, target) - glow) * (target > glow ? 0.35 : 0.08);
      excitedRef.current *= 0.94;

      for (let i = 0; i < TRAIL; i++) {
        const node = trailRef.current[i];
        if (!node) continue;
        const p = path[i + 1];
        const age = 1 - i / TRAIL;
        node.style.transform =
          `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0) ` +
          `translate(-50%, -50%) scale(${(0.3 + age * 0.75).toFixed(3)})`;
        node.style.opacity = (glow * age * 0.8).toFixed(3);
      }
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('resize', measure);
    };
  }, []);

  /**
   * Every so often it gets up and goes somewhere else, and says something when
   * it lands.
   *
   * The line is chosen from what is actually on screen, so the interruption
   * earns itself: with a drawable surface it offers to read the work, with a
   * problem open it points at the Socratic move, and with neither it suggests
   * starting one. It crosses to the *opposite* margin, because a companion you
   * never see move is just a button in a corner.
   */
  const roamNow = useCallback(() => {
    const host = hostRef.current;
    if (!host) return;
    const r = host.getBoundingClientRect();
    const here = r.left + r.width / 2 + offsetRef.current.x;
    const goLeft = here > window.innerWidth / 2;
    // Perching on the nav would cover the links, so the left post starts
    // wherever the sidebar ends -- which is nothing at all on a phone.
    const aside = document.querySelector('aside')?.getBoundingClientRect();
    const leftPost = Math.max(76, (aside?.right ?? 0) + 56);
    const rightPost = window.innerWidth - 76;
    const x = goLeft ? Math.min(leftPost, window.innerWidth / 2) : rightPost;
    roamRef.current = {
      x,
      y: HOME_MARGIN + 60 + Math.random() * Math.max(60, window.innerHeight - HOME_MARGIN * 2 - 180),
      until: Date.now() + ROAM_HOLD_MS,
    };
    const surf = activeSurface();
    const text = surf?.getImage ? t.owl.sayLook : surf ? t.owl.sayWhy : t.owl.sayPick;
    // Said on arrival, not on departure -- a bubble that flies across the
    // screen is unreadable -- and opening away from the nearest edge.
    window.setTimeout(() => setSays({ text, left: x > window.innerWidth / 2 }), 1500);
    window.setTimeout(() => setSays(null), ROAM_HOLD_MS - 300);
  }, []);

  useEffect(() => {
    if (!moves) {
      roamRef.current = null;
      setSays(null);
      return;
    }
    let timer = 0;
    const schedule = (delay: number) => {
      timer = window.setTimeout(() => {
        // Not while it is busy being useful, or being read.
        const blocked =
          openRef.current || drag.current || document.body.dataset.tour || document.hidden;
        if (!blocked) roamNow();
        schedule(ROAM_EVERY_MS * (0.75 + Math.random() * 0.5));
      }, delay);
    };
    schedule(FIRST_ROAM_MS);
    return () => window.clearTimeout(timer);
  }, [moves, roamNow]);

  const toggleMoves = useCallback(() => {
    setMoves((was) => {
      writeRaw(MOTION_KEY, was ? '0' : '1');
      observe('owl.motion', { on: !was });
      return !was;
    });
  }, []);

  // ---- dragging -------------------------------------------------------------
  const onPointerDown = (e: React.PointerEvent) => {
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);

    /*
     * Grabbing a *travelling* owl: fold however far it has followed you into
     * its home and zero the offset, so from here on the drag is plain
     * arithmetic on one number. Written straight to the DOM as well as to
     * state, because a frame rendered with the new home and the old offset
     * would flash the owl across the screen and back.
     */
    const host = hostRef.current;
    const o = offsetRef.current;
    if (host && (o.x || o.y)) {
      const hr = host.getBoundingClientRect();
      const x = hr.left + o.x;
      const y = hr.top + o.y;
      host.style.right = '';
      host.style.bottom = '';
      host.style.left = `${x}px`;
      host.style.top = `${y}px`;
      o.x = 0;
      o.y = 0;
      if (leanRef.current) leanRef.current.style.transform = 'translate3d(0px, 0px, 0)';
      setPos({ x, y });
    }

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
    if (!s?.getImage || busy) return;
    setOpen(true);
    setLooking(true);
    observe('coach.ask', { problem: s.problem?.slice(0, 80) });
    try {
      const image = await s.getImage!();
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

  useEffect(() => {
    homeDirty.current = true;
  }, [pos]);

  const style: React.CSSProperties =
    pos.x < 0 ? { right: 20, bottom: 20 } : { left: pos.x, top: pos.y };

  /**
   * Place the panel against the owl but inside the viewport. The owl can be
   * dragged to any edge, so a panel laid out relative to it runs off-screen in
   * the corners; this measures the owl and clamps, flipping above/below
   * depending on which side has room.
   */
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  useEffect(() => {
    if (!open) return;
    const place = () => {
      const r = owlRef.current?.getBoundingClientRect();
      if (!r) return;
      const w = Math.min(PANEL_W, window.innerWidth - 16);
      const h = Math.min(PANEL_H, window.innerHeight - 16);
      const above = r.top >= h + 16;
      setPanelStyle({
        width: w,
        height: h,
        left: Math.min(Math.max(8, r.left + r.width / 2 - w / 2), window.innerWidth - w - 8),
        top: above
          ? r.top - h - 10
          : Math.min(r.bottom + 10, window.innerHeight - h - 8),
      });
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [open, pos]);

  return (
    <>
      {/* The comet, under the owl and out of every hit-test. Positions are
          viewport coordinates written by the loop, so this layer is fixed and
          full-bleed rather than anchored to the owl. */}
      <div className="pointer-events-none fixed inset-0 z-[59] overflow-hidden" aria-hidden="true">
        {TRAIL_COLORS.slice(0, TRAIL).map((color, i) => (
          <span
            key={i}
            ref={(node) => {
              trailRef.current[i] = node;
            }}
            className="absolute left-0 top-0 h-10 w-10 rounded-full opacity-0 blur-[7px] will-change-transform"
            style={{ background: `radial-gradient(circle, ${color} 0%, transparent 68%)` }}
          />
        ))}
      </div>

      <div ref={hostRef} className="pointer-events-none fixed z-[60]" style={style}>
        {open ? (
          <div
            className="pointer-events-auto fixed flex flex-col overflow-hidden rounded-2xl border border-line bg-surface/95 shadow-lift backdrop-blur"
            style={panelStyle}
          >
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex shrink-0 items-center gap-2 border-b border-line px-3 py-2">
                <SenseiOwl size={22} />
                <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink">
                  {surface?.label ?? t.tutor.title}
                </p>
                <IconButton
                  label={moves ? t.owl.stopMoving : t.owl.startMoving}
                  onClick={toggleMoves}
                >
                  {moves ? <Pin size={14} /> : <Move size={14} />}
                </IconButton>
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
                  disabled={busy || !surface?.getImage}
                >
                  <Eye size={13} />
                  {surface?.getImage
                    ? t.coach.lookAtMyWork
                    : surface
                      ? t.coach.noWorkSurface
                      : t.coach.noSurface}
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
          </div>
        ) : null}

        <div
          id="sensei-owl"
          ref={leanRef}
          className="pointer-events-auto relative will-change-transform"
        >
          {says && !open ? (
            /* Travels with the owl because it lives inside the moving wrapper,
               and opens the conversation on the line it just offered. */
            <button
              type="button"
              onClick={() => {
                setSays(null);
                setOpen(true);
              }}
              className={cn(
                'absolute bottom-full mb-2 w-max max-w-[210px] animate-fade-up rounded-xl',
                'border border-line bg-surface px-3 py-2 text-left text-[12.5px] leading-snug',
                'text-ink-soft shadow-lift hover:border-accent/50 hover:text-ink',
                says.left ? 'right-0' : 'left-0',
              )}
            >
              {says.text}
            </button>
          ) : null}
          <button
            ref={owlRef}
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
    </>
  );
}

/** Drop material (a replay contact sheet, a sketch) into the owl's thread. */
export function insertToSensei(detail: { image?: string; text?: string; prompt?: string }): void {
  window.dispatchEvent(new CustomEvent('sensei:insert', { detail }));
}
