import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ArrowDown,
  Calculator as CalculatorIcon,
  ImageUp,
  NotebookPen,
  PenLine,
  RefreshCw,
  RotateCcw,
  Send,
  Square,
  TriangleAlert,
  X,
} from 'lucide-react';
import { Button, IconButton } from '@/components/ui/Button';
import { RichText } from '@/components/ui/RichText';
import { ConstellationMark } from '@/components/art/HeroArt';
import { SenseiOwl, SenseiOwlGlyph } from '@/components/art/SenseiOwl';
import { HandwritingPanel } from './HandwritingPanel';
import { CalculatorPanel } from './CalculatorPanel';
import { ScratchpadPanel } from './ScratchpadPanel';
import { NotebookSheet } from '@/components/notebook/NotebookSheet';
import { FREE_DEFAULT, type NotebookContext } from '@/lib/notebook';
import { seeWork } from '@/lib/api';
import { digest, observe } from '@/lib/observe';
import { useTutorChat } from '@/hooks/useTutorChat';
import type { ChatMessage } from '@/hooks/useTutorChat';
import { useSettings } from '@/state/settings';
import type { ContextType, TutorContextData } from '@/lib/types';
import { t } from '@/i18n/strings';
import { cn } from '@/lib/utils';

/** A picture of the student's own work, inserted into the composer. */
interface Attachment {
  id: string;
  kind: 'sketch' | 'image';
  dataUri?: string;
  name?: string;
}

export interface TutorChatProps {
  contextType: ContextType;
  contextData: Omit<TutorContextData, 'language'>;
  suggestions?: string[];
  /** Message pushed into the tutor on mount / when it changes identity. */
  seed?: { key: string; message: string } | null;
  title?: string;
  subtitle?: ReactNode;
  emptyBody?: string;
  placeholder?: string;
  className?: string;
  /** Docked = lives beside lesson content; page = standalone route. */
  variant?: 'docked' | 'page';
}

