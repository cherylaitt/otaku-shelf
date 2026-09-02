import { Platform } from 'react-native';
import mobileAds, { TestIds } from 'react-native-google-mobile-ads';
import { getTrackingPermissionsAsync, requestTrackingPermissionsAsync } from 'expo-tracking-transparency';

/**
 * TODO: fill in your real AdMob ad unit id here (from the AdMob console,
 * under the same app whose App ID is in `app.json`'s
 * `react-native-google-mobile-ads` plugin config) before submitting to the
 * stores. Leave blank to keep serving Google's test creative everywhere
 * (dev, preview, AND production) — real ad unit ids are tied to a specific
 * app + placement and won't exist until you've set one up in your own
 * AdMob account, so shipping with this blank is the safe default, not
 * shipping with a fake string would be.
 */
const PRODUCTION_INVENTORY_BANNER_AD_UNIT_ID = '';

/**
 * Banner ad unit for the Inventory List / browse screen — the ONLY screen
 * that shows a banner (see README "Ad monetization"). No banner on Shelf
 * View, Add/Edit Item, or any modal/detail screen.
 */
export const INVENTORY_BANNER_AD_UNIT_ID = PRODUCTION_INVENTORY_BANNER_AD_UNIT_ID || TestIds.ADAPTIVE_BANNER;

let initPromise: Promise<void> | null = null;

/**
 * One-time app startup sequence for ads: request the iOS App Tracking
 * Transparency permission first (only meaningful on iOS; Android is a
 * no-op there), THEN initialize the Google Mobile Ads SDK — Apple's
 * guidance is to resolve the ATT prompt before making ad requests, since
 * whether the user grants tracking affects how the very first ad request
 * on the SDK's default state is built (personalized vs non-personalized).
 * If the user declines (or on Android, which has no such prompt), ads
 * still work — they're just non-personalized, which trades lower CPM for
 * skipping the platform prompt.
 */
export function initializeAds(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      if (Platform.OS === 'ios') {
        const { status } = await getTrackingPermissionsAsync();
        if (status === 'undetermined') {
          await requestTrackingPermissionsAsync();
        }
      }
      await mobileAds().initialize();
    })();
  }
  return initPromise;
}
