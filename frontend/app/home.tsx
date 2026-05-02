// Home — Browser + landing page.
// UltraLite mode architecture (pure-text data-saver):
//   • Login pages (detected by URL pattern) → normal WebView with JS on.
//   • All other pages → RN fetches HTML, strips every script/style/image/
//     iframe/video, injects B&W pure-text CSS, then renders via
//     source={{ html, baseUrl }}. Sub-navigations are intercepted and
//     re-filtered. Result: true 64kbps-friendly reading.
// Normal mode → plain WebView, no injections.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
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
import {
  addBookmark,
  addHistory,
  addShortcut,
  getShortcuts,
  removeShortcut,
  Shortcut,
} from '../src/storage/db';
import { trackClick } from '../src/ads/AdManager';
import { isDownloadUrl, downloadFile } from '../src/utils/downloads';
import { fetchCleanHtml, isLoginUrl } from '../src/utils/ultraliteFetch';
import { mapToLegacy, isTrustedLite } from '../src/utils/legacyMap';

// Chrome-Android mobile UA so sites serve their lightweight mobile build.
const MOBILE_UA =
  'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

// Light cosmetic cleanup for login-page WebViews (UltraLite, URI mode).
// Hides cookie / GDPR / consent banners that bloat lite-version pages on
// 64 kbps. This is a UX helper for browser navigation only — it does not
// affect any in-app advertising in any way.
const LOGIN_PAGE_CSS = `
(function(){
  try {
    var css = document.createElement('style');
    css.innerHTML = '[class*="cookie" i],[class*="consent" i],[class*="gdpr" i]{display:none!important;}';
    (document.head || document.documentElement).appendChild(css);
  } catch(e){}
  true;
})();
`;

