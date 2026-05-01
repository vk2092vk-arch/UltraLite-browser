// Adaptive banner component — refreshes every 50s for higher CPM.
import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import {
  BannerAd,
  BannerAdSize,
} from 'react-native-google-mobile-ads';
import { AD_UNITS, BANNER_REFRESH_MS } from '../constants/ads';
import { COLORS } from '../constants/theme';

interface Props {
  testID?: string;
}

const AdBanner: React.FC<Props> = ({ testID }) => {
  const [tick, setTick] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timer.current = setInterval(() => {
      setTick((t) => t + 1);
    }, BANNER_REFRESH_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
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
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: COLORS.cardSoft,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  placeholder: {
    height: 50,
  },
});

export default AdBanner;
