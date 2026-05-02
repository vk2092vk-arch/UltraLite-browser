// Data Saver Settings — UltraLite default mode, clear local data, info
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
  hydrate,
  useAppState,
} from '../src/state/appState';
import { clearHistory } from '../src/storage/db';
import AdBanner from '../src/components/AdBanner';
import { COLORS, FONT, RADIUS, SPACING } from '../src/constants/theme';

export default function Settings() {
  const router = useRouter();
  const state = useAppState();
  const [ultra, setUltra] = useState<boolean>(getUltraLite());

  useEffect(() => {
    hydrate();
    setUltra(getUltraLite());
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
            Radio is an open-directory player powered by the community
            catalog <Text style={styles.aboutBold}>radio-browser.info</Text>
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
