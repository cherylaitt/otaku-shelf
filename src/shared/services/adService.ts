/**
 * Ad service abstraction for the gacha "watch an ad for a pull" loop.
 *
 * `MockAdService` below simulates a rewarded ad (3–5s "loading", then a
 * reward). To swap in real ads later:
 *
 *   1. `npx expo install react-native-google-mobile-ads` (or your SDK of choice).
 *   2. Create `AdMobAdService implements AdService` in this same file (or a
 *      sibling `adMobAdService.ts`), wiring `showRewardedAd()` to the real
 *      SDK's load + show + reward-earned callback flow.
 *   3. Change the single line in `getAdService()` below to return the new
 *      implementation instead of `mockAdServiceInstance`.
 *
 * No UI or store code needs to change — every screen depends only on the
 * `AdService` interface.
 */

export interface RewardedAdResult {
  rewarded: boolean;
}

export interface AdService {
  /** Whether an ad is currently available to show. Mock is always ready. */
  isReady(): boolean;
  /** Shows a rewarded ad and resolves once the user has earned (or missed) the reward. */
  showRewardedAd(): Promise<RewardedAdResult>;
}

const MIN_DELAY_MS = 3000;
const MAX_DELAY_MS = 5000;

class MockAdService implements AdService {
  isReady(): boolean {
    return true;
  }

  showRewardedAd(): Promise<RewardedAdResult> {
    const delay = MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
    return new Promise((resolve) => {
      setTimeout(() => resolve({ rewarded: true }), delay);
    });
  }
}

const mockAdServiceInstance = new MockAdService();

export function getAdService(): AdService {
  return mockAdServiceInstance;
}
