import React, { useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { BannerAd, BannerAdSize, useForeground } from 'react-native-google-mobile-ads';
import { INVENTORY_BANNER_AD_UNIT_ID } from '../services/ads';
import { colors } from '../theme/theme';

/**
 * Best-effort height for the very first render, before the SDK has told us
 * the real adaptive-banner height for this device's width (via
 * `onAdLoaded`/`onSizeChange` below). Standard (non-adaptive) mobile banner
 * height — adaptive banners on typical phone widths land close to this, so
 * there's little to no visible jump once the real height arrives, and the
 * reserved space is never a jarring 0 -> full-height pop-in.
 */
const INITIAL_HEIGHT_GUESS = 50;

/**
 * Reserves and fills space for an adaptive banner ad, per the "Phase 1:
 * Banner Ads" spec in README — used ONLY on the Inventory List screen.
 *
 * - Space is reserved with a themed placeholder background BEFORE the ad
 *   loads (no white flash / no dead gap), sized to `INITIAL_HEIGHT_GUESS`
 *   until the SDK reports the real adaptive height for this device's width
 *   via `onAdLoaded`/`onSizeChange` — never a hardcoded height across all
 *   devices.
 * - If the ad fails to load (no fill, no network, etc.), the reserved
 *   space collapses to 0 rather than sitting there empty forever.
 * - The screen that renders this is expected to lay it out as a normal
 *   flex sibling of its scrollable content (not absolutely positioned),
 *   so the content area resizes to the remaining space for free — no
 *   separate "with banner" / "without banner" layout branch needed.
 */
export function BannerAdSlot() {
  const [height, setHeight] = useState(INITIAL_HEIGHT_GUESS);
  const [failed, setFailed] = useState(false);
  const bannerRef = useRef<BannerAd>(null);

  // iOS can silently drop a loaded banner's WKWebView while the app is
  // backgrounded; reload on foreground so it doesn't come back blank.
  useForeground(() => {
    if (Platform.OS === 'ios') bannerRef.current?.load();
  });

  if (failed) return null;

  return (
    <View style={[styles.reserved, { height }]}>
      <BannerAd
        ref={bannerRef}
        unitId={INVENTORY_BANNER_AD_UNIT_ID}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        onAdLoaded={({ height: loadedHeight }) => setHeight(loadedHeight)}
        onSizeChange={({ height: newHeight }) => setHeight(newHeight)}
        onAdFailedToLoad={() => setFailed(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  reserved: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgElevated,
    overflow: 'hidden',
  },
});
