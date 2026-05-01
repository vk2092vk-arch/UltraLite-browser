// Home — Browser screen.
// UltraLite mode uses an Opera Mini / Facebook Basic hybrid:
//   • Keep JS + CSS enabled (login pages / interactive sites keep working)
//   • Use Chrome-Android Mobile User-Agent so sites serve their mobile build
//   • Inject aggressive ad/tracker blocker EARLY (before content loads)
//   • Blur images by default (tap-to-reveal), remove video/iframe/canvas
//   • Strip decorative CSS (backgrounds, shadows, animations) — keep layout
// Normal mode = plain WebView, no injections.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
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
import { buildSearchUrl, deriveTitle } from '../src/utils/url';
import { addBookmark, addHistory, getHistory, HistoryItem } from '../src/storage/db';
import { trackClick } from '../src/ads/AdManager';
import { isDownloadUrl, downloadFile } from '../src/utils/downloads';

// Chrome-Android mobile UA so sites serve their lightweight mobile version.
const MOBILE_UA =
  'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

// Runs BEFORE any page JS — monkey-patches XHR/fetch/createElement to block
// ad + tracker domains. Saves bandwidth AND prevents scripts from injecting
// more scripts. Reference: uBlock Origin's easy-list (short version).
const AD_BLOCK_EARLY = `
(function() {
  try {
    var BLOCK = /googletagmanager|google-analytics|googlesyndication|doubleclick|adservice|adnxs|adsrvr|facebook\\.net|connect\\.facebook|fbcdn\\.net\\/rsrc|scorecardresearch|chartbeat|amazon-adsystem|moatads|taboola|outbrain|quantserve|bing\\.com\\/action|hotjar|criteo|rubiconproject|pubmatic|openx|adform|yieldmo|smartadserver|adroll|indexexchange|krxd|adobedtm|branch\\.io\\/v1|optimizely|segment\\.io|mixpanel|amplitude|fullstory|clarity\\.ms|newrelic|sentry-cdn|tiktok\\.com\\/pixel/i;
    // Override fetch
    if (window.fetch) {
      var of = window.fetch;
      window.fetch = function(u) {
        try {
          var url = typeof u === 'string' ? u : (u && u.url) || '';
          if (BLOCK.test(url)) return Promise.reject(new Error('blocked'));
        } catch(e){}
        return of.apply(this, arguments);
      };
    }
    // Override XHR
    if (window.XMLHttpRequest) {
      var op = XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open = function(m, u) {
        try { if (typeof u === 'string' && BLOCK.test(u)) { this._ul_blocked = true; } } catch(e){}
        return op.apply(this, arguments);
      };
      var os = XMLHttpRequest.prototype.send;
      XMLHttpRequest.prototype.send = function() {
        if (this._ul_blocked) { try { this.abort(); } catch(e){} return; }
        return os.apply(this, arguments);
      };
    }
    // Override createElement for <script> & <iframe>
    var oc = document.createElement.bind(document);
    document.createElement = function(tag) {
      var el = oc(tag);
      var t = (tag||'').toLowerCase();
      if (t === 'script' || t === 'iframe' || t === 'img') {
        try {
          var proto = t === 'script' ? HTMLScriptElement.prototype :
                      t === 'iframe' ? HTMLIFrameElement.prototype :
                                       HTMLImageElement.prototype;
          var desc = Object.getOwnPropertyDescriptor(proto, 'src');
          if (desc && desc.set) {
            Object.defineProperty(el, 'src', {
              configurable: true,
              get: desc.get,
              set: function(v) {
                if (typeof v === 'string' && BLOCK.test(v)) return;
                desc.set.call(this, v);
              }
            });
          }
        } catch(e){}
      }
      return el;
    };
  } catch(e){}
  true;
})();
`;

// Runs AFTER content loads — aesthetic + image-blur + element removal.
// Preserves layout (flex/position) so login forms stay aligned.
const ULTRA_INJECTED_JS = `
(function() {
  try {
    var style = document.createElement('style');
    style.innerHTML = \`
      /* Keep pictures loadable but low-impact — user taps to fully reveal. */
      img, picture, source {
        filter: blur(14px) grayscale(0.4) !important;
        opacity: 0.7 !important;
        max-width: 140px !important;
        max-height: 140px !important;
        cursor: pointer !important;
      }
      img.__ul_revealed {
        filter: none !important;
        opacity: 1 !important;
        max-width: 100% !important;
        max-height: none !important;
      }
      /* Kill bandwidth-heavy embeds. */
      video, canvas, embed, object { display: none !important; }
      iframe:not([src*="recaptcha"]):not([src*="hcaptcha"]):not([src*="challenge"]) {
        display: none !important;
      }
      /* Strip decorative CSS that wastes paint + downloads. Keep layout alive. */
      * {
        background-image: none !important;
        box-shadow: none !important;
        text-shadow: none !important;
        transition: none !important;
        animation: none !important;
        background-attachment: scroll !important;
      }
      /* Hide obvious ad/cookie/popup clutter but NOT login forms. */
      [class*="cookie"], [class*="consent"], [class*="gdpr"],
      [class*="newsletter"], [class*="subscribe-pop"],
      [class*="popup-ad"], [class*="ad-container"],
      [class*="banner-ad"], [id*="cookie-banner"], [id*="gdpr"] {
        display: none !important;
      }
    \`;
    (document.head || document.documentElement).appendChild(style);

    // Tap-to-reveal — click an image once to load the full version.
    document.addEventListener('click', function(e) {
      var t = e.target;
      if (t && t.tagName === 'IMG' && !t.classList.contains('__ul_revealed')) {
        e.preventDefault();
        e.stopPropagation();
        t.classList.add('__ul_revealed');
      }
    }, true);

    // Expose a message handler so RN can intercept download clicks.
    document.addEventListener('click', function(e) {
      var a = e.target && e.target.closest ? e.target.closest('a') : null;
      if (a && a.href && (a.hasAttribute('download') || a.getAttribute('download') !== null)) {
        try {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'download', url: a.href }));
          e.preventDefault();
        } catch(err){}
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
    // Re-load current URL with new settings applied.
    if (url && webRef.current) {
      try { webRef.current.reload(); } catch {}
    }
    trackClick();
  };

  const handleDownload = useCallback(async (dlUrl: string) => {
    trackClick();
    await downloadFile(dlUrl);
  }, []);

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
        key: 'downloads',
        label: 'Downloads',
        icon: 'download-outline' as const,
        onPress: () => router.push('/downloads'),
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
                {ultraLite ? 'UltraLite (Data Saver)' : 'Normal'}
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
              thirdPartyCookiesEnabled
              sharedCookiesEnabled
              setSupportMultipleWindows={false}
              mediaPlaybackRequiresUserAction
              allowsFullscreenVideo={!ultraLite}
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
                const u = req.url || '';
                // Intercept downloadable URLs — route to our Downloads manager.
                if (isDownloadUrl(u)) {
                  handleDownload(u);
                  return false;
                }
                return true;
              }}
              onMessage={(event) => {
                try {
                  const msg = JSON.parse(event.nativeEvent.data);
                  if (msg && msg.type === 'download' && msg.url) {
                    handleDownload(msg.url);
                  }
                } catch {}
              }}
              injectedJavaScriptBeforeContentLoaded={
                ultraLite ? AD_BLOCK_EARLY : ''
              }
              injectedJavaScript={ultraLite ? ULTRA_INJECTED_JS : ''}
              userAgent={ultraLite ? MOBILE_UA : undefined}
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
