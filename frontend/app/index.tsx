// Splash screen — 3-4 sec, AppOpen ad pre-loaded in background.
import React, { useEffect } from 'react';
import { Image, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as ExpoSplash from 'expo-splash-screen';
import { initAds, preloadAppOpen, showAppOpenIfReady } from '../src/ads/AdManager';
import { hydrate } from '../src/state/appState';
import { COLORS, FONT, SPACING } from '../src/constants/theme';

ExpoSplash.preventAutoHideAsync().catch(() => {});

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await hydrate();
        await initAds();
        preloadAppOpen();
      } catch (e) {
        console.warn('[splash] init err', e);
      }
      // Show splash for 3.2s then attempt App Open
      const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
      await wait(3200);
      if (!mounted) return;
      // Try to show App Open (non-blocking — proceed to home regardless)
      showAppOpenIfReady();
      await ExpoSplash.hideAsync().catch(() => {});
      router.replace('/home');
    })();
    return () => {
      mounted = false;
    };
  }, [router]);

  return (
    <View style={styles.wrap} testID="splash-screen">
      <Image
        source={require('../assets/images/ultralite-logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.title}>UltraLite</Text>
      <Text style={styles.tagline}>The 64kbps Browser</Text>
      <ActivityIndicator color="#fff" style={{ marginTop: SPACING.lg }} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.maroon,
    paddingHorizontal: SPACING.lg,
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: SPACING.md,
  },
  title: {
    color: '#fff',
    fontSize: FONT.size.title,
    fontWeight: FONT.weight.black,
    letterSpacing: 1,
  },
  tagline: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: FONT.size.md,
    marginTop: SPACING.xs,
  },
});
