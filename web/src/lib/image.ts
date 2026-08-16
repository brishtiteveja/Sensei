/**
 * Read an image File and return a downscaled data URI.
 *
 * The notebook persists to localStorage (a few MB total), and a phone photo is
 * several MB on its own, so embedding raw uploads would blow the quota after
 * one or two pictures. Downscaling to a sane working size and re-encoding as
 * JPEG keeps a page's worth of photos well within budget while staying legible
 * for reading a textbook problem or handwritten work.
 *
 * Rejects non-images. Preserves aspect ratio; only shrinks, never enlarges.
 */
export async function fileToDownscaledDataUri(
  file: File,
  { maxDim = 1400, quality = 0.78 }: { maxDim?: number; quality?: number } = {},
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('not-an-image');
  }

  const bitmap = await loadBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no-2d-context');
  // A white matte so a transparent PNG doesn't turn black once it's JPEG.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  if ('close' in bitmap && typeof bitmap.close === 'function') bitmap.close();

  return canvas.toDataURL('image/jpeg', quality);
}

/** createImageBitmap where available (fast, off-thread decode); <img> otherwise. */
async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file);
    } catch {
      /* fall through to the <img> path */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('decode-failed'));
      img.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}
