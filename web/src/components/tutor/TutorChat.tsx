import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ArrowDown,
  ImageUp,
  RefreshCw,
  RotateCcw,
  Send,
  Sparkles,
  Square,
  TriangleAlert,
} from 'lucide-react';
import { Button, IconButton } from '@/components/ui/Button';
import { RichText } from '@/components/ui/RichText';
import { HandwritingPanel } from './HandwritingPanel';
import { useTutorChat } from '@/hooks/useTutorChat';
import type { ChatMessage } from '@/hooks/useTutorChat';
import { useSettings } from '@/state/settings';
import type { ContextType, TutorContextData } from '@/lib/types';
import { t } from '@/i18n/strings';
import { cn } from '@/lib/utils';

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
  const [uploadOpen, setUploadOpen] = useState(false);
  const [pinned, setPinned] = useState(true);

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
      send(value);
      setInput('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    },
    [chat.phase, send],
  );

  const busy = chat.phase !== 'idle';
  const isEmpty = chat.messages.length === 0;
  const chips = isEmpty ? suggestions.slice(0, 4) : chat.followUps;

  return (
    <section
      className={cn(
        'flex min-h-0 flex-col overflow-hidden bg-surface',
        variant === 'docked' ? 'h-full' : 'h-full rounded-2xl border border-line shadow-soft',
        className,
      )}
      aria-label={title}
    >
      {/* header */}
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-5 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <Sparkles size={17} />
            {busy ? (
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 animate-pulse rounded-full bg-accent ring-2 ring-surface" />
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
          <IconButton label={t.tutor.attach} onClick={() => setUploadOpen(true)}>
            <ImageUp size={17} />
          </IconButton>
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
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
              <Sparkles size={22} />
            </span>
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
      <div className="shrink-0 border-t border-line bg-surface px-5 py-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(input);
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
                  submit(input);
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
            <Button type="submit" disabled={!input.trim()} className="h-10 w-10 px-0">
              <Send size={16} />
              <span className="sr-only">{t.tutor.send}</span>
            </Button>
          )}
        </form>
        <div className="mt-2 flex items-center justify-between gap-3 text-2xs text-ink-faint">
          <span>Enter to send · Shift+Enter for a new line</span>
          {chat.model ? (
            <span className="truncate font-mono" title={`${t.tutor.modelLabel}: ${chat.model}`}>
              {chat.model}
            </span>
          ) : null}
        </div>
      </div>

      <HandwritingPanel
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onAskInText={(msg) => submit(msg)}
      />
    </section>
  );
}

function Bubble({ message, onRetry }: { message: ChatMessage; onRetry: () => void }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] animate-fade-up rounded-2xl rounded-br-md bg-accent px-4 py-2.5 text-[13.5px] leading-relaxed text-white shadow-soft dark:text-ink-inverse">
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
        <Sparkles size={12} className="text-accent" />
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
