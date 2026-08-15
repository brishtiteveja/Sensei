import * as ImagePicker from 'expo-image-picker';
import { showAppToast } from '@/feedback/toast';

export interface ImageAttachment {
  uri: string;
  width: number;
  height: number;
  fileName: string;
}

export async function pickImage(
  source: 'camera' | 'gallery',
): Promise<ImageAttachment | null> {
  try {
    // Request the appropriate permission
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      showAppToast({
        type: 'info',
        title: 'Permission required',
        message:
          source === 'camera'
            ? 'Camera permission is needed to take a photo.'
            : 'Photo library permission is needed to choose an image.',
      });
      return null;
    }

    // Launch the picker
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: 'images',
            quality: 0.8,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: 'images',
            quality: 0.8,
          });

    if (result.canceled || !result.assets?.[0]) {
      return null;
    }

    const asset = result.assets[0];
    // Extract filename from URI (last path segment) or fall back to a default
    const fileName =
      asset.fileName ?? asset.uri.split('/').pop() ?? `image-${Date.now()}.jpg`;

    return {
      uri: asset.uri,
      width: asset.width,
      height: asset.height,
      fileName,
    };
  } catch {
    showAppToast({
      type: 'error',
      title: 'Image picker error',
      message: 'Could not open the image picker. Please try again.',
    });
    return null;
  }
}
