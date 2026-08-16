import { readJSON, writeJSON } from '@/lib/storage';

/**
 * A Notion-style workspace for solving a long problem step by step: an ordered
 * stack of blocks the student fills in as they work. A block is either a text
 * note (Markdown + `$LaTeX$`, rendered by RichText) or a sketch from the
 * scratchpad (a PNG data URI).
 *
 * The shape is deliberately shared with the phone app's notebook so the two
 * mean the same thing; keep them in step if either changes.
 */
export type NotebookBlock =
  | { id: string; type: 'note'; text: string }
  | { id: string; type: 'sketch'; image: string };

export interface Notebook {
  id: string;
  title: string;
  blocks: NotebookBlock[];
  updatedAt: number;
}

const KEY = 'notebook.v1';
/** Where the notebook parks a compiled prompt for the tutor to pick up. */
export const TUTOR_SEED_KEY = 'tutor.seed';

/** Cheap unique id — no crypto needed, this only has to be locally distinct. */
export function blockId(): string {
  return `b_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
}

export function emptyNotebook(): Notebook {
  return { id: 'default', title: '', blocks: [], updatedAt: Date.now() };
}

export function loadNotebook(): Notebook {
  const nb = readJSON<Notebook | null>(KEY, null);
  if (!nb || !Array.isArray(nb.blocks)) return emptyNotebook();
  return nb;
}

export function saveNotebook(nb: Notebook): void {
  writeJSON(KEY, { ...nb, updatedAt: Date.now() });
}

/**
 * Flatten the notebook into a single message for the tutor. Notes go in as
 * written; a sketch becomes a short bracketed marker, since this server has no
 * vision route — the tutor reasons from the surrounding text.
 */
export function compileForTutor(nb: Notebook): string {
  const parts: string[] = [];
  if (nb.title.trim()) parts.push(`# ${nb.title.trim()}`);
  let sketchN = 0;
  for (const b of nb.blocks) {
    if (b.type === 'note') {
      if (b.text.trim()) parts.push(b.text.trim());
    } else {
      sketchN += 1;
      parts.push(`[my hand-drawn sketch #${sketchN} for this step]`);
    }
  }
  const body = parts.join('\n\n');
  return `Here is my working on this problem, step by step. Walk me through it and find where I go wrong — don't just give the answer.\n\n${body}`;
}
