import { SubjectLiftNativeModule } from '../../../modules/subject-lift/src/SubjectLift.types';

/**
 * On-device background removal for uploaded/captured item photos (see
 * README "Background removal"). Wraps the local `subject-lift` Expo module
 * (iOS Vision `VNGenerateForegroundInstanceMaskRequest`, Android ML Kit
 * Subject Segmentation) behind a small, defensively-typed surface so the
 * UI never has to know which platform API is behind it, or handle a
 * missing native module specially.
 *
 * `requireNativeModule` (inside the native module file) throws synchronously
 * if the native module hasn't been compiled into the running binary yet —
 * which is true right now until a fresh native build/EAS build picks up
 * `modules/subject-lift` (it's a brand-new native module; see the doc
 * comments on the Swift/Kotlin implementations for exactly what still
 * needs on-device verification). Importing it lazily inside a try/catch
 * means the rest of the app keeps working normally in the meantime — this
 * feature just reports itself as unavailable, exactly like it would on an
 * OS version too old to support it.
 */
function loadNativeModule(): SubjectLiftNativeModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('../../../modules/subject-lift/src/SubjectLiftModule').default;
  } catch {
    return null;
  }
}

const nativeModule = loadNativeModule();

export type BackgroundRemovalResult =
  | { status: 'success'; uri: string }
  | { status: 'unavailable' }
  | { status: 'error'; message: string };

export const backgroundRemovalService = {
  /** Cheap, synchronous check — use this to decide whether to even show a "Remove Background" option. */
  isAvailable(): boolean {
    if (!nativeModule) return false;
    try {
      return nativeModule.isAvailable();
    } catch {
      return false;
    }
  },

  /**
   * Cuts the subject out of the photo at `uri` and returns a new, separate
   * file (the original is left untouched, so "keep original" always has
   * something to fall back to). `status: 'unavailable'` covers every
   * "couldn't do it, and that's expected" case (old OS, no subject
   * detected, capped-off Android version — see the native module comments)
   * uniformly, so callers don't need to distinguish them; only a genuine
   * unexpected failure surfaces as `'error'`.
   */
  async removeBackground(uri: string): Promise<BackgroundRemovalResult> {
    if (!nativeModule) return { status: 'unavailable' };
    try {
      const resultUri = await nativeModule.liftSubject(uri);
      return resultUri ? { status: 'success', uri: resultUri } : { status: 'unavailable' };
    } catch (e) {
      return { status: 'error', message: e instanceof Error ? e.message : 'Background removal failed.' };
    }
  },
};
