const { withAndroidManifest, AndroidConfig } = require('@expo/config-plugins');

const META_DATA_NAME = 'com.google.mlkit.vision.DEPENDENCIES';

// expo-camera's AndroidManifest declares this meta-data with value "barcode_ui"
// (for its barcode scanning UI), and our local `subject-lift` module declares
// the same key with value "subject_segment" (to preload the ML Kit Subject
// Segmentation model). Android's manifest merger fails hard when two
// libraries declare different values for the same meta-data key, so we own
// the merge here at the app level: `tools:replace` plus the comma-separated
// union of every unbundled ML Kit model name we need.
// See: https://developers.google.com/android/reference/com/google/android/gms/vision/CameraSource
const MERGED_VALUE = 'barcode_ui,subject_segment';

/**
 * Resolves the manifest merger conflict between expo-camera and the local
 * subject-lift module, both of which declare
 * `com.google.mlkit.vision.DEPENDENCIES` with different values.
 */
function withMlkitVisionDependenciesMerge(config) {
  return withAndroidManifest(config, (config) => {
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);

    AndroidConfig.Manifest.ensureToolsAvailable(config.modResults);
    AndroidConfig.Manifest.removeMetaDataItemFromMainApplication(mainApplication, META_DATA_NAME);

    mainApplication['meta-data'] = mainApplication['meta-data'] ?? [];
    mainApplication['meta-data'].push({
      $: {
        'android:name': META_DATA_NAME,
        'android:value': MERGED_VALUE,
        'tools:replace': 'android:value',
      },
    });

    return config;
  });
}

module.exports = withMlkitVisionDependenciesMerge;
