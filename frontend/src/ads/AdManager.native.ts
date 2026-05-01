// Centralized AdMob lifecycle manager.
// - App Open: preloaded on splash, shown when foregrounded (after first content load).
// - Interstitial: pre-load at 15th click, show at 30th click.
// - Rewarded: shown on demand from Radio page; grants 30-min unlock.
import {
  AppOpenAd,
  InterstitialAd,
  RewardedAd,
  AdEventType,
  RewardedAdEventType,
  MobileAds,
  MaxAdContentRating,
} from 'react-native-google-mobile-ads';
import {
  AD_UNITS,
  INTERSTITIAL_LOAD_AT,
  INTERSTITIAL_SHOW_AT,
  TEST_DEVICE_IDS,
} from '../constants/ads';

let initialized = false;

export async function initAds(): Promise<void> {
  if (initialized) return;
  try {
    await MobileAds().setRequestConfiguration({
      maxAdContentRating: MaxAdContentRating.PG,
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
      testDeviceIdentifiers: TEST_DEVICE_IDS,
    });
    await MobileAds().initialize();
    initialized = true;
  } catch (e) {
    console.warn('[Ads] init error', e);
  }
}

// ---------- App Open ----------
let appOpen: AppOpenAd | null = null;
let appOpenReady = false;

export function preloadAppOpen() {
  appOpen = AppOpenAd.createForAdRequest(AD_UNITS.appOpen, {
    requestNonPersonalizedAdsOnly: true,
  });
  const subLoaded = appOpen.addAdEventListener(AdEventType.LOADED, () => {
    appOpenReady = true;
  });
  const subClosed = appOpen.addAdEventListener(AdEventType.CLOSED, () => {
    appOpenReady = false;
    // chain reload
    setTimeout(() => preloadAppOpen(), 500);
  });
  const subError = appOpen.addAdEventListener(AdEventType.ERROR, () => {
    appOpenReady = false;
  });
  try {
    appOpen.load();
  } catch (e) {
    console.warn('[Ads] appOpen load err', e);
  }
  return () => {
    subLoaded();
    subClosed();
    subError();
  };
}

export function showAppOpenIfReady(): boolean {
  if (appOpenReady && appOpen) {
    try {
      appOpen.show();
      return true;
    } catch (e) {
      console.warn('[Ads] appOpen show err', e);
    }
  }
  return false;
}

// ---------- Interstitial (click-counted) ----------
let interstitial: InterstitialAd | null = null;
let interReady = false;
let clickCount = 0;

function createInterstitial() {
  interstitial = InterstitialAd.createForAdRequest(AD_UNITS.interstitial, {
    requestNonPersonalizedAdsOnly: true,
  });
  interstitial.addAdEventListener(AdEventType.LOADED, () => {
    interReady = true;
  });
  interstitial.addAdEventListener(AdEventType.CLOSED, () => {
    interReady = false;
    // re-create for next cycle
    setTimeout(() => createInterstitial(), 1000);
  });
  interstitial.addAdEventListener(AdEventType.ERROR, () => {
    interReady = false;
  });
}

/**
 * Call on every meaningful user click.
 * - At 15th click: pre-load
 * - At 30th click: show (and reset)
 */
export function trackClick() {
  clickCount += 1;
  if (clickCount === INTERSTITIAL_LOAD_AT) {
    if (!interstitial) createInterstitial();
    if (interstitial && !interReady) {
      try { interstitial.load(); } catch {}
    }
  }
  if (clickCount >= INTERSTITIAL_SHOW_AT) {
    if (interReady && interstitial) {
      try {
        interstitial.show();
        clickCount = 0;
        interReady = false;
      } catch (e) {
        console.warn('[Ads] interstitial show err', e);
      }
    } else {
      // not ready — try load again, push back the show window
      if (!interstitial) createInterstitial();
      if (interstitial) {
        try { interstitial.load(); } catch {}
      }
      // small back-off so we don't spam
      clickCount = INTERSTITIAL_LOAD_AT;
    }
  }
}

// ---------- Rewarded ----------
let rewarded: RewardedAd | null = null;
let rewardedReady = false;

function createRewarded() {
  rewarded = RewardedAd.createForAdRequest(AD_UNITS.rewarded, {
    requestNonPersonalizedAdsOnly: true,
  });
  rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
    rewardedReady = true;
  });
  rewarded.addAdEventListener(AdEventType.CLOSED, () => {
    rewardedReady = false;
    setTimeout(() => createRewarded(), 1000);
  });
  rewarded.addAdEventListener(AdEventType.ERROR, () => {
    rewardedReady = false;
  });
}

export function preloadRewarded() {
  if (!rewarded) createRewarded();
  if (rewarded && !rewardedReady) {
    try { rewarded.load(); } catch {}
  }
}

export function showRewarded(onEarned: () => void): Promise<boolean> {
  return new Promise((resolve) => {
    if (!rewarded || !rewardedReady) {
      preloadRewarded();
      resolve(false);
      return;
    }
    const sub = rewarded.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      () => {
        onEarned();
      }
    );
    const closeSub = rewarded.addAdEventListener(AdEventType.CLOSED, () => {
      sub();
      closeSub();
      resolve(true);
    });
    try {
      rewarded.show();
    } catch (e) {
      console.warn('[Ads] rewarded show err', e);
      sub();
      closeSub();
      resolve(false);
    }
  });
}

export function isRewardedReady() {
  return rewardedReady;
}
