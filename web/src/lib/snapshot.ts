import type { NotebookBlock } from '@/lib/notebook';

/**
 * Render a notebook page to a single image for the tutor to look at.
 *
 * The owl watching a solve sheet needs *the page*, not one drawing: a student's
 * working is usually a couple of typed lines and a sketch beside them. This
 * composites the blocks in order — notes as wrapped text, sketches and photos
 * drawn to fit — so what the vision model sees is what the student sees.
 *
 * Async because embedded images have to decode before they can be drawn.
 */

const W = 900;
const PAD = 28;
const LINE = 26;

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const out: string[] = [];
  for (const paragraph of text.split('\n')) {
    if (!paragraph.trim()) {
      out.push('');
      continue;
    }
    let line = '';
    for (const word of paragraph.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width > maxWidth && line) {
        out.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    if (line) out.push(line);
  }
  return out;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export async function renderNotebookSnapshot(
  blocks: NotebookBlock[],
  title?: string,
): Promise<string | null> {
  if (!blocks.length && !title?.trim()) return null;

  // Decode first: heights are needed before the canvas can be sized.
  const images = new Map<string, HTMLImageElement>();
  for (const b of blocks) {
    if (b.type !== 'note' && b.image && !images.has(b.image)) {
      const img = await loadImage(b.image);
      if (img) images.set(b.image, img);
    }
  }

  // Measure with a throwaway context, then draw for real.
  const measure = document.createElement('canvas').getContext('2d');
  if (!measure) return null;
  measure.font = '17px system-ui, sans-serif';

  const maxText = W - PAD * 2;
  let height = PAD + (title?.trim() ? LINE + 14 : 0);
  const layout: { block: NotebookBlock; lines?: string[]; h: number }[] = [];

  for (const b of blocks) {
    if (b.type === 'note') {
      const lines = wrap(measure, b.text || '', maxText);
      const h = Math.max(LINE, lines.length * LINE) + 12;
      layout.push({ block: b, lines, h });
      height += h;
    } else {
      const img = images.get(b.image);
      const h = img ? Math.min(360, (img.height / img.width) * maxText) + 14 : 0;
      layout.push({ block: b, h });
      height += h;
    }
  }
  height += PAD;

  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = Math.max(160, Math.round(height));
  const ctx = cv.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.fillStyle = '#111111';

  let y = PAD;
  if (title?.trim()) {
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText(title.trim(), PAD, y + 18);
    y += LINE + 14;
  }

  ctx.font = '17px system-ui, sans-serif';
  for (const item of layout) {
    if (item.block.type === 'note') {
      ctx.fillStyle = '#111111';
      for (const line of item.lines ?? []) {
        ctx.fillText(line, PAD, y + 18);
        y += LINE;
      }
      y += 12;
    } else {
      const img = images.get(item.block.image);
      if (img) {
        const h = Math.min(360, (img.height / img.width) * maxText);
        ctx.drawImage(img, PAD, y, maxText, h);
        ctx.strokeStyle = '#dddddd';
        ctx.strokeRect(PAD + 0.5, y + 0.5, maxText - 1, h - 1);
        y += h + 14;
      }
    }
  }

  return cv.toDataURL('image/jpeg', 0.85);
}
