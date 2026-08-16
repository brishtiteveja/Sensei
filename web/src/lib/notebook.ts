import { readJSON, writeJSON, readRaw } from '@/lib/storage';

/**
 * A Notion-style workspace for solving a problem step by step: an ordered stack
 * of blocks. A block is either a text note (Markdown + `$LaTeX$`, rendered by
 * RichText) or a sketch from the scratchpad (a PNG data URI).
 *
 * A notebook is a first-class object bound to a *context* — a specific lesson,
 * a specific practice question, or a free-standing page — so the work you do on
 * a problem is there when you come back to it, and can be pulled into the tutor.
 *
 * The shape is deliberately shared with the phone app's notebook; keep the two
 * in step if either changes.
 */
export type NotebookBlock =
  | { id: string; type: 'note'; text: string }
  | { id: string; type: 'sketch'; image: string }
  // An uploaded photo/image (downscaled to a data URI). `name` is the original
  // filename, shown as a caption.
  | { id: string; type: 'image'; image: string; name?: string };

export type NotebookContext =
  | { kind: 'free'; id: string; label?: string }
  | { kind: 'lesson'; id: string; label?: string }
  | { kind: 'practice'; id: string; label?: string };

export interface Notebook {
  key: string;
  title: string;
  blocks: NotebookBlock[];
  updatedAt: number;
  context: NotebookContext;
}

const KEY = 'notebooks.v1';
const LEGACY_KEY = 'notebook.v1';
/** Where a notebook parks a compiled prompt for the tutor to pick up. */
export const TUTOR_SEED_KEY = 'tutor.seed';

type NotebookMap = Record<string, Notebook>;

/** Stable storage key for a context. Free pages carry their own id. */
export function contextKey(c: NotebookContext): string {
  return `${c.kind}:${c.id}`;
}

/** Cheap unique id — only has to be locally distinct. */
export function uid(prefix = 'b'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
}

export function blockId(): string {
  return uid('blk');
}

/** The default free page, so "Notebook" in the nav always opens something. */
export const FREE_DEFAULT: NotebookContext = { kind: 'free', id: 'default' };

function emptyNotebook(context: NotebookContext): Notebook {
  return { key: contextKey(context), title: '', blocks: [], updatedAt: Date.now(), context };
}

function loadMap(): NotebookMap {
  const map = readJSON<NotebookMap>(KEY, {});
  // One-time migration: the first notebook shipped as a single global page.
  if (!map[contextKey(FREE_DEFAULT)]) {
    const legacyRaw = readRaw(LEGACY_KEY);
    if (legacyRaw) {
      try {
        const legacy = JSON.parse(legacyRaw) as Partial<Notebook>;
        if (Array.isArray(legacy.blocks)) {
          const nb = emptyNotebook(FREE_DEFAULT);
          map[nb.key] = { ...nb, title: legacy.title ?? '', blocks: legacy.blocks };
          writeJSON(KEY, map);
        }
      } catch {
        /* ignore a corrupt legacy value */
      }
    }
  }
  return map;
}

/** Fetch a context's notebook, creating an empty one if it does not exist yet. */
export function getNotebook(context: NotebookContext): Notebook {
  const map = loadMap();
  return map[contextKey(context)] ?? emptyNotebook(context);
}

export function getNotebookByKey(key: string): Notebook | null {
  return loadMap()[key] ?? null;
}

export function saveNotebook(nb: Notebook): void {
  const map = loadMap();
  map[nb.key] = { ...nb, updatedAt: Date.now() };
  writeJSON(KEY, map);
}

export function deleteNotebook(key: string): void {
  const map = loadMap();
  delete map[key];
  writeJSON(KEY, map);
}

/** Every notebook that has any content, newest first — for the library. */
export function listNotebooks(): Notebook[] {
  return Object.values(loadMap())
    .filter((nb) => nb.title.trim() || nb.blocks.length)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

/** True once a context's notebook has anything in it — for badge/affordances. */
export function notebookHasContent(context: NotebookContext): boolean {
  const nb = loadMap()[contextKey(context)];
  return !!nb && (nb.title.trim().length > 0 || nb.blocks.length > 0);
}

/**
 * Flatten the notebook into a single message for the tutor. Notes go in as
 * written; a sketch becomes a short bracketed marker, since this server has no
 * vision route — the tutor reasons from the surrounding text.
 */
export function compileForTutor(nb: Notebook): string {
  const parts: string[] = [];
  if (nb.title.trim()) parts.push(`# ${nb.title.trim()}`);
  let imgN = 0;
  for (const b of nb.blocks) {
    if (b.type === 'note') {
      if (b.text.trim()) parts.push(b.text.trim());
    } else if (b.type === 'sketch') {
      imgN += 1;
      parts.push(`[my hand-drawn sketch #${imgN} for this step]`);
    } else {
      imgN += 1;
      parts.push(`[an image I uploaded${b.name ? ` (${b.name})` : ''} #${imgN}]`);
    }
  }
  const body = parts.join('\n\n');
  return `Here is my working on this problem, step by step. Walk me through it and find where I go wrong — don't just give the answer.\n\n${body}`;
}
