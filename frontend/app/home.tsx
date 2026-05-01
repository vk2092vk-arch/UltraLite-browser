// Home — Browser screen with WebView (text-only in UltraLite mode), search bar, history shortcuts.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import Header from '../src/components/Header';
import MenuSheet from '../src/components/MenuSheet';
import AdBanner from '../src/components/AdBanner';
import { COLORS, FONT, RADIUS, SPACING } from '../src/constants/theme';
import {
  getUltraLite,
  setUltraLite,
  hydrate,
  useAppState,
} from '../src/state/appState';
import { buildSearchUrl, deriveTitle, isUltraLiteUrl, toJina } from '../src/utils/url';
import { addBookmark, addHistory, getHistory, HistoryItem } from '../src/storage/db';
import { trackClick } from '../src/ads/AdManager';

// JS injected when UltraLite mode + page is rendered.
// Blurs images (tap to reveal), removes video/iframe, simplifies CSS.
const ULTRA_INJECTED_JS = `
(function() {
  try {
    var style = document.createElement('style');
    style.innerHTML = \`
      img, picture, source {
        filter: blur(18px) grayscale(0.6) !important;
        opacity: 0.55 !important;
        max-width: 120px !important;
        max-height: 120px !important;
        cursor: pointer !important;
      }
      img.__ul_revealed {
        filter: none !important;
        opacity: 1 !important;
        max-width: 100% !important;
        max-height: none !important;
      }
      video, iframe, svg, canvas, embed, object {
        display: none !important;
      }
      * {
        background-image: none !important;
        box-shadow: none !important;
        transition: none !important;
        animation: none !important;
      }
      body {
        font-family: serif !important;
        font-size: 17px !important;
        line-height: 1.5 !important;
        color: #111 !important;
        background: #fff !important;
      }
      a { color: #5C0A1A !important; text-decoration: underline !important; }
      header, footer, aside, nav,
      [role="banner"], [role="navigation"],
      [class*="ad-"], [class*="-ad"], [id*="ad-"], [id*="-ad"],
      [class*="sidebar"], [class*="popup"], [class*="modal"],
      [class*="cookie"], [class*="consent"], [class*="newsletter"] {
        display: none !important;
      }
      script { display: none !important; }
    \`;
    document.head.appendChild(style);

    // Tap-to-reveal for blurred images (saves data until user wants it)
    document.addEventListener('click', function(e) {
      var t = e.target;
      if (t && t.tagName === 'IMG' && !t.classList.contains('__ul_revealed')) {
        e.preventDefault();
        e.stopPropagation();
        t.classList.add('__ul_revealed');
      }
    }, true);
  } catch(e) {}
  true;
})();
`;

