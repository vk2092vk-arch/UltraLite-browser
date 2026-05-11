// Web stub — react-native-google-mobile-ads is native-only.
// Native bundling uses AdManager.ts; web bundling picks this file.

export async function initAds(): Promise<void> {}
export function preloadAppOpen(): () => void {
  return () => {};
}
export function showAppOpenIfReady(): boolean {
  return false;
}
export function trackClick(): void {}
export function preloadRewarded(): void {}
export async function showRewarded(_onEarned: () => void): Promise<boolean> {
  return false;
}
export function isRewardedReady(): boolean {
  return false;
}
