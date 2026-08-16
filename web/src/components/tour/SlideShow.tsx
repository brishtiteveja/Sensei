import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { readRaw, writeRaw } from '@/lib/storage';
import { t } from '@/i18n/strings';
import { cn } from '@/lib/utils';

/**
 * The opening pitch, as a dismissible slideshow.
 *
 * Someone landing cold — a judge, a teacher — gets the story before the
 * product: what Sensei is, who it is for, why it runs on the box. It shows once
 * and is then only reachable deliberately, because a deck that reappears is an
 * obstacle rather than an introduction.
 *
 * Slides are plain images served from the app's base path, preloaded one ahead
 * so paging never lands on a blank frame.
 */

const SEEN_KEY = 'slides.seen.v1';
const COUNT = 6;

const slideUrl = (n: number) => `${import.meta.env.BASE_URL}slides/slide-${n}.png`;

export function hasSeenSlides(): boolean {
  return readRaw(SEEN_KEY) === '1';
}

export function SlideShow({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (open) setI(0);
  }, [open]);

  // Pull the next one into cache so Next is instant.
  useEffect(() => {
    if (!open || i + 1 >= COUNT) return;
    const img = new Image();
    img.src = slideUrl(i + 2);
  }, [open, i]);

  const finish = useCallback(() => {
    writeRaw(SEEN_KEY, '1');
    onClose();
  }, [onClose]);

  const go = useCallback(
    (d: number) => setI((prev) => Math.min(COUNT - 1, Math.max(0, prev + d))),
    [],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish();
      else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (i + 1 >= COUNT) finish();
        else go(1);
      } else if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, i, go, finish]);

  if (!open) return null;
  const last = i + 1 >= COUNT;

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={finish} />

      <div className="relative w-full max-w-4xl">
        <img
          src={slideUrl(i + 1)}
          alt={`Slide ${i + 1} of ${COUNT}`}
          className="w-full rounded-2xl shadow-lift"
        />

        <button
          type="button"
          onClick={finish}
          aria-label={t.common.close}
          className="absolute -top-3 -right-3 rounded-full bg-surface p-2 text-ink-muted shadow-card hover:text-ink"
        >
          <X size={16} />
        </button>

        <div className="mt-4 flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => go(-1)}
            disabled={i === 0}
            className="h-9 px-3"
            aria-label={t.common.previous}
          >
            <ArrowLeft size={15} />
          </Button>

          <div className="flex items-center gap-1.5">
            {Array.from({ length: COUNT }, (_, n) => (
              <button
                key={n}
                type="button"
                onClick={() => setI(n)}
                aria-label={`${n + 1}`}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  n === i ? 'w-6 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/70',
                )}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={finish}
            className="ml-auto text-2xs font-medium text-white/70 underline underline-offset-2 hover:text-white"
          >
            {t.slides.skip}
          </button>

          <Button onClick={() => (last ? finish() : go(1))} className="h-9 px-4">
            {last ? t.slides.start : t.common.next}
            <ArrowRight size={15} />
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
