/**
 * What the global owl is currently looking at.
 *
 * The owl lives once, in the app shell, but the thing worth looking at changes
 * as the student moves: a scratchpad canvas, a notebook page, nothing at all.
 * Rather than thread props through every screen, a surface registers itself
 * while it is mounted and unregisters on the way out. The owl asks the registry
 * at the instant it is tapped, so it never holds a stale canvas.
 */

export interface Surface {
  /** Pixels of the current work, rendered on demand. */
  getImage: () => string | null | Promise<string | null>;
  /** What the student is solving, for the tutor's context. */
  problem?: string;
  /** Stable key for the problem, so each gets its own conversation. */
  contextKey?: string;
  label?: string;
}

let current: Surface | null = null;
const listeners = new Set<(s: Surface | null) => void>();

/** Called by a work surface on mount; the returned function unregisters it. */
export function registerSurface(s: Surface): () => void {
  current = s;
  for (const fn of listeners) fn(current);
  return () => {
    // Only clear if a newer surface has not already taken over.
    if (current === s) {
      current = null;
      for (const fn of listeners) fn(null);
    }
  };
}

export function activeSurface(): Surface | null {
  return current;
}

export function onSurfaceChange(fn: (s: Surface | null) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
