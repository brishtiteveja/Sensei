import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { SenseiOwl } from '@/components/art/SenseiOwl';
import { readRaw, writeRaw } from '@/lib/storage';
import { t } from '@/i18n/strings';

/**
 * A short, skippable tour of the main surfaces.
 *
 * Deliberately high level — six stops, not a manual. Someone seeing Sensei for
 * the first time needs to know where learning happens, where their working
 * goes, and that the owl is always there; the rest is discoverable.
 *
 * Steps target live elements by selector and are skipped when the element is
 * not on screen (the owl is everywhere, the Teach tab is not), so the tour
 * adapts to wherever it is started rather than forcing navigation.
 */

const SEEN_KEY = 'tour.seen.v1';

/** Only the app tour auto-offers; the rest are on demand. */

interface Step {
  selector: string;
  title: string;
  body: string;
}

export type TourName = 'app' | 'notebook' | 'courses' | 'learn';

function steps(name: TourName): Step[] {
  if (name === 'notebook') {
    return [
      { selector: '[data-tour="nb-note"]', title: t.tour.nbNoteTitle, body: t.tour.nbNoteBody },
      { selector: '[data-tour="nb-sketch"]', title: t.tour.nbSketchTitle, body: t.tour.nbSketchBody },
      { selector: '[data-tour="nb-image"]', title: t.tour.nbImageTitle, body: t.tour.nbImageBody },
      { selector: '[data-tour="nb-phone"]', title: t.tour.nbPhoneTitle, body: t.tour.nbPhoneBody },
      { selector: '[data-tour="nb-give"]', title: t.tour.nbGiveTitle, body: t.tour.nbGiveBody },
    ];
  }
  if (name === 'learn') {
    return [
      { selector: '[data-tour="le-special"]', title: t.tour.leSpecialTitle, body: t.tour.leSpecialBody },
      { selector: '[data-tour="le-add"]', title: t.tour.leAddTitle, body: t.tour.leAddBody },
      {
        selector: '[data-tour="le-solve"], [data-tour="le-notebook"]',
        title: t.tour.leNotebookTitle,
        body: t.tour.leNotebookBody,
      },
      {
        selector: '[data-tour="le-ask"], [data-tour="le-check"]',
        title: t.tour.leCheckTitle,
        body: t.tour.leCheckBody,
      },
      { selector: '#sensei-owl', title: t.tour.owlTitle, body: t.tour.owlBody },
    ];
  }
  if (name === 'courses') {
    return [
      { selector: '[data-tour="co-subject"]', title: t.tour.coSubjectTitle, body: t.tour.coSubjectBody },
      { selector: '[data-tour="progress"]', title: t.tour.coProgressTitle, body: t.tour.coProgressBody },
      { selector: '#sensei-owl', title: t.tour.owlTitle, body: t.tour.owlBody },
    ];
  }
  return [
    { selector: '[data-tour="practice"]', title: t.tour.practiceTitle, body: t.tour.practiceBody },
    { selector: '[data-tour="notebook"]', title: t.tour.notebookTitle, body: t.tour.notebookBody },
    { selector: '[data-tour="tutor"]', title: t.tour.tutorTitle, body: t.tour.tutorBody },
    { selector: '#sensei-owl', title: t.tour.owlTitle, body: t.tour.owlBody },
    { selector: '[data-tour="teach"]', title: t.tour.teachTitle, body: t.tour.teachBody },
    { selector: '[data-tour="record"]', title: t.tour.recordTitle, body: t.tour.recordBody },
  ];
}

export function hasSeenTour(): boolean {
  return readRaw(SEEN_KEY) === '1';
}

