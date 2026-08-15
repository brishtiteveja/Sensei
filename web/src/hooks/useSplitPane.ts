import { useCallback, useEffect, useRef, useState } from 'react';
import { readRaw, writeRaw } from '@/lib/storage';
import { clamp } from '@/lib/utils';

interface Options {
  storageKey: string;
  /** Right pane width as a percentage of the container. */
  initial?: number;
  min?: number;
  max?: number;
  /** Absolute floor in px so the tutor never becomes unusable. */
  minPx?: number;
}

/**
 * Mouse- and keyboard-driven splitter for the lesson view.
 * Width is stored as a percentage so the layout survives window resizes.
 */
export function useSplitPane({
  storageKey,
  initial = 38,
  min = 26,
  max = 58,
  minPx = 340,
}: Options) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number>(() => {
    const stored = Number(readRaw(storageKey));
    return Number.isFinite(stored) && stored > 0 ? clamp(stored, min, max) : initial;
  });
  const [dragging, setDragging] = useState(false);

  const commit = useCallback(
    (next: number) => {
      const clamped = clamp(next, min, max);
      setWidth(clamped);
      writeRaw(storageKey, String(Math.round(clamped * 10) / 10));
    },
    [max, min, storageKey],
  );

  useEffect(() => {
    if (!dragging) return;

    const onMove = (e: MouseEvent) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0) return;
      const fromRight = rect.right - e.clientX;
      const minPct = (minPx / rect.width) * 100;
      commit(clamp((fromRight / rect.width) * 100, Math.max(min, minPct), max));
    };
    const onUp = () => setDragging(false);

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging, commit, max, min, minPx]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        commit(width + 2);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        commit(width - 2);
      } else if (e.key === 'Home') {
        e.preventDefault();
        commit(initial);
      }
    },
    [commit, width, initial],
  );

  return {
    containerRef,
    width,
    dragging,
    startDrag: () => setDragging(true),
    onKeyDown,
    min,
    max,
  };
}
