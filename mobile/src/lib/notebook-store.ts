import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * A Notion-style workspace for solving a problem step by step: an ordered stack
 * of blocks. A block is a text note (Markdown + `$LaTeX$`, rendered by
 * FormattedText), a sketch from the drawing canvas, or an uploaded photo.
 *
 * A notebook is a first-class object bound to a *context* — a lesson, a
 * practice question, or a free-standing page — so work on a problem is there
 * when you return, and can be pulled into the tutor. The shape mirrors the web
 * client's notebook verbatim; keep the two in step if either changes.
 */
export type NotebookBlock =
  | { id: string; type: 'note'; text: string }
  | { id: string; type: 'sketch'; image: string }
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

const KEY = 'dikkha_notebooks';

export const FREE_DEFAULT: NotebookContext = { kind: 'free', id: 'default' };

type NotebookMap = Record<string, Notebook>;

export function contextKey(c: NotebookContext): string {
  return `${c.kind}:${c.id}`;
}

export function uid(prefix = 'b'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
}

export function blockId(): string {
  return uid('blk');
}

export function emptyNotebook(context: NotebookContext): Notebook {
  return { key: contextKey(context), title: '', blocks: [], updatedAt: Date.now(), context };
}

async function loadMap(): Promise<NotebookMap> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as NotebookMap) : {};
  } catch {
    return {};
  }
}

async function writeMap(map: NotebookMap): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* quota or serialization failure — best effort */
  }
}

export async function getNotebook(context: NotebookContext): Promise<Notebook> {
  const map = await loadMap();
  return map[contextKey(context)] ?? emptyNotebook(context);
}

export async function getNotebookByKey(key: string): Promise<Notebook | null> {
  const map = await loadMap();
  return map[key] ?? null;
}

export async function saveNotebook(nb: Notebook): Promise<void> {
  const map = await loadMap();
  map[nb.key] = { ...nb, updatedAt: Date.now() };
  await writeMap(map);
}

export async function deleteNotebook(key: string): Promise<void> {
  const map = await loadMap();
  delete map[key];
  await writeMap(map);
}

export async function listNotebooks(): Promise<Notebook[]> {
  const map = await loadMap();
  return Object.values(map)
    .filter((nb) => nb.title.trim() || nb.blocks.length)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * Flatten the notebook into a single tutor message. Notes go in as written; a
 * sketch or image becomes a short bracketed marker, since this server has no
 * vision route — the tutor reasons from the surrounding text.
 */
export function compileForTutor(nb: Notebook): string {
  const parts: string[] = [];
  if (nb.title.trim()) parts.push(`# ${nb.title.trim()}`);
  let n = 0;
  for (const b of nb.blocks) {
    if (b.type === 'note') {
      if (b.text.trim()) parts.push(b.text.trim());
    } else if (b.type === 'sketch') {
      n += 1;
      parts.push(`[my hand-drawn sketch #${n} for this step]`);
    } else {
      n += 1;
      parts.push(`[an image I uploaded${b.name ? ` (${b.name})` : ''} #${n}]`);
    }
  }
  return `Here is my working on this problem, step by step. Walk me through it and find where I go wrong — don't just give the answer.\n\n${parts.join('\n\n')}`;
}
