// Data Saver Settings — UltraLite default mode, clear local data, info
//
// Build #24 additions
//   • "Allow Images in UltraLite"  → keep <img> tags in cleaned HTML
//   • "Allow JavaScript in UltraLite" → route UL pages through full WebView
//                                       (so AdMob / Play Console / SPAs work)
//   • "Desktop View"               → desktop UA + 1024px viewport in BOTH
//                                    modes; users can request the desktop
//                                    site without going through hostname
//                                    rewrites.
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  getUltraLite,
  setUltraLite as setUL,
  getAllowImages,
  setAllowImages,
  getAllowJs,
  setAllowJs,
  getDesktopView,
  setDesktopView,
  hydrate,
  useAppState,
} from '../src/state/appState';
import { clearHistory, clearHtmlCache } from '../src/storage/db';
import AdBanner from '../src/components/AdBanner';
import { COLORS, FONT, RADIUS, SPACING } from '../src/constants/theme';

export default function Settings() {
  const router = useRouter();
  const state = useAppState();
  const [ultra, setUltra] = useState<boolean>(getUltraLite());
  const [allowImg, setAllowImg] = useState<boolean>(getAllowImages());
  const [allowJs, setAllowJsState] = useState<boolean>(getAllowJs());
  const [desktop, setDesktop] = useState<boolean>(getDesktopView());

  useEffect(() => {
    hydrate();
    setUltra(getUltraLite());
    setAllowImg(getAllowImages());
    setAllowJsState(getAllowJs());
    setDesktop(getDesktopView());
  }, [state.hydrated]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.btn}
          testID="settings-back"
        >
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.title}>Data Saver Settings</Text>
        <View style={styles.btn} />
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACING.md }}>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>UltraLite by default</Text>
              <Text style={styles.rowSubtle}>
                Strip scripts, heavy CSS and images on web pages to save
                bandwidth on 64 kbps networks.
              </Text>
            </View>
            <Switch
              testID="settings-ultralite-switch"
              value={ultra}
              onValueChange={async (v) => {
                setUltra(v);
                await setUL(v);
              }}
              trackColor={{ false: '#ccc', true: COLORS.maroon }}
              thumbColor="#fff"
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardHead}>UltraLite advanced</Text>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Allow Images</Text>
              <Text style={styles.rowSubtle}>
                Keep article images in UltraLite pages. Uses more data on
                slow links — leave OFF for fastest text-only browsing.
              </Text>
            </View>
            <Switch
              testID="settings-allow-images-switch"
              value={allowImg}
              onValueChange={async (v) => {
                setAllowImg(v);
                await setAllowImages(v);
              }}
              trackColor={{ false: '#ccc', true: COLORS.maroon }}
              thumbColor="#fff"
            />
          </View>

          <View style={[styles.row, { marginTop: SPACING.md }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Allow JavaScript</Text>
              <Text style={styles.rowSubtle}>
                Run sites that need JS (AdMob console, Play Console,
                Gmail). UltraLite cleaning is bypassed; data usage rises.
              </Text>
            </View>
            <Switch
              testID="settings-allow-js-switch"
              value={allowJs}
              onValueChange={async (v) => {
                setAllowJsState(v);
                await setAllowJs(v);
              }}
              trackColor={{ false: '#ccc', true: COLORS.maroon }}
              thumbColor="#fff"
            />
          </View>

          {/* Build #28 — "Desktop View" promoted to the main 3-dot menu
              per user request, so users can flip it without diving into
              Settings. The toggle still appears here for discoverability
              and shows the same persisted value. */}
          <View style={[styles.row, { marginTop: SPACING.md }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Desktop View</Text>
              <Text style={styles.rowSubtle}>
                Request the desktop version of every site (works in
                UltraLite and Normal modes).
              </Text>
            </View>
            <Switch
              testID="settings-desktop-view-switch"
              value={desktop}
              onValueChange={async (v) => {
                setDesktop(v);
                await setDesktopView(v);
              }}
              trackColor={{ false: '#ccc', true: COLORS.maroon }}
              thumbColor="#fff"
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardHead}>Privacy</Text>
          <Pressable
            style={styles.action}
            onPress={() => {
              Alert.alert(
                'Clear local data',
                'This removes all history and bookmarks from this device. No server-side data is ever stored.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Clear',
                    style: 'destructive',
                    onPress: () => clearHistory(),
                  },
                ]
              );
            }}
            testID="settings-clear-data"
          >
            <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
            <Text style={[styles.actionText, { color: COLORS.danger }]}>
              Clear local browsing data
            </Text>
          </Pressable>
          <Pressable
            style={styles.action}
            onPress={() => {
              Alert.alert(
                'Clear page cache',
                'Forget all pages cached for offline / fast re-open. Your bookmarks and history are kept.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Clear',
                    onPress: () => clearHtmlCache(),
                  },
                ]
              );
            }}
            testID="settings-clear-cache"
          >
            <Ionicons name="refresh-outline" size={20} color={COLORS.maroon} />
            <Text style={[styles.actionText, { color: COLORS.maroon }]}>
              Clear cached pages
            </Text>
          </Pressable>
        </View>

        {/* Build #30 — Legal section: Privacy Policy + Terms & Conditions.
            Required for Play Store submission (privacy URL is mandatory).
            Tapping each opens /legal with the appropriate type — that
            screen tries the public URL first and falls back to the
            bundled offline summary in src/constants/legal.ts. */}
        <View style={styles.card}>
          <Text style={styles.cardHead}>Legal</Text>
          <Pressable
            style={styles.action}
            onPress={() => router.push('/legal?type=privacy')}
            testID="settings-privacy-policy"
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={20}
              color={COLORS.maroon}
            />
            <Text style={[styles.actionText, { color: COLORS.text }]}>
              Privacy Policy
            </Text>
            <View style={{ flex: 1 }} />
            <Ionicons
              name="chevron-forward"
              size={18}
              color={COLORS.textMuted}
            />
          </Pressable>
          <Pressable
            style={styles.action}
            onPress={() => router.push('/legal?type=terms')}
            testID="settings-terms-conditions"
          >
            <Ionicons
              name="document-text-outline"
              size={20}
              color={COLORS.maroon}
            />
            <Text style={[styles.actionText, { color: COLORS.text }]}>
              Terms &amp; Conditions
            </Text>
            <View style={{ flex: 1 }} />
            <Ionicons
              name="chevron-forward"
              size={18}
              color={COLORS.textMuted}
            />
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardHead}>About</Text>
          <Text style={styles.about}>
            <Text style={styles.aboutBold}>UltraLite</Text> is a lightweight
            web-browsing utility optimised for 2G / sub-64 kbps mobile
            networks. In Pure Legacy mode, web pages are fetched on the
            device, scripts and heavy CSS are stripped, and images are
            replaced with small placeholders so 10 KB pages load in 1-2
            seconds even on weak connections. A mobile user-agent is sent so
            sites serve their lightweight versions.{'\n\n'}
            This is a <Text style={styles.aboutBold}>data-saver</Text>, not
            an ad blocker — in-app advertising remains fully functional.
            {'\n\n'}
            Radio is an open-directory player powered by curated{' '}
            <Text style={styles.aboutBold}>third-party radio providers</Text>
            , filtered to ≤ 64 kbps for low-bandwidth use. Streams are owned
            and hosted by their respective broadcasters; UltraLite does not
            host, transcode or re-broadcast any audio.{'\n\n'}
            <Text style={styles.aboutBold}>No-Logs Policy:</Text> Browsing
            history, bookmarks, downloads, radio favourites and preferences
            are stored only on this device (local SQLite). UltraLite has no
            backend — nothing is uploaded to our servers.
          </Text>
        </View>
      </ScrollView>
      <AdBanner testID="settings-banner" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.maroon,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  btn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: {
    flex: 1,
    color: '#fff',
    fontSize: FONT.size.xl,
    fontWeight: FONT.weight.bold,
    marginLeft: SPACING.sm,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  rowTitle: { color: COLORS.text, fontSize: FONT.size.md, fontWeight: FONT.weight.semibold },
  rowSubtle: { color: COLORS.textMuted, fontSize: FONT.size.sm, marginTop: 4 },
  cardHead: {
    fontSize: FONT.size.sm,
    color: COLORS.textMuted,
    fontWeight: FONT.weight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: SPACING.sm,
  },
  action: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  actionText: { fontSize: FONT.size.md, fontWeight: FONT.weight.medium },
  about: { color: COLORS.text, fontSize: FONT.size.sm, lineHeight: 22 },
  aboutBold: { fontWeight: FONT.weight.bold, color: COLORS.maroon },
});