export function TutorChat({
  contextType,
  contextData,
  suggestions = [],
  seed = null,
  title = t.tutor.title,
  subtitle,
  emptyBody = t.tutor.emptyBody,
  placeholder = t.tutor.placeholder,
  className,
  variant = 'docked',
}: TutorChatProps) {
  const { language } = useSettings();
  const chat = useTutorChat({ contextType, contextData, language });
  const [input, setInput] = useState('');
  const [openTool, setOpenTool] = useState<null | 'image' | 'calc' | 'scratch' | 'notebook'>(null);
  const [pinned, setPinned] = useState(true);
  /** Work the student has inserted but not yet sent. */
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [reading, setReading] = useState(false);

  // Bind the tutor's notebook to whatever problem this chat is about, so the
  // notebook opened here is the same one used on the lesson or practice question.
  const notebookContext: NotebookContext = contextData.lesson_id
    ? { kind: 'lesson', id: String(contextData.lesson_id) }
    : contextData.question_id
      ? { kind: 'practice', id: String(contextData.question_id) }
      : FREE_DEFAULT;

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const seedKeyRef = useRef<string | null>(null);

  const { send, reset } = chat;

  // Fire a preloaded question (e.g. "Ask Sensei why" from practice) once per key.
  useEffect(() => {
    if (!seed || seedKeyRef.current === seed.key) return;
    seedKeyRef.current = seed.key;
    reset();
    // Let the reset flush before starting the new turn.
    const id = window.setTimeout(() => send(seed.message), 0);
    return () => window.clearTimeout(id);
  }, [seed, send, reset]);

  // Stick to the bottom while streaming unless the student scrolled up.
  useLayoutEffect(() => {
    if (!pinned) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat.messages, chat.phase, pinned]);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
    setPinned(atBottom);
  }, []);

  const submit = useCallback(
    (text: string) => {
      const value = text.trim();
      if (!value || chat.phase !== 'idle') return;
      setPinned(true);
      observe('tutor.user', { text: value });
      send(value, { observation: digest() ?? undefined });
      setInput('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    },
    [chat.phase, send],
  );

  /**
   * Send with whatever the student has inserted.
   *
   * Images cannot ride a text turn, so each is read by the vision endpoint first
   * and the resulting notes go into `seen_work` — the tutor then talks about the
   * actual lines. If the server has no vision model the notes come back null and
   * we send anyway rather than pretend the work was read.
   */
  const submitWithWork = useCallback(
    async (text: string) => {
      const value = text.trim();
      if (chat.phase !== 'idle') return;
      const pics = attachments.filter((a) => a.dataUri);
      if (!value && !pics.length) return;

      if (!pics.length) {
        submit(value);
        return;
      }

      setPinned(true);
      setReading(true);
      const problem =
        typeof contextData.problem === 'string' ? (contextData.problem as string) : undefined;

      const notes = await Promise.all(
        pics.map(async (a) => {
          try {
            const r = await seeWork(a.dataUri!, problem, language);
            return r.note ? `${a.kind === 'sketch' ? 'Their sketch' : 'Their photo'}: ${r.note}` : null;
          } catch {
            return null;
          }
        }),
      );
      setReading(false);

      const seen = notes.filter(Boolean).join('\n\n');
      const message =
        value ||
        (pics[0].kind === 'sketch'
          ? 'I drew my working — can you check it?'
          : 'Here is my working — can you check it?');

      observe('tutor.user', { text: message, attachments: pics.length });
      send(message, {
        observation: digest() ?? undefined,
        ...(seen ? { seen_work: seen } : {}),
      });
      setInput('');
      setAttachments([]);
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    },
    [attachments, chat.phase, contextData, language, send, submit],
  );

  /** Put a picture of the student's work into the composer. */
  const attach = useCallback((a: Omit<Attachment, 'id'>) => {
    setAttachments((prev) => [...prev, { ...a, id: `att_${Date.now()}_${prev.length}` }]);
    observe(a.kind === 'sketch' ? 'sketch.insert' : 'image.insert', {});
    setOpenTool(null);
  }, []);

  // Drop a calculator result into the composer, appending after a space if the
  // student already typed something, and focus so they can keep going.
  const insertText = useCallback((text: string) => {
    setInput((prev) => (prev ? `${prev.replace(/\s+$/, '')} ${text}` : text));
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, []);

  const busy = chat.phase !== 'idle';
  const isEmpty = chat.messages.length === 0;
  const chips = isEmpty ? suggestions.slice(0, 4) : chat.followUps;

  return (
    <section
      className={cn(
        // Translucent so the page aurora — and, in a lesson, the docked pane's
        // own glow — reads behind the transcript.
        'relative flex min-h-0 flex-col overflow-hidden bg-surface/70',
        variant === 'docked' ? 'h-full' : 'h-full rounded-2xl border border-line shadow-card',
        className,
      )}
      aria-label={title}
    >
      {/* header */}
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-5 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-glow-sm">
            <SenseiOwl size={36} />
            {busy ? (
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 animate-pulse rounded-full bg-success ring-2 ring-surface" />
            ) : null}
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold tracking-[-0.01em] text-ink">{title}</h2>
            <p className="truncate text-2xs text-ink-muted">
              {subtitle ?? t.tutor.subtitle}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <IconButton label={t.tutor.clear} onClick={reset} disabled={isEmpty && !busy}>
            <RotateCcw size={16} />
          </IconButton>
        </div>
      </header>

      {/* transcript */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="s-scroll relative min-h-0 flex-1 overflow-y-auto px-5 py-5"
      >
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-2 text-center">
            <ConstellationMark className="h-24 w-32 opacity-90" />
            <SenseiOwl size={52} className="shadow-glow-sm rounded-2xl" />
            <div className="max-w-xs space-y-1.5">
              <p className="text-sm font-semibold text-ink">{t.tutor.emptyTitle}</p>
              <p className="text-[13px] leading-relaxed text-ink-muted">{emptyBody}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {chat.messages.map((m) => (
              <Bubble key={m.id} message={m} onRetry={chat.retryLast} />
            ))}
            {chat.phase === 'connecting' ? (
              <ThinkingRow step={chat.progressStep} />
            ) : null}
          </div>
        )}

        {!pinned && !isEmpty ? (
          <button
            type="button"
            onClick={() => {
              setPinned(true);
              const el = scrollRef.current;
              if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
            }}
            className="sticky bottom-1 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-2xs font-medium text-ink-soft shadow-card transition hover:border-line-strong"
          >
            <ArrowDown size={12} />
            {t.tutor.scrollToLatest}
          </button>
        ) : null}
      </div>

      {/* suggestion chips */}
      {chips.length ? (
        <div className="shrink-0 border-t border-line px-5 py-3">
          {isEmpty ? (
            <p className="mb-2 text-2xs font-medium uppercase tracking-wide text-ink-faint">
              {t.tutor.suggestedPrompts}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {chips.map((s, i) => (
              <button
                key={`${s}-${i}`}
                type="button"
                disabled={busy}
                onClick={() => submit(s)}
                className={cn(
                  'rounded-full border border-line bg-surface-alt px-3 py-1.5 text-left text-[12.5px] text-ink-soft',
                  'transition-all duration-200 ease-smooth hover:border-accent/40 hover:bg-accent-soft hover:text-accent',
                  'disabled:opacity-40 disabled:pointer-events-none',
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* composer */}
      <div className="shrink-0 border-t border-line bg-surface/85 px-5 py-4">
        {/* math & science toolbox */}
        <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
          <ToolChip
            icon={<CalculatorIcon size={14} />}
            label={t.tools.calculator}
            onClick={() => setOpenTool('calc')}
          />
          <ToolChip
            icon={<PenLine size={14} />}
            label={t.tools.scratchpad}
            onClick={() => setOpenTool('scratch')}
          />
          <ToolChip
            icon={<ImageUp size={14} />}
            label={t.tools.image}
            onClick={() => setOpenTool('image')}
          />
          <ToolChip
            icon={<NotebookPen size={14} />}
            label={t.notebook.open}
            onClick={() => setOpenTool('notebook')}
          />
        </div>
        {/* inserted work, waiting to be sent */}
        {attachments.length ? (
          <div className="mb-2.5 flex flex-wrap gap-2">
            {attachments.map((a) => (
              <div
                key={a.id}
                className="group relative h-16 w-20 overflow-hidden rounded-lg border border-line bg-white"
              >
                <img src={a.dataUri} alt={a.name ?? a.kind} className="h-full w-full object-contain" />
                <button
                  type="button"
                  onClick={() => setAttachments((prev) => prev.filter((x) => x.id !== a.id))}
                  aria-label={t.handwriting.remove}
                  className="absolute right-0.5 top-0.5 rounded bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X size={11} />
                </button>
              </div>
            ))}
            {reading ? (
              <span className="self-center text-2xs text-ink-muted">{t.tutor.readingWork}</span>
            ) : null}
          </div>
        ) : null}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submitWithWork(input);
          }}
          className="flex items-end gap-2"
        >
          <div className="relative flex-1">
            <textarea
              ref={textareaRef}
              value={input}
              rows={1}
              placeholder={placeholder}
              aria-label={placeholder}
              onChange={(e) => {
                setInput(e.target.value);
                const el = e.currentTarget;
                el.style.height = 'auto';
                el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void submitWithWork(input);
                }
              }}
              className={cn(
                'max-h-40 w-full resize-none rounded-xl border border-line bg-surface-alt px-3.5 py-2.5 pr-3',
                'text-sm leading-relaxed text-ink placeholder:text-ink-faint',
                'transition-colors duration-200 focus:border-accent focus:bg-surface focus:outline-none focus:ring-2 focus:ring-accent/25',
              )}
            />
          </div>
          {busy ? (
            <Button type="button" variant="secondary" onClick={chat.stop} className="h-10 w-10 px-0">
              <Square size={14} className="fill-current" />
              <span className="sr-only">{t.tutor.stop}</span>
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={(!input.trim() && !attachments.length) || reading}
              className="h-10 w-10 px-0"
            >
              <Send size={16} />
              <span className="sr-only">{t.tutor.send}</span>
            </Button>
          )}
        </form>
        <div className="mt-2 flex items-center justify-between gap-3 text-2xs text-ink-faint">
          <span>{t.tutor.composerHint}</span>
          {chat.model ? (
            <span className="truncate font-mono" title={`${t.tutor.modelLabel}: ${chat.model}`}>
              {chat.model}
            </span>
          ) : null}
        </div>
      </div>

      <CalculatorPanel
        open={openTool === 'calc'}
        onClose={() => setOpenTool(null)}
        onInsert={insertText}
      />
      <ScratchpadPanel
        open={openTool === 'scratch'}
        onClose={() => setOpenTool(null)}
        // Insert the drawing into the conversation rather than downloading it —
        // the point is for Sensei to look at it, not for the student to file it.
        onInsert={(dataUri) => attach({ kind: 'sketch', dataUri })}
        insertLabel={t.scratch.insertChat}
      />
      <HandwritingPanel
        open={openTool === 'image'}
        onClose={() => setOpenTool(null)}
        onInsert={(dataUri, name) => attach({ kind: 'image', dataUri, name })}
        onAskInText={(msg) => submit(msg)}
      />
      <NotebookSheet
        open={openTool === 'notebook'}
        onClose={() => setOpenTool(null)}
        context={notebookContext}
        // Attach pulls the working into the composer but leaves the notebook
        // open, so the student can keep jotting while they talk it through.
        // Sketches and photos ride along as attachments, so the tutor reads the
        // actual drawing rather than a "[sketch]" placeholder.
        onAttach={({ message, images }) => {
          insertText(message);
          for (const dataUri of images) attach({ kind: 'sketch', dataUri });
        }}
      />
    </section>
  );
}

/** A pill in the composer's tool row. */
function ToolChip({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface-alt px-2.5 py-1.5',
        'text-2xs font-medium text-ink-soft transition-all duration-200 ease-smooth',
        'hover:border-accent/40 hover:bg-accent-soft hover:text-accent',
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function Bubble({ message, onRetry }: { message: ChatMessage; onRetry: () => void }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="s-gradient-fill max-w-[85%] animate-fade-up rounded-2xl rounded-br-md px-4 py-2.5 text-[13.5px] leading-relaxed text-white shadow-glow-sm">
          <p className="whitespace-pre-wrap">{message.text}</p>
        </div>
      </div>
    );
  }

  if (message.error && !message.text) {
    return (
      <div className="animate-fade-up rounded-2xl border border-danger/30 bg-danger-bg px-4 py-3">
        <div className="flex items-start gap-2.5">
          <TriangleAlert size={15} className="mt-0.5 shrink-0 text-danger-text" />
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-[13px] font-semibold text-danger-text">{t.tutor.errorPrefix}</p>
            <p className="break-words text-[12.5px] leading-relaxed text-danger-text/90">
              {message.error}
            </p>
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-danger-text underline underline-offset-2 hover:opacity-80"
            >
              <RefreshCw size={12} />
              {t.tutor.retryTurn}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-up">
      <div className="mb-1.5 flex items-center gap-1.5">
        <SenseiOwlGlyph size={13} className="text-accent" />
        <span className="text-2xs font-semibold uppercase tracking-wide text-ink-faint">
          {t.tutor.sensei}
        </span>
      </div>
      <RichText
        className="text-[13.5px] text-ink-soft"
        trailing={message.streaming ? <span className="s-caret" /> : null}
      >
        {message.text}
      </RichText>
      {message.error && message.text ? (
        <p className="mt-2 text-2xs text-danger-text">{message.error}</p>
      ) : null}
    </div>
  );
}

function ThinkingRow({ step }: { step: string | null }) {
  // A `progress` step other than "starting" almost always means the router is
  // cold-swapping a local model — say so instead of spinning silently.
  const loadingModel = Boolean(step && step !== 'starting');
  return (
    <div className="flex items-center gap-2.5 text-[13px] text-ink-muted" role="status">
      <span className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent"
            style={{ animationDelay: `${i * 160}ms` }}
          />
        ))}
      </span>
      <span>{loadingModel ? t.tutor.loadingModel : t.tutor.thinking}</span>
    </div>
  );
}
