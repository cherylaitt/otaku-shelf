import * as ImagePicker from 'expo-image-picker';
import { Directory, File, Paths } from 'expo-file-system';
import { generateId } from '../utils/id';

/**
 * Handles picking photos (camera or gallery) and copying them into the
 * app's permanent document directory. We never persist the transient
 * OS-provided cache URI in SQLite — only the copied, app-owned path, which
 * survives app restarts and OS cache clears.
 */

export type ImagePickResult =
  | { status: 'success'; uri: string }
  | { status: 'cancelled' }
  | { status: 'permission-denied' };

const PHOTOS_DIR = new Directory(Paths.document, 'item-photos');

function ensurePhotosDir(): void {
  if (!PHOTOS_DIR.exists) {
    PHOTOS_DIR.create({ intermediates: true, idempotent: true });
  }
}

function copyToPermanentStorage(sourceUri: string): string {
  ensurePhotosDir();
  const extMatch = sourceUri.match(/\.(\w+)(\?.*)?$/);
  const ext = extMatch ? extMatch[1] : 'jpg';
  const destination = new File(PHOTOS_DIR, `${generateId()}.${ext}`);
  const sourceFile = new File(sourceUri);
  sourceFile.copySync(destination);
  return destination.uri;
}

export const imageService = {
  async pickFromCamera(): Promise<ImagePickResult> {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return { status: 'permission-denied' };

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return { status: 'cancelled' };

    const permanentUri = copyToPermanentStorage(result.assets[0].uri);
    return { status: 'success', uri: permanentUri };
  },

  async pickFromGallery(): Promise<ImagePickResult> {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return { status: 'permission-denied' };

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return { status: 'cancelled' };

    const permanentUri = copyToPermanentStorage(result.assets[0].uri);
    return { status: 'success', uri: permanentUri };
  },

  /** Deletes a previously-copied photo (e.g. when an item is deleted or its photo replaced). */
  deletePhoto(uri: string | null | undefined): void {
    if (!uri) return;
    try {
      const file = new File(uri);
      if (file.exists) file.delete();
    } catch {
      // best-effort cleanup; ignore failures
    }
  },
};
