// UpdateModal — shown when a newer version exists on the GitHub manifest.
//
// Build #38 — User asked for a "force update" prompt that appears on every
// app launch until the user updates. The user MAY skip the prompt (it
// dismisses for the current session) but it returns on the next launch.
//
// How it works:
//   1. On mount, fetch the version manifest from this repo's `main` branch:
//        https://raw.githubusercontent.com/<owner>/<repo>/main/version.json
//      The manifest is a tiny JSON: { latestVersionCode, latestVersionName,
//      playStoreUrl, releaseNotes }.
//   2. Read the locally installed versionCode from `Constants.expoConfig`.
//   3. If remote.latestVersionCode > local.versionCode → show the modal.
//   4. "Update Now" → opens Play Store URL via Linking.
//   5. "Skip" → setVisible(false); next launch shows it again.
//
// Failure modes are silent: if the fetch fails (offline, GitHub blocked,
// JSON malformed) we just don't show the modal — never block the user.
import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  Linking,
} from 'react-native';
import Constants from 'expo-constants';
import { COLORS, FONT, RADIUS, SPACING } from '../constants/theme';

// Update this URL if the repo is renamed / moved.
const VERSION_MANIFEST_URL =
  'https://raw.githubusercontent.com/vk2092vk-arch/UltraLite-browser/main/version.json';
const FETCH_TIMEOUT_MS = 6000;

type Manifest = {
  latestVersionCode: number;
  latestVersionName: string;
  playStoreUrl: string;
  releaseNotes?: string;
};

function getInstalledVersionCode(): number {
  // expo-constants exposes the merged app.json under expoConfig.
  // android.versionCode lives at expoConfig.android.versionCode in the
  // compiled build.
  const cfg: any = Constants.expoConfig ?? Constants.manifest ?? {};
  const fromAndroid = cfg?.android?.versionCode;
  if (typeof fromAndroid === 'number') return fromAndroid;
  return 0;
}

function getInstalledVersionName(): string {
  const cfg: any = Constants.expoConfig ?? Constants.manifest ?? {};
  return cfg?.version ?? '0.0.0';
}

export default function UpdateModal() {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          FETCH_TIMEOUT_MS
        );
        // Bust HTTP cache so a freshly-bumped manifest is picked up.
        const url =
          VERSION_MANIFEST_URL + '?ts=' + Math.floor(Date.now() / 60000);
        const res = await fetch(url, {
          signal: controller.signal,
          cache: 'no-store' as any,
        });
        clearTimeout(timeoutId);
        if (!res.ok) return;
        const data: Manifest = await res.json();
        if (cancelled) return;
        const installed = getInstalledVersionCode();
        if (
          typeof data?.latestVersionCode === 'number' &&
          data.latestVersionCode > installed
        ) {
          setManifest(data);
          setVisible(true);
        }
      } catch {
        // Silent fail — never block the user on a flaky check.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const openStore = async () => {
    if (!manifest?.playStoreUrl) return;
    try {
      await Linking.openURL(manifest.playStoreUrl);
    } catch {}
    // Keep the modal open in case the Play Store fails to launch; the
    // user can tap Skip to dismiss for this session.
  };

  const skip = () => setVisible(false);

  if (!manifest) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={skip}
      testID="update-modal"
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Update Available</Text>
          <Text style={styles.versionLine}>
            New version{' '}
            <Text style={styles.bold}>v{manifest.latestVersionName}</Text>{' '}
            is available on the Play Store.
          </Text>
          <Text style={styles.installedLine}>
            You are on v{getInstalledVersionName()}.
          </Text>
          {!!manifest.releaseNotes && (
            <View style={styles.notesBox}>
              <Text style={styles.notesTitle}>What's new</Text>
              <Text style={styles.notesBody}>{manifest.releaseNotes}</Text>
            </View>
          )}
          <Pressable
            onPress={openStore}
            style={styles.updateBtn}
            testID="update-now-btn"
          >
            <Text style={styles.updateTxt}>Update Now</Text>
          </Pressable>
          <Pressable
            onPress={skip}
            style={styles.skipBtn}
            testID="update-skip-btn"
            hitSlop={8}
          >
            <Text style={styles.skipTxt}>Skip for now</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
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
    color: COLORS.brandOrange,
    marginBottom: SPACING.sm,
  },
  versionLine: {
    fontSize: FONT.size.md,
    color: COLORS.text,
    lineHeight: 22,
  },
  installedLine: {
    fontSize: FONT.size.sm,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  bold: { fontWeight: FONT.weight.bold, color: COLORS.text },
  notesBox: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    backgroundColor: '#F7F8FA',
    borderRadius: RADIUS.md,
  },
  notesTitle: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.bold,
    color: COLORS.text,
    marginBottom: 4,
  },
  notesBody: {
    fontSize: FONT.size.sm,
    lineHeight: 20,
    color: COLORS.text,
  },
  updateBtn: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.brandOrange,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  updateTxt: {
    color: '#fff',
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
    letterSpacing: 0.3,
  },
  skipBtn: {
    marginTop: SPACING.sm,
    paddingVertical: 10,
    alignItems: 'center',
  },
  skipTxt: {
    color: COLORS.textMuted,
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
  },
});