function faviconUrl(url: string, size = 64): string {
  try {
    const u = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=${size}`;
  } catch {
    return '';
  }
}

export default function Home() {
  const router = useRouter();
  const state = useAppState();
  const [url, setUrl] = useState<string>('');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [pageTitle, setPageTitle] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
  const [addShortcutOpen, setAddShortcutOpen] = useState(false);
  const [newShortcutName, setNewShortcutName] = useState('');
  const [newShortcutUrl, setNewShortcutUrl] = useState('');

  // UltraLite pure-text state
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [renderMode, setRenderMode] = useState<'none' | 'uri' | 'html'>('none');

  const webRef = useRef<WebView>(null);

  useEffect(() => {
    hydrate();
    refreshShortcuts();
  }, []);

  const refreshShortcuts = useCallback(async () => {
    setShortcuts(await getShortcuts());
  }, []);

  const ultraLite = state.hydrated ? state.ultraLite : getUltraLite();

  // Decide how to render a URL: uri (normal/trusted-lite/login) or html (UltraLite cleaner).
  const openUrl = useCallback(
    async (target: string) => {
      // Reject internal browser intermediate states.
      if (target === 'about:blank' || target.startsWith('about:')) {
        return;
      }
      if (!target) {
        setUrl('');
        setRenderMode('none');
        setHtmlContent('');
        return;
      }

      // ── Pure-Legacy URL mapping (UltraLite only) ──
      // Rewrite popular hosts to their lite/legacy endpoints (e.g.
      //   facebook.com → mbasic.facebook.com,
      //   instagram.com → instagram.com/accounts/login/?force_classic=1,
      //   youtube.com   → m.youtube.com,
      //   wikipedia.org → en.m.wikipedia.org,
      //   reddit.com    → old.reddit.com,
      //   google.com/search → ?gbv=1 basic-HTML SERP)
      const finalTarget = ultraLite ? mapToLegacy(target) : target;
      setUrl(finalTarget);

      // ── Mode selection ──
      // 1) Normal mode → URI WebView, full JS.
      // 2) UltraLite + login URL → URI WebView, JS on (auth flows need JS).
      // 3) UltraLite + trusted-lite host (mbasic.fb, m.wiki, lite.ddg…) → URI
      //    WebView. Already lite-by-design; native forms / cookies preserved.
      // 4) UltraLite + everything else → HTML cleaner via fetchCleanHtml.
      if (!ultraLite || isLoginUrl(finalTarget) || isTrustedLite(finalTarget)) {
        setRenderMode('uri');
        setHtmlContent('');
        return;
      }

      // UltraLite pure-text mode — show an immediate styled "Loading" page
      // (same Pure-Legacy CSS as the cleaned page) so the WebView paints
      // something right away on slow links. Then asynchronously fetch +
      // replace the HTML.
      const stub = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;padding:0;background:#fff;color:#000;font-family:Arial,sans-serif;font-size:16px;line-height:1.4;}body{padding:8px;}h2{margin:6px 0;font-size:18px;}p{margin:4px 0;}small{color:#666;font-size:12px;}</style></head><body><h2>Loading lite version…</h2><p>${finalTarget}</p><small>UltraLite · Pure Legacy mode · stripping scripts/styles/images for 64&nbsp;kbps. This may take a few seconds on slow links.</small></body></html>`;
      setHtmlContent(stub);
      setRenderMode('html');
      setPageTitle(deriveTitle(finalTarget));
      setLoading(true);
      setProgress(0.15);
      try {
        const clean = await fetchCleanHtml(finalTarget);
        setHtmlContent(clean);
        addHistory(deriveTitle(finalTarget), finalTarget).catch(() => {});
      } catch {
        // fetchCleanHtml never throws (returns its own error stub) — keep stub.
      } finally {
        setLoading(false);
        setProgress(1);
      }
    },
    [ultraLite]
  );

  const goSearch = (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text) return;
    Keyboard.dismiss();
    const target = buildSearchUrl(text, ultraLite);
    setInput(text);
    openUrl(target);
    trackClick();
  };

  const onNav = useCallback(
    (navState: any) => {
      setCanGoBack(navState.canGoBack);
      if (navState.title) setPageTitle(navState.title);
      if (navState.url && !navState.loading && renderMode === 'uri') {
        const finalTitle = navState.title || deriveTitle(navState.url);
        addHistory(finalTitle, navState.url).catch(() => {});
      }
    },
    [renderMode]
  );

  const handleToggle = (v: boolean) => {
    setUltraLite(v);
    if (url) {
      openUrl(url); // re-open with new mode
    }
    trackClick();
  };

  const handleDownload = useCallback(async (dlUrl: string) => {
    trackClick();
    await downloadFile(dlUrl);
  }, []);

  const onShortcutLongPress = (s: Shortcut) => {
    Alert.alert(
      'Remove shortcut',
      `Delete "${s.name}" from your home icons?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await removeShortcut(s.id);
            await refreshShortcuts();
          },
        },
      ]
    );
  };

  const saveNewShortcut = async () => {
    const name = newShortcutName.trim();
    let u = newShortcutUrl.trim();
    if (!name || !u) {
      Alert.alert('Missing info', 'Enter both a name and a URL.');
      return;
    }
    if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
    await addShortcut(name, u);
    setNewShortcutName('');
    setNewShortcutUrl('');
    setAddShortcutOpen(false);
    await refreshShortcuts();
  };

  const menuItems = useMemo(
    () => [
      {
        key: 'newtab',
        label: 'New Tab',
        icon: 'add-outline' as const,
        onPress: () => {
          openUrl('');
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
    [url, pageTitle, router, openUrl]
  );

  const showHome = !url;

  // Theme: Normal mode → white body, maroon header only.
  // UltraLite mode → current soft-gray accent surfaces.
  const normalTheme = !ultraLite;
  const bodyBg = normalTheme ? '#FFFFFF' : COLORS.bg;
  const cardBg = normalTheme ? '#FFFFFF' : COLORS.card;
  const cardBorder = normalTheme ? '#EEEEEE' : COLORS.border;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header
        ultraLite={ultraLite}
        onToggleMode={handleToggle}
        onMenu={() => setMenuOpen(true)}
        onLogo={() => {
          openUrl('');
          setInput('');
          setPageTitle('');
        }}
      />

      <View style={styles.searchBarWrap}>
        {showHome ? (
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
        ) : (
          // Browser-active toolbar: back | home | [reload + URL pill]
          <View style={styles.navRow}>
            <Pressable
              onPress={() => {
                if (renderMode === 'uri' && canGoBack) {
                  webRef.current?.goBack();
                } else {
                  openUrl('');
                  setInput('');
                }
                trackClick();
              }}
              style={styles.navIconBtn}
              hitSlop={8}
              testID="webview-back"
            >
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </Pressable>
            <Pressable
              onPress={() => {
                openUrl('');
                setInput('');
                setPageTitle('');
              }}
              style={styles.navIconBtn}
              hitSlop={8}
              testID="webview-home"
            >
              <Ionicons name="home" size={20} color="#fff" />
            </Pressable>
            <Pressable
              onPress={() => {
                // tapping URL pill returns focus to an editable search input
                openUrl('');
                setInput(pageTitle && pageTitle.includes('.') ? pageTitle : url);
              }}
              style={styles.urlPill}
              testID="webview-url-pill"
            >
              <Pressable
                onPress={() => {
                  if (renderMode === 'html') openUrl(url);
                  else webRef.current?.reload();
                  trackClick();
                }}
                hitSlop={8}
                style={styles.reloadInner}
                testID="webview-reload"
              >
                <Ionicons
                  name={loading ? 'close' : 'refresh'}
                  size={16}
                  color={COLORS.maroon}
                />
              </Pressable>
              <Text
                style={styles.urlPillText}
                numberOfLines={1}
                testID="webview-current-url"
              >
                {pageTitle || deriveTitle(url)}
              </Text>
            </Pressable>
          </View>
        )}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: bodyBg }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {showHome ? (
          <ScrollView
            contentContainerStyle={[styles.homeScroll, { backgroundColor: bodyBg }]}
            keyboardShouldPersistTaps="handled"
          >
            <Pressable
              onPress={() => {
                router.push('/radio');
                trackClick();
              }}
              style={[styles.shortcutCard, { backgroundColor: cardBg, borderColor: cardBorder }]}
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

            <View style={[styles.appsCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <View style={styles.appsHead}>
                <Ionicons name="apps-outline" size={20} color={COLORS.text} />
                <Text style={styles.appsTitle}>Top Apps</Text>
                <Text style={styles.appsHint}>Long-press to remove</Text>
              </View>
              <View style={styles.appsGrid}>
                {shortcuts.map((s) => (
                  <Pressable
                    key={s.id}
                    onPress={() => {
                      openUrl(s.url);
                      trackClick();
                    }}
                    onLongPress={() => onShortcutLongPress(s)}
                    delayLongPress={400}
                    style={styles.appTile}
                    testID={`shortcut-${s.id}`}
                  >
                    <View style={styles.appIconWrap}>
                      <Image
                        source={{ uri: faviconUrl(s.url, 64) }}
                        style={styles.appIcon}
                      />
                    </View>
                    <Text style={styles.appLabel} numberOfLines={1}>
                      {s.name}
                    </Text>
                  </Pressable>
                ))}
                <Pressable
                  onPress={() => setAddShortcutOpen(true)}
                  style={styles.appTile}
                  testID="shortcut-add"
                >
                  <View style={[styles.appIconWrap, styles.appIconAdd]}>
                    <Ionicons name="add" size={26} color={COLORS.maroon} />
                  </View>
                  <Text style={styles.appLabel}>Add</Text>
                </Pressable>
              </View>
            </View>

            <Text style={styles.modeHint}>
              Mode:{' '}
              <Text style={{ color: COLORS.maroon, fontWeight: '700' }}>
                {ultraLite ? 'UltraLite (Pure Legacy · 64 kbps)' : 'Normal'}
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
            {renderMode === 'none' ? null : (
              <WebView
                ref={webRef}
                source={
                  renderMode === 'html'
                    ? { html: htmlContent, baseUrl: url }
                    : { uri: url }
                }
                style={{ flex: 1, backgroundColor: '#fff' }}
                originWhitelist={['*']}
                javaScriptEnabled={renderMode !== 'html'}
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
                  // Allow non-http schemes (about:blank, data:, file:, mailto:,
                  // tel:, intent:) through — never intercept these.
                  if (!u.startsWith('http')) return true;
                  // Intercept downloads.
                  if (isDownloadUrl(u)) {
                    handleDownload(u);
                    return false;
                  }
                  // In pure-text (HTML) mode: re-fetch & filter on link clicks
                  // (only for actual http(s) navigations).
                  if (renderMode === 'html' && u !== url) {
                    openUrl(u);
                    return false;
                  }
                  // In URI mode + UltraLite: reroute cross-host clicks so
                  // they get legacy-mapped + lite-cleaned. Same-host clicks
                  // (mbasic.fb internal nav, lite.ddg internal nav) pass
                  // through natively for cookies + form posts.
                  if (
                    renderMode === 'uri' &&
                    ultraLite &&
                    u !== url &&
                    !isLoginUrl(u)
                  ) {
                    try {
                      const fromHost = new URL(url).hostname;
                      const toHost = new URL(u).hostname;
                      if (fromHost !== toHost) {
                        openUrl(u);
                        return false;
                      }
                    } catch {
                      /* ignore — let it through */
                    }
                  }
                  return true;
                }}
                injectedJavaScript={
                  renderMode === 'uri' && ultraLite ? LOGIN_PAGE_CSS : ''
                }
                userAgent={ultraLite ? MOBILE_UA : undefined}
              />
            )}
          </View>
        )}

        <AdBanner testID="home-banner" />
      </KeyboardAvoidingView>

      <MenuSheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        items={menuItems}
      />

      {/* Add shortcut modal */}
      <Modal
        visible={addShortcutOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setAddShortcutOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setAddShortcutOpen(false)}
        >
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Add app shortcut</Text>
            <TextInput
              placeholder="Name (e.g. Wikipedia)"
              placeholderTextColor={COLORS.textMuted}
              style={styles.modalInput}
              value={newShortcutName}
              onChangeText={setNewShortcutName}
              testID="shortcut-name-input"
            />
            <TextInput
              placeholder="URL (e.g. wikipedia.org)"
              placeholderTextColor={COLORS.textMuted}
              style={styles.modalInput}
              value={newShortcutUrl}
              onChangeText={setNewShortcutUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              testID="shortcut-url-input"
            />
            <View style={styles.modalRow}>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnGhost]}
                onPress={() => setAddShortcutOpen(false)}
              >
                <Text style={styles.modalBtnGhostText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnPrimary]}
                onPress={saveNewShortcut}
                testID="shortcut-save-btn"
              >
                <Text style={styles.modalBtnPrimaryText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
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
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  navIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  urlPill: {
    flex: 1,
    height: 38,
    paddingLeft: 8,
    paddingRight: 12,
    backgroundColor: '#fff',
    borderRadius: 19,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reloadInner: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  urlPillText: {
    flex: 1,
    color: COLORS.text,
    fontSize: FONT.size.sm,
  },
  homeScroll: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  shortcutCard: {
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
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
  appsCard: {
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
  },
  appsHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: SPACING.sm,
  },
  appsTitle: {
    flex: 1,
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.bold,
    color: COLORS.text,
  },
  appsHint: { color: COLORS.textMuted, fontSize: FONT.size.xs },
  appsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: SPACING.xs,
  },
  appTile: {
    width: '25%',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  appIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#F5F3F4',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2DDDF',
  },
  appIcon: { width: 36, height: 36 },
  appIconAdd: {
    backgroundColor: '#FFF',
    borderStyle: 'dashed',
    borderColor: COLORS.maroon,
  },
  appLabel: {
    marginTop: 6,
    fontSize: FONT.size.xs,
    color: COLORS.text,
    textAlign: 'center',
    maxWidth: '100%',
  },
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
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: SPACING.lg,
    backgroundColor: '#fff',
  },
  loaderText: { color: COLORS.textMuted, fontSize: FONT.size.sm, textAlign: 'center' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
  },
  modalTitle: {
    fontSize: FONT.size.xl,
    fontWeight: FONT.weight.bold,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    marginTop: SPACING.sm,
    fontSize: FONT.size.md,
    color: COLORS.text,
  },
  modalRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  modalBtnGhost: {
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalBtnGhostText: {
    color: COLORS.text,
    fontWeight: FONT.weight.semibold,
  },
  modalBtnPrimary: {
    backgroundColor: COLORS.maroon,
  },
  modalBtnPrimaryText: {
    color: '#fff',
    fontWeight: FONT.weight.bold,
  },
});
