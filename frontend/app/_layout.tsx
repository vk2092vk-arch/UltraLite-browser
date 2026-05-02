// Root layout — Stack navigator + global disclaimer modal (mandatory once)
import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, FONT, RADIUS, SPACING } from '../src/constants/theme';

const DISCLAIMER_KEY = '@ul/disclaimer_v1';

export default function RootLayout() {
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const seen = await AsyncStorage.getItem(DISCLAIMER_KEY);
        if (!seen) setShowDisclaimer(true);
      } catch {
        setShowDisclaimer(true);
      }
    })();
  }, []);

  const accept = async () => {
    try {
      await AsyncStorage.setItem(DISCLAIMER_KEY, '1');
    } catch {}
    setShowDisclaimer(false);
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" backgroundColor={COLORS.maroon} />
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'fade',
            contentStyle: { backgroundColor: COLORS.bg },
          }}
        />
        <Modal
          visible={showDisclaimer}
          transparent
          animationType="fade"
          onRequestClose={() => {}}
        >
          <View style={styles.backdrop}>
            <View style={styles.card} testID="disclaimer-modal">
              <Text style={styles.title}>Browsing & Radio Disclaimer</Text>
              <ScrollView style={{ maxHeight: 240 }}>
                <Text style={styles.body}>
                  UltraLite is a low-bandwidth browsing utility and an open
                  directory player for community radio. It is the user's sole
                  responsibility to comply with local laws while using the app.
                  {'\n\n'}
                  • <Text style={styles.bold}>No personal data leaves your device.</Text>{' '}
                  History, bookmarks, downloads and radio favourites are stored
                  only in local SQLite. UltraLite has no backend.{'\n'}
                  • <Text style={styles.bold}>Strict SafeSearch</Text> is
                  enforced on all searches.{'\n'}
                  • In UltraLite (Pure Legacy) mode, scripts, heavy CSS and
                  images are stripped on the device to save bandwidth on 64
                  kbps networks. This is a data-saver, not an ad blocker —
                  in-app advertising remains fully functional.{'\n'}
                  • Radio streams are sourced from the public open community
                  catalog <Text style={styles.bold}>radio-browser.info</Text>{' '}
                  and are owned & hosted by their respective broadcasters.
                  UltraLite does not host, transcode or re-broadcast any
                  audio. Tap a station to play; close the app to stop.
                </Text>
              </ScrollView>
              <Pressable
                onPress={accept}
                style={styles.acceptBtn}
                testID="disclaimer-accept-btn"
              >
                <Text style={styles.acceptTxt}>I Understand & Accept</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    maxWidth: 460,
  },
  title: {
    fontSize: FONT.size.xl,
    fontWeight: FONT.weight.bold,
    color: COLORS.maroon,
    marginBottom: SPACING.md,
  },
  body: {
    fontSize: FONT.size.sm,
    lineHeight: 22,
    color: COLORS.text,
  },
  bold: {
    fontWeight: FONT.weight.bold,
    color: COLORS.text,
  },
  acceptBtn: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.maroon,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  acceptTxt: {
    color: '#fff',
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
    letterSpacing: 0.3,
  },
});
