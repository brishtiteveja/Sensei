import { Fragment } from 'react';
import type { ReactNode } from 'react';
import { Math } from '@/components/ui/Math';
import { cn } from '@/lib/utils';

/**
 * Deliberately tiny markdown-ish renderer for tutor output.
 *
 * A full markdown library is ~40 kB for a feature set the tutor never uses.
 * This handles what the model actually emits: paragraphs, `-`/`*`/`1.` lists,
 * **bold**, *italic*, `inline code`, ```fenced``` blocks, and LaTeX math in
 * `$…$` / `\(…\)` (inline) and `$$…$$` / `\[…\]` (display) — a chemistry and
 * physics tutor leans on math constantly. Everything is rendered as React
 * elements, so there is no dangerouslySetInnerHTML anywhere.
 */

type Inline = { text: string; bold?: boolean; italic?: boolean; code?: boolean };

const INLINE_RE = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\n]+\*)/g;

/**
 * Inline math: `$…$` (no space just inside the delimiters, so prose like
 * "$5 to $10" is left alone) or `\(…\)`. Display math is peeled off earlier,
 * at the block level, so this never sees `$$`.
 */
const INLINE_MATH_RE = /\$(?!\s)((?:\\\$|[^$\n])+?)(?<!\s)\$|\\\(([\s\S]+?)\\\)/g;

/** Display math delimiters, split out before any block parsing. */
const DISPLAY_MATH_RE = /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]/g;

function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE_RE)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push({ text: text.slice(last, idx) });
    const token = m[0];
    if (token.startsWith('**')) out.push({ text: token.slice(2, -2), bold: true });
    else if (token.startsWith('`')) out.push({ text: token.slice(1, -1), code: true });
    else out.push({ text: token.slice(1, -1), italic: true });
    last = idx + token.length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}

function InlinePart({ part }: { part: Inline }) {
  if (part.code) {
    return (
      <code className="rounded-[5px] bg-surface-alt px-1.5 py-0.5 font-mono text-[0.86em] text-accent">
        {part.text}
      </code>
    );
  }
  if (part.bold) {
    return <strong className="font-semibold text-ink">{part.text}</strong>;
  }
  if (part.italic) {
    return <em className="italic">{part.text}</em>;
  }
  return <Fragment>{part.text}</Fragment>;
}

/**
 * Split a run of text into markdown and inline-math parts. Math is pulled out
 * FIRST so a formula's `_`, `*` and `^` never reach the markdown parser and get
 * mistaken for emphasis.
 */
function Inlines({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  let last = 0;
  let key = 0;

  const pushMarkdown = (chunk: string) => {
    for (const part of parseInline(chunk)) parts.push(<InlinePart key={key++} part={part} />);
  };

  for (const m of text.matchAll(INLINE_MATH_RE)) {
    const idx = m.index ?? 0;
    if (idx > last) pushMarkdown(text.slice(last, idx));
    parts.push(<Math key={key++} latex={(m[1] ?? m[2]).trim()} />);
    last = idx + m[0].length;
  }
  if (last < text.length) pushMarkdown(text.slice(last));

  return <>{parts}</>;
}

interface Block {
  kind: 'p' | 'ul' | 'ol' | 'code' | 'math';
  lines: string[];
  /** For `kind: 'math'`, the raw LaTeX of a display equation. */
  raw?: string;
}

/**
 * Peel `$$…$$` / `\[…\]` display equations out of the source and parse the text
 * between them normally, so a centred equation becomes its own block instead of
 * being wedged (invalidly) inside a paragraph. Done before block parsing
 * because a display equation can sit mid-sentence in what the model streams.
 */
function buildBlocks(src: string): Block[] {
  const out: Block[] = [];
  let last = 0;
  for (const m of src.matchAll(DISPLAY_MATH_RE)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push(...parseBlocks(src.slice(last, idx)));
    out.push({ kind: 'math', lines: [], raw: (m[1] ?? m[2]).trim() });
    last = idx + m[0].length;
  }
  if (last < src.length) out.push(...parseBlocks(src.slice(last)));
  return out;
}

function parseBlocks(src: string): Block[] {
  const blocks: Block[] = [];
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim().startsWith('```')) {
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        body.push(lines[i]);
        i += 1;
      }
      i += 1; // closing fence (or EOF while still streaming)
      blocks.push({ kind: 'code', lines: body });
      continue;
    }

    if (!line.trim()) {
      i += 1;
      continue;
    }

    if (/^\s*[-*•]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*•]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*•]\s+/, ''));
        i += 1;
      }
      blocks.push({ kind: 'ul', lines: items });
      continue;
    }

    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+[.)]\s+/, ''));
        i += 1;
      }
      blocks.push({ kind: 'ol', lines: items });
      continue;
    }

    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^\s*[-*•]\s+/.test(lines[i]) &&
      !/^\s*\d+[.)]\s+/.test(lines[i]) &&
      !lines[i].trim().startsWith('```')
    ) {
      para.push(lines[i].trim());
      i += 1;
    }
    blocks.push({ kind: 'p', lines: para });
  }

  return blocks;
}

export function RichText({
  children,
  className,
  trailing,
}: {
  children: string;
  className?: string;
  /** Rendered inside the final block — used for the streaming caret. */
  trailing?: ReactNode;
}) {
  const blocks = buildBlocks(children);

  if (!blocks.length) {
    return <div className={className}>{trailing}</div>;
  }

  return (
    <div className={cn('space-y-3', className)}>
      {blocks.map((b, bi) => {
        const isLast = bi === blocks.length - 1;
        const tail = isLast ? trailing : null;

        if (b.kind === 'math') {
          return (
            <div key={bi}>
              <Math latex={b.raw ?? ''} display />
              {tail}
            </div>
          );
        }
        if (b.kind === 'code') {
          return (
            <pre
              key={bi}
              className="s-scroll overflow-x-auto rounded-xl border border-line bg-surface-alt px-4 py-3 font-mono text-[12.5px] leading-relaxed text-ink-soft"
            >
              <code>{b.lines.join('\n')}</code>
              {tail}
            </pre>
          );
        }
        if (b.kind === 'ul' || b.kind === 'ol') {
          const List = b.kind === 'ul' ? 'ul' : 'ol';
          return (
            <List
              key={bi}
              className={cn(
                'space-y-1.5 pl-5',
                b.kind === 'ul' ? 'list-disc' : 'list-decimal',
                'marker:text-ink-faint',
              )}
            >
              {b.lines.map((li, li_i) => (
                <li key={li_i} className="leading-relaxed">
                  <Inlines text={li} />
                  {isLast && li_i === b.lines.length - 1 ? tail : null}
                </li>
              ))}
            </List>
          );
        }
        return (
          <p key={bi} className="leading-relaxed">
            <Inlines text={b.lines.join(' ')} />
            {tail}
          </p>
        );
      })}
    </div>
  );
}
