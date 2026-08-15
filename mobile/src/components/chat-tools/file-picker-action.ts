import * as DocumentPicker from 'expo-document-picker';

export interface FileAttachment {
  uri: string;
  name: string;
  size: number;
  mimeType: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

/**
 * Opens the system document picker and returns the selected file.
 *
 * Returns:
 * - `{ file }` on success
 * - `{ error: 'too_big' }` when the file exceeds MAX_FILE_SIZE
 * - `null` when the user cancels
 */
export async function pickFile(): Promise<
  { file: FileAttachment } | { error: 'too_big' } | null
> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
    });

    if (result.canceled) return null;

    const asset = result.assets[0];
    if (!asset) return null;

    if (asset.size && asset.size > MAX_FILE_SIZE) {
      return { error: 'too_big' };
    }

    return {
      file: {
        uri: asset.uri,
        name: asset.name,
        size: asset.size ?? 0,
        mimeType: asset.mimeType ?? 'application/octet-stream',
      },
    };
  } catch {
    return null;
  }
}