export function Tour({
  open,
  onClose,
  name = 'app',
}: {
  open: boolean;
  onClose: () => void;
  name?: TourName;
}) {
  // Memoised: steps() builds a new array each call, and an unstable identity
  // here re-fired the reset effect on every render, pinning the tour to step 1.
  // The whole tree remounts on a language change, so this needs no deps.
  const all = useMemo(() => steps(name), [name]);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  // Walk forward past any step whose target is not on this screen.
  const findFrom = useCallback(
    (start: number): { index: number; rect: DOMRect } | null => {
      for (let k = start; k < all.length; k++) {
        const el = document.querySelector(all[k].selector);
        if (el) return { index: k, rect: el.getBoundingClientRect() };
      }
      return null;
    },
    [all],
  );

  useEffect(() => {
    if (!open) return;
    const found = findFrom(0);
    if (!found) {
      onClose();
      return;
    }
    setI(found.index);
    setRect(found.rect);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Keep the spotlight glued to its target while the page moves under it.
  useEffect(() => {
    if (!open) return;
    const track = () => {
      const el = document.querySelector(all[i]?.selector ?? '');
      if (el) setRect(el.getBoundingClientRect());
    };
    window.addEventListener('resize', track);
    window.addEventListener('scroll', track, true);
    return () => {
      window.removeEventListener('resize', track);
      window.removeEventListener('scroll', track, true);
    };
  }, [open, i, all]);

  const finish = useCallback(() => {
    if (name === 'app') writeRaw(SEEN_KEY, '1');
    onClose();
  }, [onClose, name]);

  const next = () => {
    const found = findFrom(i + 1);
    if (!found) {
      finish();
      return;
    }
    setI(found.index);
    setRect(found.rect);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish();
      if (e.key === 'Enter' || e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!open || !rect) return null;

  const pad = 8;
  const box = {
    left: Math.max(4, rect.left - pad),
    top: Math.max(4, rect.top - pad),
    width: rect.width + pad * 2,
    height: rect.height + pad * 2,
  };

  // Prefer to the right of the target, flipping left near the edge, and clamped
  // vertically so a step near the bottom is still fully readable.
  const cardW = 320;
  const cardH = 190;
  const right = box.left + box.width + 14;
  const left =
    right + cardW < window.innerWidth - 8 ? right : Math.max(8, box.left - cardW - 14);
  const top = Math.min(Math.max(8, box.top), window.innerHeight - cardH - 8);

  const step = all[i];
  const shown = all.slice(0, i + 1).length;

  return createPortal(
    <div className="fixed inset-0 z-[80]">
      {/* Dim everything but the target. A huge spread shadow is the cheapest
          cut-out that still tracks an arbitrary rectangle. */}
      <div
        className="pointer-events-none absolute rounded-xl ring-2 ring-accent transition-all duration-300 ease-smooth"
        style={{
          ...box,
          boxShadow: '0 0 0 9999px rgb(0 0 0 / 0.62)',
        }}
      />
      {/* Click anywhere off the card to leave. */}
      <div className="absolute inset-0" onClick={finish} />

      <div
        className="absolute w-80 rounded-2xl border border-line bg-surface p-4 shadow-lift"
        style={{ left, top }}
      >
        <div className="flex items-start gap-2.5">
          <SenseiOwl size={30} className="shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-[14.5px] font-semibold tracking-[-0.01em] text-ink">{step.title}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">{step.body}</p>
          </div>
          <button
            type="button"
            onClick={finish}
            aria-label={t.tour.skip}
            className="shrink-0 text-ink-faint hover:text-ink"
          >
            <X size={15} />
          </button>
        </div>

        <div className="mt-3.5 flex items-center gap-2">
          <span className="text-2xs tabular-nums text-ink-faint">
            {shown} / {all.length}
          </span>
          <button
            type="button"
            onClick={finish}
            className="text-2xs font-medium text-ink-muted underline underline-offset-2 hover:text-ink"
          >
            {t.tour.skip}
          </button>
          <Button onClick={next} className="ml-auto h-8 px-3 text-2xs">
            {i + 1 >= all.length ? t.tour.done : t.tour.next}
            <ArrowRight size={13} />
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
