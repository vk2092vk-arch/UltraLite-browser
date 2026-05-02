// Production AdMob IDs (provided by user) and Google demo test IDs.
// We hardcode demo IDs to avoid importing the native module from web bundles.
const PROD = {
  appOpen: 'ca-app-pub-9675798593675825/8089709782',
  banner: 'ca-app-pub-9675798593675825/6025593730',
  interstitial: 'ca-app-pub-9675798593675825/4712512061',
  rewarded: 'ca-app-pub-9675798593675825/6776628110',
};

// Google's official demo IDs — safe for development testing.
const DEMO = {
  appOpen: 'ca-app-pub-3940256099942544/9257395921',
  banner: 'ca-app-pub-3940256099942544/9214589741', // adaptive banner
  interstitial: 'ca-app-pub-3940256099942544/1033173712',
  rewarded: 'ca-app-pub-3940256099942544/5224354917',
};

// Test device advertising ID (user's real device for safe testing of real ads)
export const TEST_DEVICE_IDS = ['553c7721-4821-461b-9f62-8584b1e60745'];

// In dev (Expo Go / dev-client) we use Google demo IDs to avoid policy violations.
// In production builds, we use real IDs but with the test device whitelisted.
const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : false;
export const AD_UNITS = isDev ? DEMO : PROD;

export const ADMOB_APP_ID = 'ca-app-pub-9675798593675825~9834036299';

// Click counters for interstitial logic (10th click load, 15th click show)
export const INTERSTITIAL_LOAD_AT = 10;
export const INTERSTITIAL_SHOW_AT = 15;

// Banner refresh interval (45-60s for high CPM)
export const BANNER_REFRESH_MS = 50000;

// Rewarded ad unlock duration (30 minutes)
export const REWARD_UNLOCK_MS = 30 * 60 * 1000;