export default function Home() {
  const router = useRouter();
  const state = useAppState();
  const [url, setUrl] = useState<string>('');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [pageTitle, setPageTitle] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [canGoBack, setCanGoBack] = useState(false);
  const webRef = useRef<WebView>(null);

  useEffect(() => {
    hydrate();
    refreshHistory();
  }, []);

  const refreshHistory = useCallback(async () => {
    setHistory(await getHistory());
  }, []);

  const ultraLite = state.hydrated ? state.ultraLite : getUltraLite();

  const goSearch = (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text) return;
    Keyboard.dismiss();
    const target = buildSearchUrl(text, ultraLite);
    setUrl(target);
    setInput(text);
    trackClick();
  };

  const onNav = useCallback(
    (navState: any) => {
      setCanGoBack(navState.canGoBack);
      if (navState.title) setPageTitle(navState.title);
      if (navState.url && !navState.loading) {
        const finalTitle = navState.title || deriveTitle(navState.url);
        addHistory(finalTitle, navState.url).then(refreshHistory).catch(() => {});
      }
    },
    [refreshHistory]
  );

  const handleToggle = (v: boolean) => {
    setUltraLite(v);
    // re-load current URL with appropriate transformation
    if (url) {
      const re = buildSearchUrl(input || url, v);
      setUrl(re);
    }
    trackClick();
  };

  const menuItems = useMemo(
    () => [
      {
        key: 'newtab',
        label: 'New Tab',
        icon: 'add-outline' as const,
        onPress: () => {
          setUrl('');
          setInput('');
          setPageTitle('');
        },
      },
      {
        key: 'history',
        label: 'History',
        icon: 'time-outline' as const,
        onPress: () => router.push('/history'),
      },
      {
        key: 'bookmarks',
        label: 'Bookmarks',
        icon: 'star-outline' as const,
        onPress: () => router.push('/bookmarks'),
      },
      {
        key: 'addbookmark',
        label: 'Bookmark this page',
        icon: 'bookmark-outline' as const,
        onPress: async () => {
          if (url) {
            await addBookmark(pageTitle || deriveTitle(url), url);
          }
        },
      },
      {
        key: 'radio',
        label: 'Radio & Music',
        icon: 'radio-outline' as const,
        onPress: () => router.push('/radio'),
      },
      {
        key: 'datasaver',
        label: 'Data Saver Settings',
        icon: 'settings-outline' as const,
        onPress: () => router.push('/settings'),
      },
    ],
    [url, pageTitle, router]
  );

  const showHome = !url;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header
        ultraLite={ultraLite}
        onToggleMode={handleToggle}
        onMenu={() => setMenuOpen(true)}
        onLogo={() => {
          setUrl('');
          setInput('');
          setPageTitle('');
        }}
      />

      <View style={styles.searchBarWrap}>
        <View style={styles.searchBar}>
          <Ionicons
            name="search"
            size={18}
            color={COLORS.textMuted}
            style={{ marginRight: 8 }}
          />
          <TextInput
            testID="search-input"
            style={styles.searchInput}
            placeholder="Search or enter URL"
            placeholderTextColor={COLORS.textMuted}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => goSearch()}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {input.length > 0 && (
            <Pressable
              onPress={() => setInput('')}
              hitSlop={10}
              testID="search-clear-btn"
            >
              <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {showHome ? (
          <ScrollView
            contentContainerStyle={styles.homeScroll}
            keyboardShouldPersistTaps="handled"
          >
            <Pressable
              onPress={() => {
                router.push('/radio');
                trackClick();
              }}
              style={styles.shortcutCard}
              testID="home-radio-card"
            >
              <View style={styles.shortcutRow}>
                <Ionicons
                  name="radio"
                  size={22}
                  color={COLORS.maroon}
                  style={styles.shortcutIcon}
                />
                <Text style={styles.shortcutTitle}>Radio Channels</Text>
              </View>
              <View style={styles.shortcutRow}>
                <Ionicons
                  name="musical-notes"
                  size={22}
                  color={COLORS.maroon}
                  style={styles.shortcutIcon}
                />
                <Text style={styles.shortcutTitle}>Music Channels</Text>
              </View>
              <Text style={styles.shortcutSubtle}>
                Worldwide • 64kbps • Free
              </Text>
            </Pressable>

            <View style={styles.historyCard}>
              <View style={styles.historyHead}>
                <Ionicons name="time-outline" size={20} color={COLORS.text} />
                <Text style={styles.historyTitle}>History</Text>
              </View>
              {history.length === 0 ? (
                <Text style={styles.historyEmpty}>
                  No history yet. Search something to begin.
                </Text>
              ) : (
                history.slice(0, 6).map((h) => (
                  <Pressable
                    key={h.id}
                    onPress={() => {
                      setUrl(h.url);
                      setInput('');
                      setPageTitle(h.title);
                      trackClick();
                    }}
                    style={styles.historyRow}
                    testID={`history-row-${h.id}`}
                  >
                    <Text style={styles.historyText} numberOfLines={1}>
                      {h.title}
                    </Text>
                  </Pressable>
                ))
              )}
            </View>

            <Text style={styles.modeHint}>
              Mode:{' '}
              <Text style={{ color: COLORS.maroon, fontWeight: '700' }}>
                {ultraLite ? 'UltraLite (Text-only)' : 'Normal'}
              </Text>
            </Text>
          </ScrollView>
        ) : (
          <View style={{ flex: 1 }}>
            {loading && (
              <View style={styles.progressTrack}>
                <View
                  style={[styles.progressFill, { width: `${progress * 100}%` }]}
                />
              </View>
            )}
            <WebView
              ref={webRef}
              source={{ uri: url }}
              style={{ flex: 1, backgroundColor: '#fff' }}
              originWhitelist={['*']}
              javaScriptEnabled={true}
              domStorageEnabled
              cacheEnabled
              thirdPartyCookiesEnabled={false}
              setSupportMultipleWindows={false}
              mediaPlaybackRequiresUserAction
              onLoadStart={() => setLoading(true)}
              onLoadEnd={() => {
                setLoading(false);
                setProgress(1);
              }}
              onLoadProgress={(e) =>
                setProgress(e.nativeEvent.progress)
              }
              onNavigationStateChange={onNav}
              onShouldStartLoadWithRequest={(req) => {
                // In UltraLite mode, force any page (other than DDG Lite, jina,
                // and file downloads) through the r.jina.ai text proxy for
                // true 64kbps-friendly text-only experience.
                if (!ultraLite) return true;
                const u = req.url || '';
                if (!u.startsWith('http')) return true;
                if (u.startsWith('https://r.jina.ai/')) return true;
                if (u.includes('duckduckgo.com/lite')) return true;
                if (u.includes('duckduckgo.com/l/')) {
                  // DDG's click-through redirector — let it through, our
                  // onNavigationStateChange will catch the final URL.
                  return true;
                }
                // Rewrite to jina proxy
                const jina = toJina(u);
                setUrl(jina);
                return false;
              }}
              injectedJavaScript={
                ultraLite && !isUltraLiteUrl(url) ? ULTRA_INJECTED_JS : ''
              }
              userAgent={
                ultraLite
                  ? 'Mozilla/5.0 (Linux; Android 6.0; Nokia 8110) UltraLite/1.0 (compatible; lite)'
                  : undefined
              }
            />
            <View style={styles.navBar}>
              <Pressable
                onPress={() => {
                  if (canGoBack) webRef.current?.goBack();
                  else {
                    setUrl('');
                    setInput('');
                  }
                  trackClick();
                }}
                style={styles.navBtn}
                testID="webview-back"
              >
                <Ionicons
                  name="chevron-back"
                  size={22}
                  color={COLORS.maroon}
                />
              </Pressable>
              <Pressable
                onPress={() => {
                  webRef.current?.reload();
                  trackClick();
                }}
                style={styles.navBtn}
                testID="webview-reload"
              >
                <Ionicons name="refresh" size={20} color={COLORS.maroon} />
              </Pressable>
              <Pressable
                onPress={() => {
                  setUrl('');
                  setInput('');
                  setPageTitle('');
                }}
                style={styles.navBtn}
                testID="webview-home"
              >
                <Ionicons name="home" size={20} color={COLORS.maroon} />
              </Pressable>
              <Text
                style={styles.navUrl}
                numberOfLines={1}
                testID="webview-current-url"
              >
                {pageTitle || deriveTitle(url)}
              </Text>
            </View>
          </View>
        )}

        <AdBanner testID="home-banner" />
      </KeyboardAvoidingView>

      <MenuSheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        items={menuItems}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.maroon },
  searchBarWrap: {
    backgroundColor: COLORS.maroon,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  searchBar: {
    backgroundColor: '#fff',
    borderRadius: RADIUS.pill,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT.size.md,
    color: COLORS.text,
    padding: 0,
  },
  homeScroll: {
    backgroundColor: COLORS.bg,
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  shortcutCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  shortcutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  shortcutIcon: { marginRight: SPACING.md, width: 26 },
  shortcutTitle: {
    fontSize: FONT.size.lg,
    color: COLORS.text,
    fontWeight: FONT.weight.semibold,
  },
  shortcutSubtle: {
    marginTop: SPACING.sm,
    color: COLORS.textMuted,
    fontSize: FONT.size.sm,
  },
  historyCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  historyHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: SPACING.sm,
  },
  historyTitle: {
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.bold,
    color: COLORS.text,
  },
  historyEmpty: {
    color: COLORS.textMuted,
    fontStyle: 'italic',
    paddingVertical: SPACING.md,
  },
  historyRow: { paddingVertical: 10 },
  historyText: { color: COLORS.text, fontSize: FONT.size.md },
  modeHint: {
    textAlign: 'center',
    marginTop: SPACING.lg,
    color: COLORS.textMuted,
    fontSize: FONT.size.sm,
  },
  progressTrack: {
    height: 3,
    width: '100%',
    backgroundColor: COLORS.cardSoft,
  },
  progressFill: { height: 3, backgroundColor: COLORS.maroon },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: '#fff',
    gap: 4,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navUrl: {
    flex: 1,
    color: COLORS.textMuted,
    fontSize: FONT.size.xs,
    paddingHorizontal: SPACING.sm,
  },
});
