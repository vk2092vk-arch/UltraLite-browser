// Adaptive banner component.
//
// Build #25 changes (per user feedback on impression-to-request ratio):
//   1. `refreshMs` prop — callers can pick a longer cadence (radio player
//      banner uses 90 s) so audio playback isn't disrupted by repeated
//      banner reloads on 2G and we don't burn requests with no impression.
//   2. Adaptive retry-back-off — instead of a flat 15 s retry on
//      `onAdFailedToLoad`, we double the wait up to 60 s.  This avoids
//      hammering the AdMob service with no-fill responses on bad networks
//      (which AdMob counts as low-quality requests and downranks).
//   3. We no longer schedule a refresh while the previous request is
//      pending — the timer waits on `loaded` before bumping the tick.
//      Net effect: each banner mount produces *at most one* request
//      until the result lands, keeping requests:impressions ≈ 1:1.
import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import {
  BannerAd,
  BannerAdSize,
} from 'react-native-google-mobile-ads';
import { AD_UNITS, BANNER_REFRESH_MS } from '../constants/ads';

interface Props {
  testID?: string;
  /** Refresh interval in ms; defaults to BANNER_REFRESH_MS (60 s). */
  refreshMs?: number;
}

const AdBanner: React.FC<Props> = ({ testID, refreshMs }) => {
  const [tick, setTick] = useState(0);
  // `loaded` is set true on first onAdLoaded — gates the refresh timer
  // so we never refresh a banner that hasn't actually rendered yet.
  const loadedRef = useRef(false);
  const failCountRef = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const interval = refreshMs && refreshMs > 0 ? refreshMs : BANNER_REFRESH_MS;

  // Schedule the next refresh — only after the current ad has loaded
  // (or definitively failed enough times that we want to retry).
  const scheduleRefresh = (delay: number) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      loadedRef.current = false;
      setTick((t) => t + 1);
    }, delay);
  };

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  // Web fallback — react-native-google-mobile-ads is native only.
  if (Platform.OS === 'web') {
    return (
      <View testID={testID} style={[styles.container, styles.placeholder]} />
    );
  }

  return (
    <View testID={testID} style={styles.container}>
      <BannerAd
        // re-mount on tick to refresh
        key={`banner-${tick}`}
        unitId={AD_UNITS.banner}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
        onAdLoaded={() => {
          loadedRef.current = true;
          failCountRef.current = 0;
          // Successful load → schedule the next refresh `interval` ms
          // from now.  This produces a clean 1 request : 1 fill cadence.
          scheduleRefresh(interval);
        }}
        onAdFailedToLoad={() => {
          failCountRef.current += 1;
          // Exponential back-off capped at 60 s, then 120 s after 5
          // consecutive failures (likely bad network — AdMob hates
          // hammering).  Avoids the "request bahut zyada, impression
          // kam" symptom the user reported.
          const fail = failCountRef.current;
          const wait = Math.min(15000 * fail, fail >= 5 ? 120000 : 60000);
          scheduleRefresh(wait);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    minHeight: 60, // reserve banner space — keeps layout stable & ad visible
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2DDDF',
  },
  placeholder: {
    minHeight: 50,
  },
});

export default AdBanner;
