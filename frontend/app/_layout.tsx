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
              <Text style={styles.title}>Browsing Disclaimer</Text>
              <ScrollView style={{ maxHeight: 220 }}>
                <Text style={styles.body}>
                  This is a browsing utility designed for low-bandwidth
                  (2G/64kbps) networks. The user is solely responsible for the
                  content they search, view, or stream through this app.{'\n\n'}
                  • No browsing data is sent to any server. All history,
                  bookmarks and downloads are stored locally on your device.
                  {'\n'}
                  • Strict SafeSearch is enforced on all searches.{'\n'}
                  • In UltraLite mode, ads and trackers are blocked and images
                  are blurred to save data — tap an image to reveal it.{'\n'}
                  • Radio streams are sourced from a public open directory
                  (radio-browser.info) and are not hosted by UltraLite.
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
