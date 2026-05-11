// Build #30 — In-app Privacy Policy / Terms & Conditions viewer.
//
// Tries the public URL first (so users always see the latest version).
// Falls back to the bundled INLINE_HTML when offline or when the URL is
// the placeholder. Single screen, parameterised by `?type=privacy` or
// `?type=terms` so we don't duplicate boilerplate.

import React, { useMemo, useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import {
  PRIVACY_POLICY_URL,
  PRIVACY_POLICY_INLINE_HTML,
  TERMS_URL,
  TERMS_INLINE_HTML,
  SUPPORT_EMAIL,
} from '../src/constants/legal';
import { COLORS, SPACING, FONT, RADIUS } from '../src/constants/theme';

export default function LegalScreen() {
  const router = useRouter();
  const { type } = useLocalSearchParams<{ type?: string }>();
  const isPrivacy = type === 'privacy';

  const externalUrl = isPrivacy ? PRIVACY_POLICY_URL : TERMS_URL;
  const inlineHtml = isPrivacy
    ? PRIVACY_POLICY_INLINE_HTML
    : TERMS_INLINE_HTML;
  const title = isPrivacy ? 'Privacy Policy' : 'Terms & Conditions';

  // Treat the placeholder URL as "no URL configured" so we render the
  // bundled inline copy until the publisher fills in the real public link.
  const hasRealUrl =
    !!externalUrl && !externalUrl.includes('REPLACE_ME');

  const [useInline, setUseInline] = useState(!hasRealUrl);
  const [errored, setErrored] = useState(false);

  const source = useMemo(() => {
    if (useInline || errored) return { html: inlineHtml };
    return { uri: externalUrl };
  }, [useInline, errored, inlineHtml, externalUrl]);

  return (
    <View style={styles.root}>
      <View style={styles.header} testID="legal-header">
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.btn}
          testID="legal-back"
        >
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.btn} />
      </View>

      <View style={styles.body}>
        <WebView
          testID="legal-webview"
          source={source}
          onError={() => setErrored(true)}
          onHttpError={() => setErrored(true)}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loader}>
              <ActivityIndicator color={COLORS.maroon} />
              <Text style={styles.loaderText}>Loading {title}…</Text>
            </View>
          )}
          javaScriptEnabled={false}
          domStorageEnabled={false}
        />
      </View>

      {hasRealUrl && (
        <View style={styles.footer}>
          <Pressable
            testID="legal-toggle-source"
            onPress={() => {
              setErrored(false);
              setUseInline((v) => !v);
            }}
            style={styles.footerBtn}
          >
            <Ionicons
              name={useInline ? 'cloud-download-outline' : 'phone-portrait-outline'}
              size={16}
              color={COLORS.maroon}
            />
            <Text style={styles.footerBtnText}>
              {useInline ? 'Open online version' : 'Show offline summary'}
            </Text>
          </Pressable>
          <Pressable
            testID="legal-open-external"
            onPress={() => Linking.openURL(externalUrl).catch(() => {})}
            style={styles.footerBtn}
          >
            <Ionicons name="open-outline" size={16} color={COLORS.maroon} />
            <Text style={styles.footerBtnText}>Open in external browser</Text>
          </Pressable>
        </View>
      )}

      <Text style={styles.support} testID="legal-support">
        Questions? Email{' '}
        <Text
          style={styles.supportLink}
          onPress={() =>
            Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() => {})
          }
        >
          {SUPPORT_EMAIL}
        </Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.maroon,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  btn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 17,
    fontWeight: FONT.weight.bold,
  },
  body: { flex: 1, backgroundColor: '#fff' },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  loaderText: {
    marginTop: SPACING.sm,
    color: COLORS.textMuted,
    fontSize: 13,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: '#fff',
  },
  footerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
  },
  footerBtnText: {
    marginLeft: 6,
    color: COLORS.maroon,
    fontSize: 13,
    fontWeight: FONT.weight.semibold,
  },
  support: {
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: 12,
    paddingVertical: SPACING.sm,
    backgroundColor: '#fff',
  },
  supportLink: {
    color: COLORS.maroon,
    fontWeight: FONT.weight.semibold,
  },
});
