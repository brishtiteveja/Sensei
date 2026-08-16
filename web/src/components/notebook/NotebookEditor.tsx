import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  ImageUp,
  MessageCircle,
  Pencil,
  PenLine,
  Plus,
  Smartphone,
  Trash2,
  Type,
} from 'lucide-react';
import { Button, IconButton } from '@/components/ui/Button';
import { RichText } from '@/components/ui/RichText';
import { EmptyState } from '@/components/ui/States';
import { ScratchpadPanel } from '@/components/tutor/ScratchpadPanel';
import { PhoneHandoff } from '@/components/tutor/PhoneHandoff';
import { fileToDownscaledDataUri } from '@/lib/image';
import { observe } from '@/lib/observe';
import {
  blockId,
  compileHandoff,
  getNotebook,
  saveNotebook,
  type Notebook,
  type NotebookBlock,
  type NotebookContext,
  type NotebookHandoff,
} from '@/lib/notebook';
import { t } from '@/i18n/strings';
import { cn } from '@/lib/utils';

/**
 * The block-editing surface for one notebook, self-contained: it loads the
 * context's notebook, autosaves every edit, and knows nothing about where it is
 * mounted — the full Notebook page, a sheet over Practice/Lesson, or the tutor.
 *
 * `onAttach`, when given, adds an action that hands the whole notebook to the
 * caller -- the prose as a message plus the sketches and photos, which have to
 * travel separately because only the vision endpoint can read them.
 */
export function NotebookEditor({
  context,
  onAttach,
  compact,
}: {
  context: NotebookContext;
  onAttach?: (handoff: NotebookHandoff) => void;
  /** Denser layout for use inside a sheet rather than a full page. */
  compact?: boolean;
}) {
  const key = context.kind + ':' + context.id;
  const [nb, setNb] = useState<Notebook>(() => getNotebook(context));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sketchTarget, setSketchTarget] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Reload when the bound context changes (e.g. the practice question advances).
  useEffect(() => {
    setNb(getNotebook(context));
    setEditingId(null);
    observe('notebook.open', { key, label: context.label });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Autosave. Skip the very first render for this key so opening a notebook
  // doesn't rewrite its updatedAt without an edit.
  const savedKey = useRef<string | null>(null);
  useEffect(() => {
    if (savedKey.current !== key) {
      savedKey.current = key;
      return;
    }
    saveNotebook(nb);
  }, [nb, key]);

  const update = useCallback((fn: (blocks: NotebookBlock[]) => NotebookBlock[]) => {
    setNb((prev) => ({ ...prev, blocks: fn(prev.blocks) }));
  }, []);

  const addNote = () => {
    const id = blockId();
    update((b) => [...b, { id, type: 'note', text: '' }]);
    setEditingId(id);
    observe('notebook.block', { op: 'add', key, blockType: 'note' });
  };

  const setNoteText = (id: string, text: string) =>
    update((b) => b.map((x) => (x.id === id && x.type === 'note' ? { ...x, text } : x)));

  const remove = (id: string) => {
    const gone = nb.blocks.find((x) => x.id === id);
    update((b) => b.filter((x) => x.id !== id));
    if (editingId === id) setEditingId(null);
    observe('notebook.block', { op: 'remove', key, blockType: gone?.type });
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
    observe('notebook.block', { op: 'add', key, blockType: 'sketch' });
  };

  const onUpload = async (file: File | undefined | null) => {
    if (fileRef.current) fileRef.current.value = '';
    if (!file) return;
    setUploadError(null);
    try {
      const image = await fileToDownscaledDataUri(file);
      update((b) => [...b, { id: blockId(), type: 'image', image, name: file.name }]);
      observe('notebook.block', { op: 'add', key, blockType: 'image', name: file.name });
    } catch {
      setUploadError(t.notebook.uploadError);
    }
  };

  const setTitle = (title: string) => setNb((prev) => ({ ...prev, title }));
  const hasContent = nb.blocks.length > 0;

  return (
    <div className={cn('space-y-4', compact ? '' : 'mx-auto max-w-3xl pb-10')}>
      <div className="flex items-start gap-3">
        <input
          value={nb.title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t.notebook.titlePlaceholder}
          aria-label={t.notebook.titlePlaceholder}
          className={cn(
            'w-full border-none bg-transparent font-semibold tracking-[-0.02em] text-ink placeholder:text-ink-faint focus:outline-none',
            compact ? 'text-lg' : 'text-2xl',
          )}
        />
        {onAttach ? (
          <Button
            onClick={() => onAttach(compileHandoff(nb))}
            disabled={!hasContent}
            className="shrink-0"
            title={t.notebook.attachHint}
          >
            <MessageCircle size={15} />
            {t.notebook.attach}
          </Button>
        ) : null}
      </div>

      {!hasContent ? (
        <EmptyState
          icon={<PenLine size={20} />}
          title={t.notebook.empty}
          body={t.notebook.emptyBody}
          compact={compact}
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
              // Report the finished text, not every keystroke.
              onDone={() => {
                setEditingId(null);
                if (block.type === 'note' && block.text.trim()) {
                  observe('notebook.block', { op: 'edit', key, blockType: 'note', text: block.text });
                }
              }}
              onRemove={() => remove(block.id)}
              onMove={(d) => move(block.id, d)}
            />
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <AddButton icon={<Type size={15} />} label={t.notebook.addNote} onClick={addNote} />
        <AddButton
          icon={<Pencil size={15} />}
          label={t.notebook.addSketch}
          onClick={() => setSketchTarget('new')}
        />
        <AddButton
          icon={<ImageUp size={15} />}
          label={t.notebook.addImage}
          onClick={() => fileRef.current?.click()}
        />
        <AddButton
          icon={<Smartphone size={15} />}
          label={t.phone.usePhone}
          onClick={() => setPhoneOpen((v) => !v)}
        />
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => void onUpload(e.target.files?.[0])}
        />
        <span className="ml-auto text-2xs text-ink-faint">{t.notebook.saved}</span>
      </div>

      {phoneOpen ? (
        <PhoneHandoff
          mode="photo"
          onClose={() => setPhoneOpen(false)}
          onImage={(image) => {
            setPhoneOpen(false);
            update((b) => [...b, { id: blockId(), type: 'image', image, name: 'phone-photo.jpg' }]);
            observe('notebook.block', { op: 'add', key, blockType: 'image', via: 'phone' });
          }}
        />
      ) : null}

      {uploadError ? (
        <p role="alert" className="text-[13px] font-medium text-danger-text">
          {uploadError}
        </p>
      ) : null}

      <ScratchpadPanel
        open={sketchTarget !== null}
        onClose={() => setSketchTarget(null)}
        onInsert={onSketch}
      />
    </div>
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
      ) : block.type === 'image' ? (
        <figure className="space-y-1.5">
          <div className="overflow-hidden rounded-lg border border-line bg-surface-alt">
            <img
              src={block.image}
              alt={block.name ?? 'Uploaded image'}
              className="mx-auto max-h-96 w-auto"
            />
          </div>
          {block.name ? (
            <figcaption className="truncate text-2xs text-ink-faint">{block.name}</figcaption>
          ) : null}
        </figure>
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
          className={cn('block w-full text-left', !block.text.trim() && 'text-ink-faint')}
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
