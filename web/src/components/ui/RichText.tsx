import { Fragment } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Deliberately tiny markdown-ish renderer for tutor output.
 *
 * A full markdown library is ~40 kB for a feature set the tutor never uses.
 * This handles what the model actually emits: paragraphs, `-`/`*`/`1.` lists,
 * **bold**, *italic*, `inline code` and ```fenced``` blocks. Everything is
 * rendered as React elements, so there is no dangerouslySetInnerHTML anywhere.
 */

type Inline = { text: string; bold?: boolean; italic?: boolean; code?: boolean };

const INLINE_RE = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\n]+\*)/g;

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

function Inlines({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((part, i) => {
        if (part.code) {
          return (
            <code
              key={i}
              className="rounded-[5px] bg-surface-alt px-1.5 py-0.5 font-mono text-[0.86em] text-accent"
            >
              {part.text}
            </code>
          );
        }
        if (part.bold) {
          return (
            <strong key={i} className="font-semibold text-ink">
              {part.text}
            </strong>
          );
        }
        if (part.italic) {
          return (
            <em key={i} className="italic">
              {part.text}
            </em>
          );
        }
        return <Fragment key={i}>{part.text}</Fragment>;
      })}
    </>
  );
}

interface Block {
  kind: 'p' | 'ul' | 'ol' | 'code';
  lines: string[];
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
  const blocks = parseBlocks(children);

  if (!blocks.length) {
    return <div className={className}>{trailing}</div>;
  }

  return (
    <div className={cn('space-y-3', className)}>
      {blocks.map((b, bi) => {
        const isLast = bi === blocks.length - 1;
        const tail = isLast ? trailing : null;

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
