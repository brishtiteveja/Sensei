import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/**
 * Getting a photo into a shape the tutor can read.
 *
 * The picker hands back a `file://` URI to a full-resolution photo — often 12
 * megapixels. The vision model gains nothing from that: a page of handwriting
 * is legible at around 1600px on its long edge, and sending the original means
 * a multi-megabyte upload from a phone that may be on a slow connection, which
 * is the difference between a coach that answers and one that times out.
 *
 * Drawings arrive as `data:` URIs already, so they pass straight through.
 */

const MAX_EDGE = 1600;

export async function toDataUri(uri: string, maxEdge = MAX_EDGE): Promise<string> {
  if (uri.startsWith('data:')) return uri;

  const context = ImageManipulator.manipulate(uri);
  // Only the long edge is constrained; the other follows, so nothing is
  // distorted and no working is cropped off the page.
  context.resize({ width: maxEdge });
  const image = await context.renderAsync();
  const result = await image.saveAsync({
    format: SaveFormat.JPEG,
    compress: 0.75,
    base64: true,
  });

  if (!result.base64) throw new Error('Could not read that image.');
  return `data:image/jpeg;base64,${result.base64}`;
}
