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

// Build #25 — Interstitial cadence tightening.
// User feedback: "ads request bahut zyada hain, impressions kam hain — fix
// the requests:impressions ratio".  Previously we LOADED at click #10 and
// SHOWED at click #15, which meant 33% of organic clicks were burning a
// load with no impression because the user never reached #15.  We now
// only load lazily — about 2 clicks before we plan to show — and bumped
// the show cadence so each session generally produces 1 paid impression
// per ~18 user actions instead of 2 wasted requests.
export const INTERSTITIAL_LOAD_AT = 16;
export const INTERSTITIAL_SHOW_AT = 18;

// Banner refresh interval.
// Build #25 — bumped 50 s → 60 s.  Google's official guidance is the
// minimum healthy refresh window; faster than that drives down eCPM and
// inflates the ratio of dropped requests (ad served but never seen the
// minimum-view duration to count as an impression).  60 s lines up with
// "high CPM" advice and keeps reqs:impressions healthy.
export const BANNER_REFRESH_MS = 60000;

// Build #25 — slower refresh used by the radio player banner.  When
// audio is playing, the user is engaged with audio and unlikely to look
// at the banner for the full minimum-view duration; refreshing every
// minute would be wasted bandwidth (terrible on 2G) and burned
// impressions.  90 s strikes the right balance: still enough to count
// as a "live" placement but doesn't crowd the radio buffer.
export const RADIO_BANNER_REFRESH_MS = 90000;

// Rewarded ad unlock duration (30 minutes)
export const REWARD_UNLOCK_MS = 30 * 60 * 1000;
