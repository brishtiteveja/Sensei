import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Pencil,
  PenLine,
  Plus,
  Trash2,
  Type,
} from 'lucide-react';
import { Page } from '@/components/layout/AppShell';
import { Button, IconButton } from '@/components/ui/Button';
import { RichText } from '@/components/ui/RichText';
import { EmptyState } from '@/components/ui/States';
import { ScratchpadPanel } from '@/components/tutor/ScratchpadPanel';
import { writeRaw } from '@/lib/storage';
import {
  blockId,
  compileForTutor,
  loadNotebook,
  saveNotebook,
  TUTOR_SEED_KEY,
  type Notebook,
  type NotebookBlock,
} from '@/lib/notebook';
import { t } from '@/i18n/strings';
import { cn } from '@/lib/utils';

/**
 * A Notion-style workspace: a persistent stack of note and sketch blocks for
 * working a long problem step by step. Everything lives in localStorage, so a
 * half-finished derivation survives a refresh, and "Discuss with Sensei" hands
 * the whole thing to the tutor.
 */
export function NotebookPage() {
  const navigate = useNavigate();
  const [nb, setNb] = useState<Notebook>(() => loadNotebook());
  const [editingId, setEditingId] = useState<string | null>(null);
  // null = closed; 'new' = drawing a fresh sketch; otherwise the block id.
  const [sketchTarget, setSketchTarget] = useState<string | null>(null);

  // Persist on every change. loadNotebook already ran once for the initial
  // state, so this only writes real edits, not the first mount.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    saveNotebook(nb);
  }, [nb]);

  const update = useCallback((fn: (blocks: NotebookBlock[]) => NotebookBlock[]) => {
    setNb((prev) => ({ ...prev, blocks: fn(prev.blocks) }));
  }, []);

  const addNote = () => {
    const id = blockId();
    update((b) => [...b, { id, type: 'note', text: '' }]);
    setEditingId(id);
  };

  const setNoteText = (id: string, text: string) =>
    update((b) => b.map((x) => (x.id === id && x.type === 'note' ? { ...x, text } : x)));

  const remove = (id: string) => {
    update((b) => b.filter((x) => x.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const move = (id: string, dir: -1 | 1) =>
    update((b) => {
      const i = b.findIndex((x) => x.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= b.length) return b;
      const next = [...b];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const onSketch = (image: string) => {
    if (sketchTarget && sketchTarget !== 'new') {
      update((b) => b.map((x) => (x.id === sketchTarget ? { ...x, type: 'sketch', image } : x)));
    } else {
      update((b) => [...b, { id: blockId(), type: 'sketch', image }]);
    }
    setSketchTarget(null);
  };

  const discuss = () => {
    // Too long for a URL, so park the compiled prompt and let the tutor read it.
    writeRaw(TUTOR_SEED_KEY, compileForTutor(nb));
    navigate('/tutor?seed=notebook');
  };

  const clearAll = () => {
    if (nb.blocks.length && !window.confirm(t.notebook.clearConfirm)) return;
    setNb((prev) => ({ ...prev, blocks: [], title: '' }));
    setEditingId(null);
  };

  const hasContent = nb.blocks.length > 0;

  return (
    <Page
      title={t.notebook.title}
      subtitle={t.notebook.subtitle}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={clearAll} disabled={!hasContent}>
            {t.notebook.clearAll}
          </Button>
          <Button onClick={discuss} disabled={!hasContent}>
            <MessageCircle size={16} />
            {t.notebook.askSensei}
          </Button>
        </div>
      }
    >
      <div className="mx-auto max-w-3xl space-y-4 pb-10">
        <input
          value={nb.title}
          onChange={(e) => setNb((prev) => ({ ...prev, title: e.target.value }))}
          placeholder={t.notebook.titlePlaceholder}
          aria-label={t.notebook.titlePlaceholder}
          className="w-full border-none bg-transparent text-2xl font-semibold tracking-[-0.02em] text-ink placeholder:text-ink-faint focus:outline-none"
        />

        {!hasContent ? (
          <EmptyState
            icon={<PenLine size={22} />}
            title={t.notebook.empty}
            body={t.notebook.emptyBody}
          />
        ) : (
          <div className="space-y-3">
            {nb.blocks.map((block, i) => (
              <BlockRow
                key={block.id}
                block={block}
                editing={editingId === block.id}
                first={i === 0}
                last={i === nb.blocks.length - 1}
                onEdit={() => block.type === 'note' && setEditingId(block.id)}
                onRedraw={() => setSketchTarget(block.id)}
                onChange={(text) => setNoteText(block.id, text)}
                onDone={() => setEditingId(null)}
                onRemove={() => remove(block.id)}
                onMove={(d) => move(block.id, d)}
              />
            ))}
          </div>
        )}

        {/* add-block bar */}
        <div className="flex items-center gap-2 pt-1">
          <AddButton icon={<Type size={15} />} label={t.notebook.addNote} onClick={addNote} />
          <AddButton
            icon={<Pencil size={15} />}
            label={t.notebook.addSketch}
            onClick={() => setSketchTarget('new')}
          />
          <span className="ml-auto text-2xs text-ink-faint">{t.notebook.saved}</span>
        </div>
      </div>

      <ScratchpadPanel
        open={sketchTarget !== null}
        onClose={() => setSketchTarget(null)}
        onInsert={onSketch}
      />
    </Page>
  );
}

function BlockRow({
  block,
  editing,
  first,
  last,
  onEdit,
  onRedraw,
  onChange,
  onDone,
  onRemove,
  onMove,
}: {
  block: NotebookBlock;
  editing: boolean;
  first: boolean;
  last: boolean;
  onEdit: () => void;
  onRedraw: () => void;
  onChange: (text: string) => void;
  onDone: () => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (!editing) return;
    const el = taRef.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [editing]);

  return (
    <div className="group relative rounded-xl border border-line bg-surface/70 p-4 transition-colors hover:border-line-strong">
      {/* per-block controls */}
      <div className="absolute right-2 top-2 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        <IconButton label={t.notebook.moveUp} onClick={() => onMove(-1)} disabled={first}>
          <ChevronUp size={15} />
        </IconButton>
        <IconButton label={t.notebook.moveDown} onClick={() => onMove(1)} disabled={last}>
          <ChevronDown size={15} />
        </IconButton>
        {block.type === 'sketch' ? (
          <IconButton label={t.notebook.editSketch} onClick={onRedraw}>
            <Pencil size={14} />
          </IconButton>
        ) : null}
        <IconButton label={t.notebook.deleteBlock} onClick={onRemove}>
          <Trash2 size={14} />
        </IconButton>
      </div>

      {block.type === 'sketch' ? (
        <button
          type="button"
          onClick={onRedraw}
          className="block w-full overflow-hidden rounded-lg border border-line bg-white"
          title={t.notebook.editSketch}
        >
          <img src={block.image} alt="Sketch" className="mx-auto max-h-80 w-auto" />
        </button>
      ) : editing ? (
        <textarea
          ref={taRef}
          value={block.text}
          onChange={(e) => {
            onChange(e.target.value);
            const el = e.currentTarget;
            el.style.height = 'auto';
            el.style.height = `${el.scrollHeight}px`;
          }}
          onBlur={onDone}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              onDone();
            }
          }}
          placeholder={t.notebook.notePlaceholder}
          className="w-full resize-none bg-transparent font-mono text-[13.5px] leading-relaxed text-ink placeholder:text-ink-faint focus:outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={onEdit}
          className={cn(
            'block w-full text-left',
            !block.text.trim() && 'text-ink-faint',
          )}
          title={t.notebook.editHint}
        >
          {block.text.trim() ? (
            <RichText className="text-[13.5px] text-ink-soft">{block.text}</RichText>
          ) : (
            <span className="text-[13.5px]">{t.notebook.notePlaceholder}</span>
          )}
        </button>
      )}
    </div>
  );
}

function AddButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border border-dashed border-line px-3 py-2',
        'text-[13px] font-medium text-ink-muted transition-colors',
        'hover:border-accent/50 hover:bg-accent-soft hover:text-accent',
      )}
    >
      <Plus size={14} />
      {icon}
      {label}
    </button>
  );
}
