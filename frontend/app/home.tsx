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
  BackHandler,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import MenuSheet from '../src/components/MenuSheet';
import AdBanner from '../src/components/AdBanner';
import { COLORS, FONT, RADIUS, SPACING } from '../src/constants/theme';
import {
  getUltraLite,
  setUltraLite,
  hydrate,
  useAppState,
  grantRadioShareUnlock,
  getActiveTabId,
  setActiveTabId,
  getDesktopView,
  setDesktopView,
} from '../src/state/appState';
import { buildSearchUrl, deriveTitle } from '../src/utils/url';
import {
  addBookmark,
  addHistory,
  addShortcut,
  CRICAPP_URL,
  createTab,
  deleteTab,
  getCachedHtml,
  saveCachedHtml,
  getShortcuts,
  getTabById,
  getTabCount,
  getTabs,
  isPinnedShortcut,
  removeShortcut,
  Shortcut,
  Tab,
  TabMode,
  updateTab,
} from '../src/storage/db';
import { trackClick } from '../src/ads/AdManager';
import { isDownloadUrl, downloadFile } from '../src/utils/downloads';
import { fetchCleanHtml, isLoginUrl } from '../src/utils/ultraliteFetch';
import {
  getInstantHtmlForUrl,
  stripInternalMarkers,
} from '../src/constants/instantPages';
import {
  mapToLegacy,
  unwrapDuckDuckGoRedirect,
} from '../src/utils/legacyMap';

// Chrome-Android mobile UA so sites serve their lightweight mobile build.
const MOBILE_UA =
  'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

// Desktop UA used when the user enables "Desktop View" in settings.
// Build #24 — works in BOTH modes; sites will deliver their full desktop
// HTML/CSS instead of the mobile build.  Combined with a 1024-px viewport
// override (DESKTOP_VIEWPORT below) so layouts don't break.
const DESKTOP_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Inject a 1024-px viewport so the WebView lays out the desktop site at
// roughly the right scale (otherwise mobile WebView shrinks everything to
// fit the screen and tap targets become unreadable).
const DESKTOP_VIEWPORT = `
(function(){
  try {
    var meta = document.querySelector('meta[name="viewport"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name','viewport');
      (document.head || document.documentElement).appendChild(meta);
    }
    meta.setAttribute('content','width=1024,initial-scale=0.5,minimum-scale=0.25,maximum-scale=2');
  } catch(e){}
  true;
})();
`;

// ──────────────────────────────────────────────────────────────────────────
//  Strict image / media block for UltraLite URI-mode WebViews.
//  Injected as `injectedJavaScriptBeforeContentLoaded` so it runs BEFORE any
//  <img> / <video> / <iframe> has a chance to fire a network request.  This
//  is what keeps 2G bandwidth tight on sites that we render directly
//  (mbasic.facebook.com, instagram classic login, m.youtube, m.wikipedia
//  etc.) — without this JS they'd happily suck down megabytes of avatars.
// ──────────────────────────────────────────────────────────────────────────
const STRICT_MEDIA_BLOCK = `
(function(){
  try {
    // 1. Inject a high-specificity stylesheet that hides every media /
    //    decorative element plus common cookie / consent / notice banners.
    var css = document.createElement('style');
    css.id = '__ul_media_block';
    css.innerHTML =
      'img,picture,source,video,audio,iframe,embed,object,svg,canvas,' +
      'input[type="image"]{display:none!important;visibility:hidden!important;' +
      'width:0!important;height:0!important;max-width:0!important;max-height:0!important;}' +
      '[style*="background-image" i],[style*="background: url" i],' +
      '[style*="background:url" i]{background-image:none!important;}' +
      '[class*="cookie" i],[class*="consent" i],[class*="gdpr" i],' +
      '[class*="banner" i],[class*="popup" i],[class*="modal" i],' +
      '[id*="cookie" i],[id*="consent" i],[id*="gdpr" i]{display:none!important;}' +
      'body{background:#fff!important;color:#111!important;}';
    (document.head || document.documentElement).appendChild(css);

    // 2. Patch HTMLImageElement.src so any JS-created <img> silently no-ops.
    //    This stops lazy-loaders / analytics pixels cold.
    try {
      var proto = HTMLImageElement.prototype;
      var descr = Object.getOwnPropertyDescriptor(proto, 'src');
      Object.defineProperty(proto, 'src', {
        configurable: true,
        enumerable: true,
        get: function(){ return ''; },
        set: function(){ /* swallow */ },
      });
    } catch(e){}

    // 3. Keep media suppressed even as the DOM hydrates.
    var mo = new MutationObserver(function(muts){
      muts.forEach(function(m){
        m.addedNodes && m.addedNodes.forEach(function(n){
          if(n.nodeType!==1) return;
          if(n.tagName==='IMG'||n.tagName==='VIDEO'||n.tagName==='IFRAME'||
             n.tagName==='PICTURE'||n.tagName==='SOURCE'||n.tagName==='OBJECT'){
            try { n.remove(); } catch(e){}
          }
        });
      });
    });
    try { mo.observe(document.documentElement,{childList:true,subtree:true}); } catch(e){}
  } catch(e){}
  true;
})();
`;

// Light cosmetic cleanup for login-page WebViews (JS-on URI mode). Kept
// separate from STRICT_MEDIA_BLOCK because login pages need <img> (CAPTCHAs,
// profile pictures) to stay visible for authentication flows.
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

// ──────────────────────────────────────────────────────────────────────────
//  DuckDuckGo branding strip (Normal-mode WebView).
//  When the user lands on any *.duckduckgo.com page (search results, lite
//  endpoint, etc.) we hide the DDG logo / "DuckDuckGo" wordmark and clean
//  the page <title> so the URL bar shows just the query.  This keeps the
//  app neutral on trademarks and avoids Play Store policy flags for
//  third-party branding without partnership.
//
//  Runs as `injectedJavaScriptBeforeContentLoaded` so the CSS lands before
//  the header paints — no visual flicker on slow connections.
// ──────────────────────────────────────────────────────────────────────────
const DDG_BRANDING_HIDE = `
(function(){
  try {
    if (!/(^|\\.)duckduckgo\\.com$/i.test(location.hostname)) { return true; }
    var css = document.createElement('style');
    css.id = '__ul_ddg_brand_hide';
    css.innerHTML =
      // Lite endpoint (lite.duckduckgo.com) — the logo lives in a <table class="header">
      // row.  Hide the entire row.
      'table.header tr:first-child{display:none!important;}' +
      // Lite + html — anchor / div / span that wraps or contains the logo wordmark.
      '.header__logo,.header__logo-wrap,.header__logo-line,.header__logo-narrow,' +
      '.header__logo-horizontal,.site-header__logo,.site-wrapper--home__logo,' +
      '#logo_homepage_link,#logo,#header_logo,#header_logo_mobile,' +
      'a[href="/"][class*="logo" i],a[href="https://duckduckgo.com" i][class*="logo" i],' +
      'div[class*="logo" i]:not([class*="login" i]):not([class*="signup" i]),' +
      'img[alt*="DuckDuckGo" i],img[src*="logo" i][src*="duckduckgo" i]' +
      '{display:none!important;visibility:hidden!important;height:0!important;width:0!important;}' +
      // Footer / About-us / "Privacy, simplified." tagline rows.
      '.tag-home,.tag-home__wrapper,.tag-home__item{display:none!important;}' +
      '.footer,.footer__wrap,.site-footer,#footer{display:none!important;}';
    (document.head || document.documentElement).appendChild(css);

    // Drop "DuckDuckGo" from the page title so the URL bar shows just the
    // search query.  Patches both the initial <title> and any later JS
    // re-assignment.
    var stripTitle = function(t){
      try {
        return (t || '')
          .replace(/\\s*(?:at|on|—|–|-|\\|)\\s*DuckDuckGo\\s*$/i,'')
          .replace(/^DuckDuckGo\\s*[—–\\-|:]\\s*/i,'')
          .replace(/^DuckDuckGo$/i,'')
          .trim();
      } catch(e){ return t; }
    };
    try { document.title = stripTitle(document.title); } catch(e){}
    try {
      var titleEl = document.querySelector('title');
      if (titleEl) {
        var mo = new MutationObserver(function(){
          var cleaned = stripTitle(document.title);
          if (cleaned !== document.title) {
            try { document.title = cleaned; } catch(e){}
          }
        });
        mo.observe(titleEl, { childList: true, subtree: true, characterData: true });
      }
    } catch(e){}

    // Strip standalone "DuckDuckGo" wordmark text nodes (e.g. footer
    // copyright lines, "powered by DuckDuckGo" callouts) on DOM hydrate.
    var hideWordmark = function(){
      try {
        var nodes = document.querySelectorAll('a,span,div,p,small');
        for (var i=0; i<nodes.length; i++) {
          var el = nodes[i];
          var txt = (el.textContent || '').trim();
          if (txt === 'DuckDuckGo' && el.children.length === 0) {
            el.style.display = 'none';
          }
        }
      } catch(e){}
    };
    try {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', hideWordmark);
      } else {
        hideWordmark();
      }
      // Re-run after late JS injections.
      setTimeout(hideWordmark, 800);
      setTimeout(hideWordmark, 2500);
    } catch(e){}
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
  // Phase-wise status string shown inside the URL bar / under it while
  // an UltraLite fetch is in flight.  Drives the "Connecting → Fetching →
  // Rendering" copy so 2G users always see *some* movement on screen.
  const [statusText, setStatusText] = useState<string>('');
  // Animated indeterminate ticker — when no real progress is reported,
  // we still creep this forward so the bar visibly moves.  Resets on
  // every new openUrl().
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Multi-tab state (Phase B, build #22) ──
  // Each tab is scoped to a mode; mode switch flips which tab list is
  // visible without touching the records.  `activeTabId` references the
  // tab currently displayed in the WebView for the CURRENT mode.
  // `tabsForMode` is the up-to-date list shown in the switcher modal.
  const [activeTabId, setActiveTabIdLocal] = useState<number>(0);
  const [tabsForMode, setTabsForMode] = useState<Tab[]>([]);
  const [tabSwitcherOpen, setTabSwitcherOpen] = useState(false);
  const [tabsCount, setTabsCount] = useState(1);

  const webRef = useRef<WebView>(null);
  // Sequence counter — only the LATEST openUrl invocation is allowed to
  // write state.  Without this, a slow fetchCleanHtml() from a previous URL
  // can land after the user has already tapped "New Tab" (which calls
  // openUrl('')) and overwrite the blank state with stale content —
  // exactly the "New Tab doesn't work" symptom reported in build #20.
  const openSeq = useRef(0);

  // Build #25 — Per-tab navigation history.
  // User reported: "back press takes me to the home page or first page,
  // not the previous page".  Native WebView.goBack() only works for URI
  // mode (and only when the WebView's own history has the page).  In
  // HTML cleaner mode every page is rendered from a fresh `source={{html}}`
  // so the WebView has zero history of its own — back used to bail out
  // to the home screen.  We now keep a JS-side stack PER active tab so
  // every successful navigation pushes the previous URL, and pressing
  // back pops one entry and reopens it without re-pushing.
  const navHistoryRef = useRef<Map<number, string[]>>(new Map());
  // Set briefly while we're processing a "go back" so openUrl() does NOT
  // push the URL we're navigating TO onto the history stack (otherwise
  // back-back would oscillate between two URLs).
  const navigatingBackRef = useRef(false);
  const [historyDepth, setHistoryDepth] = useState(0);
  const refreshHistoryDepth = useCallback((tabId: number) => {
    const arr = navHistoryRef.current.get(tabId) || [];
    setHistoryDepth(arr.length);
  }, []);

  // Helper: refresh the tab list shown in the switcher modal.
  const refreshTabs = useCallback(async (mode: TabMode) => {
    const list = await getTabs(mode);
    setTabsForMode(list);
    setTabsCount(list.length);
  }, []);

  // Ensure exactly one tab exists for the given mode and return its id.
  // Called on hydrate AND whenever the user toggles modes — guarantees
  // the WebView is always backed by a real tab record (so `updateTab`
  // calls during navigation are never no-ops).
  const ensureActiveTab = useCallback(
    async (mode: TabMode) => {
      let id = getActiveTabId(mode);
      if (id) {
        const t = await getTabById(id);
        if (!t) id = 0;
      }
      if (!id) {
        // Either fresh install or the active tab was deleted while
        // the user was in the other mode.  Create one.
        id = await createTab(mode);
        await setActiveTabId(mode, id);
      }
      const t = await getTabById(id);
      setActiveTabIdLocal(id);
      await refreshTabs(mode);
      return t;
    },
    [refreshTabs]
  );

  // Stash the most recently-defined `openUrl` so the hydrate effect
  // (which fires before openUrl exists in the closure) can still call
  // the latest implementation when restoring a saved tab.
  const openUrlRef = useRef<((u: string) => Promise<void>) | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await hydrate();
      if (cancelled) return;
      await refreshShortcuts();
      const mode: TabMode = getUltraLite() ? 'ultralite' : 'normal';
      // Build #23: always launch on home page (not auto-restoring the
      // previously-active tab's URL).  Saves data on slow links and
      // honours the "mode switch = home" UX policy even on cold start.
      // The tab list still lives in SQLite and is reachable via the
      // tab switcher.  We create a fresh blank tab if none exist so
      // the first navigation has somewhere to persist to.
      await ensureActiveTab(mode);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshShortcuts = useCallback(async () => {
    setShortcuts(await getShortcuts());
  }, []);

  const ultraLite = state.hydrated ? state.ultraLite : getUltraLite();
  // Build #24 user toggles — read from app state so the home screen
  // reacts immediately when settings change.
  const allowImages = state.hydrated ? !!state.allowImages : false;
  const allowJs = state.hydrated ? !!state.allowJs : false;
  const desktopView = state.hydrated ? !!state.desktopView : false;

  // Decide how to render a URL: uri (normal/trusted-lite/login) or html (UltraLite cleaner).
  const openUrl = useCallback(
    async (target: string) => {
      // Bump sequence — anything older becomes stale.
      const mySeq = ++openSeq.current;
      const isCurrent = () => openSeq.current === mySeq;

      // Reject internal browser intermediate states.
      if (target === 'about:blank' || target.startsWith('about:')) {
        return;
      }
      // New-Tab / Home reset — clear everything SYNCHRONOUSLY.
      if (!target) {
        if (tickerRef.current) {
          clearInterval(tickerRef.current);
          tickerRef.current = null;
        }
        setUrl('');
        setRenderMode('none');
        setHtmlContent('');
        setPageTitle('');
        setInput('');
        setLoading(false);
        setProgress(0);
        setStatusText('');
        setCanGoBack(false);
        return;
      }

      // ── Unwrap DuckDuckGo redirect URLs (duckduckgo.com/l/?uddg=<real>)
      //    so clicking a search result navigates to the actual article
      //    instead of bouncing back to the DDG search box (build-#20 bug). ──
      const unwrapped = unwrapDuckDuckGoRedirect(target);
      const clickThrough = unwrapped || target;

      // ── Pure-Legacy URL mapping (UltraLite only) ──
      // Rewrite popular hosts to their lite/legacy endpoints (e.g.
      //   facebook.com → mbasic.facebook.com,
      //   instagram.com → instagram.com/accounts/login/?force_classic=1,
      //   youtube.com   → m.youtube.com,
      //   wikipedia.org → en.m.wikipedia.org,
      //   reddit.com    → old.reddit.com,
      //   google.com/search → ?gbv=1 basic-HTML SERP)
      const mappedTarget = ultraLite ? mapToLegacy(clickThrough) : clickThrough;
      // Detect-then-strip the internal `ul_no_instant=1` marker that
      // links inside our instant pages carry.  We need to KNOW the
      // marker was present (so the instant fast-path can be skipped
      // for sub-page clicks) but we must NOT keep it in the URL we
      // actually navigate to / display in the URL bar / persist into
      // history.
      const hadInstantSkipMarker = /[?&]ul_no_instant=1\b/.test(mappedTarget);
      const finalTarget = stripInternalMarkers(mappedTarget);
      if (!isCurrent()) return;

      // Build #25 — push the OLD URL to per-tab history before we move on,
      // unless we're navigating BACK (in which case the previous frame is
      // already where we want to land).  Empty / about:blank / same-URL
      // pushes are skipped so the stack stays clean.
      if (
        !navigatingBackRef.current &&
        activeTabId &&
        url &&
        url !== finalTarget &&
        url !== 'about:blank'
      ) {
        const stack = navHistoryRef.current.get(activeTabId) || [];
        // Avoid runaway growth — cap at 50 entries per tab.
        if (stack.length >= 50) stack.shift();
        stack.push(url);
        navHistoryRef.current.set(activeTabId, stack);
        setHistoryDepth(stack.length);
      }
      // Reset back-flag for next call regardless of branch taken.
      navigatingBackRef.current = false;

      setUrl(finalTarget);

      // Persist the URL to the active tab so it survives mode switches
      // and app restarts.  (Per-mode active-tab id was hydrated on mount.)
      if (activeTabId) {
        updateTab(activeTabId, finalTarget, deriveTitle(finalTarget)).catch(
          () => {}
        );
      }

      // ── Mode selection ──
      // 1) Normal mode → URI WebView, full JS.
      // 2) UltraLite + login URL → URI WebView, JS on (auth flows need JS).
      // 3) UltraLite + user-enabled "Allow JavaScript" → URI WebView so
      //    sites that need JS (AdMob console, Play Console, Gmail, SPAs)
      //    work end-to-end.  STRICT_MEDIA_BLOCK is still injected unless
      //    the user has also enabled Allow Images.
      // 4) UltraLite + everything else → HTML cleaner via fetchCleanHtml.
      //    Build #24: removed the legacy `isTrustedLite()` short-circuit
      //    that gave Facebook / Instagram / Twitter / YouTube / Wikipedia
      //    URI-mode treatment.  Per user request, every site (except
      //    explicit logins and Allow-JS sessions) now renders in pure
      //    text mode for uniform low-data behaviour.
      //
      // Build #27.1 — Instagram regression fix.  legacyMap rewrites
      // instagram.com → instagram.com/accounts/login/?force_classic=1 so
      // we get a 2G-friendly HTML body.  But that path matches the
      // `accounts\/login` arm of isLoginUrl() and was sending the page
      // back into URI / full-image mode (defeating UltraLite).  We now
      // treat any URL carrying `force_classic=1` as a deliberate
      // cleaner-mode request even if the path mentions /login.  Real
      // auth flows (accounts.google.com/signin etc.) never carry that
      // flag, so they keep their JS-on URI treatment.
      const isCleanerForced = /[?&]force_classic=1\b/.test(finalTarget);
      if (
        !ultraLite ||
        (isLoginUrl(finalTarget) && !isCleanerForced) ||
        (ultraLite && allowJs)
      ) {
        if (!isCurrent()) return;
        setRenderMode('uri');
        setHtmlContent('');
        return;
      }

      // Build #28 — INSTANT-RENDER fast path for popular destinations.
      // Instagram, Facebook (mbasic) and BBC News ship pre-built HTML
      // stubs in the app bundle, so we can paint them with ZERO network
      // round-trip the moment the user taps the tile.  fetchCleanHtml
      // still runs in the background to refresh content if the user
      // wants to follow a link from the stub.
      //
      // Build #28.1 — when the URL came from a link INSIDE an instant
      // page (carries `ul_no_instant=1` which we already stripped into
      // `hadInstantSkipMarker`), bypass the fast-path so the cleaner
      // can fetch the actual sub-page.  Without this, every link tap
      // on the instant page would silently re-render the same screen.
      const instantHtml =
        ultraLite && !hadInstantSkipMarker
          ? getInstantHtmlForUrl(finalTarget)
          : null;
      if (instantHtml) {
        if (!isCurrent()) return;
        if (tickerRef.current) {
          clearInterval(tickerRef.current);
          tickerRef.current = null;
        }
        setHtmlContent(instantHtml);
        setRenderMode('html');
        setPageTitle(deriveTitle(finalTarget));
        setLoading(false);
        setProgress(1);
        setStatusText('');
        addHistory(deriveTitle(finalTarget), finalTarget).catch(() => {});
        return;
      }

      // UltraLite pure-text mode — show an immediate styled "Loading" page
      // (same Pure-Legacy CSS as the cleaned page) so the WebView paints
      // something right away on slow links. Then asynchronously fetch +
      // replace the HTML.  Progress ticks every 2.5 s so the user sees a
      // live elapsed-time counter and knows the fetch is still alive on
      // sub-30 kbps connections.
      //
      // Build #27 — streaming render.  The stub now ships with two stable
      // anchor elements:
      //   • <strong id="__ul_elapsed">   — updated via injectJavaScript()
      //                                     so the elapsed-time ticker
      //                                     does NOT trigger a full
      //                                     WebView reload (which would
      //                                     wipe any streamed content).
      //   • <div id="__ul_stream">       — receives progressively-larger
      //                                     cleaned <body> snapshots from
      //                                     fetchCleanHtml's onPartialText
      //                                     callback so the user sees
      //                                     content paint line-by-line.
      // The final `setHtmlContent(clean)` at the end of fetchCleanHtml
      // still does a full document swap — that gives us a clean DOM with
      // the proper <base href> + footer actions for the finished page.
      const makeStub = () =>
        `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;padding:0;background:#fff;color:#000;font-family:Arial,sans-serif;font-size:16px;line-height:1.4;}body{padding:8px;}h2{margin:6px 0;font-size:18px;}p{margin:4px 0;}small{color:#666;font-size:12px;}.__prog{margin-top:10px;padding:6px;border:1px solid #ccc;background:#f7f7f7;color:#333;font-size:13px;}.__ul_stream_head{margin-top:12px;padding:4px 0;border-top:1px dashed #aaa;color:#888;font-size:11px;}#__ul_stream{margin-top:4px;}#__ul_stream a,#__ul_stream a:link{color:#0000EE;text-decoration:underline;}#__ul_stream a:visited{color:#551A8B;}#__ul_stream h1,#__ul_stream h2,#__ul_stream h3,#__ul_stream h4{margin:8px 0 4px;font-weight:bold;line-height:1.25;}#__ul_stream h1{font-size:20px;}#__ul_stream h2{font-size:18px;}#__ul_stream h3{font-size:17px;}#__ul_stream p{margin:6px 0;}#__ul_stream ul,#__ul_stream ol{padding-left:22px;margin:6px 0;}#__ul_stream li{margin:2px 0;}#__ul_stream hr{border:0;border-top:1px solid #888;margin:8px 0;}#__ul_stream table{border-collapse:collapse;margin:6px 0;}#__ul_stream td,#__ul_stream th{border:1px solid #aaa;padding:2px 6px;}#__ul_stream input,#__ul_stream textarea,#__ul_stream button,#__ul_stream select{font-family:Arial,sans-serif;font-size:16px;color:#000;border:1px solid #888;padding:4px;background:#fff;}.__ul_imgbox{display:inline-block;min-width:24px;height:18px;border:1px solid #aaa;background:#f0f0f0;color:#666;font-size:11px;padding:0 4px;margin:0 2px;text-align:center;vertical-align:middle;line-height:18px;font-family:monospace;}</style></head><body><h2>Loading lite version…</h2><p>${finalTarget}</p><div class="__prog">Elapsed: <strong id="__ul_elapsed">0s</strong> · direct + proxy running in parallel · large pages capped at 1.5 MB.</div><small>UltraLite · Pure Legacy mode · stripping scripts/styles/images for 2G. Content streams in line-by-line as it arrives.</small><div class="__ul_stream_head" id="__ul_stream_head" style="display:none;">— streaming content (partial) —</div><div id="__ul_stream"></div></body></html>`;
      if (!isCurrent()) return;

      // Build #24 — try the on-device HTML cache first.  If we cleaned the
      // same URL within the last 10 minutes, render it instantly without
      // touching the network.  This is the single biggest UX win for
      // sub-60 kbps users who flip between pages.
      const HTML_CACHE_TTL_MS = 10 * 60 * 1000;
      try {
        const cached = await getCachedHtml(finalTarget, HTML_CACHE_TTL_MS);
        if (cached && isCurrent()) {
          setHtmlContent(cached.html);
          setRenderMode('html');
          setPageTitle(cached.title || deriveTitle(finalTarget));
          setLoading(false);
          setProgress(1);
          setStatusText('');
          addHistory(cached.title || deriveTitle(finalTarget), finalTarget).catch(() => {});
          return;
        }
      } catch {}

      setHtmlContent(makeStub());
      setRenderMode('html');
      setPageTitle(deriveTitle(finalTarget));
      setLoading(true);
      setProgress(0.05);
      setStatusText('Connecting to 2G Node…');
      // Kick off micro-movement ticker — even if no bytes arrive, the
      // progress bar creeps 0.5 % every 600 ms so the user never thinks
      // the app has hung.  Capped at 92 % so the real "done" can still
      // visibly fill the rest.
      if (tickerRef.current) clearInterval(tickerRef.current);
      tickerRef.current = setInterval(() => {
        if (!isCurrent()) return;
        setProgress((p) => (p < 0.92 ? Math.min(0.92, p + 0.005) : p));
      }, 600);
      try {
        const clean = await fetchCleanHtml(
          finalTarget,
          (info) => {
            // Build #27 — DON'T call setHtmlContent here.  That used to
            // re-mount the WebView on every tick (~700 ms) and wiped any
            // streamed content already injected.  Instead, update the
            // elapsed-time chip in-place via injectJavaScript so the
            // streamed DOM survives.  Only if this openUrl call is still
            // the active one.
            if (!isCurrent()) return;
            const elapsedS = Math.round(info.elapsedMs / 100) / 10;
            try {
              webRef.current?.injectJavaScript(
                `(function(){try{var e=document.getElementById('__ul_elapsed');if(e)e.textContent=${JSON.stringify(
                  String(elapsedS) + 's'
                )};}catch(_){}true;})();true;`
              );
            } catch {}
            // Phase-wise status copy + real progress floor based on phase.
            if (info.phase === 'connect') {
              setStatusText('Connecting to 2G Node…');
              setProgress((p) => Math.max(p, 0.1));
            } else if (info.phase === 'fetch') {
              const kb = Math.round(info.bytes / 1024);
              setStatusText(`Fetching Text Packets… ${kb} KB`);
              // Map bytes 0-300KB to 21-70%.
              const byteFrac = Math.min(1, info.bytes / (300 * 1024));
              setProgress((p) =>
                Math.max(p, 0.21 + byteFrac * 0.49)
              );
            } else if (info.phase === 'render') {
              setStatusText('Rendering Layout…');
              setProgress((p) => Math.max(p, 0.75));
            }
          },
          {
            keepImages: allowImages,
            // Build #27 — Lynx-style streaming render.  Each cleaned
            // <body> snapshot from fetchCleanHtml lands here while bytes
            // are still flowing in.  We replace the contents of the
            // stub's `#__ul_stream` container so content appears
            // line-by-line on 2G instead of after the full document.
            // We also reveal the small "streaming content" header on
            // the first non-empty payload so users know the live feed
            // has started.
            onPartialText: (cleanedBody: string) => {
              if (!isCurrent()) return;
              try {
                const safe = JSON.stringify(cleanedBody);
                // NOTE: deliberately NOT calling window.scrollTo here —
                // doing so on every partial would hijack the user's
                // scroll position while they were reading earlier
                // content.  Browser default keeps scroll where it is.
                webRef.current?.injectJavaScript(
                  `(function(){try{var c=document.getElementById('__ul_stream');if(c){c.innerHTML=${safe};}var h=document.getElementById('__ul_stream_head');if(h){h.style.display='block';}}catch(_){}true;})();true;`
                );
              } catch {}
            },
          }
        );
        // GUARD: if the user has moved on (New Tab, another click) while
        // fetchCleanHtml was in flight, do NOT clobber the newer state.
        if (!isCurrent()) return;
        setHtmlContent(clean);
        addHistory(deriveTitle(finalTarget), finalTarget).catch(() => {});
        // Build #24 — persist the cleaned page so a re-tap within
        // HTML_CACHE_TTL_MS is instant (no network at all).  Skipped on
        // very small payloads (likely an error stub) to avoid caching
        // failure messages.
        if (clean && clean.length > 1024) {
          saveCachedHtml(finalTarget, clean, deriveTitle(finalTarget)).catch(() => {});
        }
      } catch {
        // fetchCleanHtml never throws (returns its own error stub) — keep stub.
      } finally {
        if (isCurrent()) {
          if (tickerRef.current) {
            clearInterval(tickerRef.current);
            tickerRef.current = null;
          }
          setLoading(false);
          setProgress(1);
          setStatusText('');
        }
      }
    },
    [ultraLite, activeTabId, allowImages, allowJs]
  );

  // Keep the latest openUrl available to the hydrate effect (which is
  // declared BEFORE openUrl in render order — so without this ref it
  // can't call the freshest implementation when restoring a saved tab).
  useEffect(() => {
    openUrlRef.current = openUrl;
  }, [openUrl]);

  // Build #25 — Android hardware back button handler.
  // Priority: close any open modal first, then pop the JS-side history,
  // then fall back to native WebView back, then let Android exit the
  // app.  Without this, hardware back went straight to OS-default and
  // users couldn't undo deep navigations from cleaned pages.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const onBack = () => {
      // 1. Tab switcher modal open → close it.
      if (tabSwitcherOpen) {
        setTabSwitcherOpen(false);
        return true;
      }
      // 2. Main bottom-sheet menu open → close it.
      if (menuOpen) {
        setMenuOpen(false);
        return true;
      }
      // 3. URI mode (Normal mode) → native WebView goBack() walks
      //    step-by-step through visited pages (Chrome-like behaviour).
      if (renderMode === 'uri' && canGoBack) {
        webRef.current?.goBack();
        return true;
      }
      // 4. HTML cleaner mode (UltraLite) → use the JS-side history
      //    stack since the WebView has no native history of its own
      //    (every page is rendered from a fresh `source={{html}}`).
      const stack = navHistoryRef.current.get(activeTabId) || [];
      if (stack.length > 0) {
        const prev = stack.pop()!;
        navHistoryRef.current.set(activeTabId, stack);
        setHistoryDepth(stack.length);
        navigatingBackRef.current = true;
        setInput(prev);
        openUrl(prev);
        return true;
      }
      // 5. We're already at home of this tab — let Android exit the app.
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, [tabSwitcherOpen, menuOpen, renderMode, canGoBack, activeTabId, openUrl]);

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

  const handleToggle = useCallback(async (v: boolean) => {
    setUltraLite(v);
    trackClick();
    // Build #24 — user-requested behaviour: switching modes should NOT
    // auto-create a new tab (the previous build did, which kept piling
    // up empty tabs every time the user toggled).  Instead, restore the
    // mode's existing active tab if it has a URL, else show home.
    const mode: TabMode = v ? 'ultralite' : 'normal';
    const t = await ensureActiveTab(mode);
    if (t && t.url) {
      // Resume the existing tab — don't fetch eagerly here, just set the
      // URL bar; the WebView's source prop drives the actual load.
      setUrl(t.url);
      setInput(t.url);
      setPageTitle(t.title || deriveTitle(t.url));
      // Re-route through openUrl so the right render mode (uri vs html)
      // is picked for the current mode.  openUrl is idempotent for the
      // same URL and respects the openSeq guard.
      openUrlRef.current?.(t.url);
    } else {
      setUrl('');
      setRenderMode('none');
      setHtmlContent('');
      setPageTitle('');
      setInput('');
      setLoading(false);
      setProgress(0);
      setStatusText('');
      setCanGoBack(false);
    }
  }, [ensureActiveTab]);

  // ── Tab actions exposed via the tab switcher modal ──
  const onNewTab = useCallback(async () => {
    const mode: TabMode = ultraLite ? 'ultralite' : 'normal';
    const id = await createTab(mode);
    await setActiveTabId(mode, id);
    setActiveTabIdLocal(id);
    setUrl('');
    setRenderMode('none');
    setHtmlContent('');
    setPageTitle('');
    setInput('');
    setLoading(false);
    setProgress(0);
    setStatusText('');
    await refreshTabs(mode);
    setTabSwitcherOpen(false);
    trackClick();
  }, [ultraLite, refreshTabs]);

  const onSwitchTab = useCallback(
    async (tab: Tab) => {
      const mode: TabMode = ultraLite ? 'ultralite' : 'normal';
      await setActiveTabId(mode, tab.id);
      setActiveTabIdLocal(tab.id);
      setTabSwitcherOpen(false);
      if (tab.url) {
        openUrlRef.current?.(tab.url);
      } else {
        setUrl('');
        setRenderMode('none');
        setHtmlContent('');
        setPageTitle('');
        setInput('');
      }
      trackClick();
    },
    [ultraLite]
  );

  const onCloseTab = useCallback(
    async (tab: Tab) => {
      const mode: TabMode = ultraLite ? 'ultralite' : 'normal';
      await deleteTab(tab.id);
      // Build #25 — release the tab's history stack so closed tabs don't
      // leak memory and stale histories can never be restored against a
      // recycled id.
      navHistoryRef.current.delete(tab.id);
      // If the closed tab was the active one, fall back to the most
      // recent remaining tab — or auto-create a fresh blank one.
      if (tab.id === activeTabId) {
        const remaining = await getTabs(mode);
        if (remaining.length > 0) {
          await setActiveTabId(mode, remaining[0].id);
          setActiveTabIdLocal(remaining[0].id);
          if (remaining[0].url) {
            openUrlRef.current?.(remaining[0].url);
          } else {
            setUrl('');
            setRenderMode('none');
            setHtmlContent('');
            setPageTitle('');
          }
        } else {
          const id = await createTab(mode);
          await setActiveTabId(mode, id);
          setActiveTabIdLocal(id);
          setUrl('');
          setRenderMode('none');
          setHtmlContent('');
          setPageTitle('');
        }
      }
      await refreshTabs(mode);
    },
    [ultraLite, activeTabId, refreshTabs]
  );

  const onOpenTabSwitcher = useCallback(async () => {
    const mode: TabMode = ultraLite ? 'ultralite' : 'normal';
    await refreshTabs(mode);
    setTabSwitcherOpen(true);
    trackClick();
  }, [ultraLite, refreshTabs]);

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
        // Build #25 — was openUrl('') which only RESET screen state
        // without actually creating a new tab record.  Now wires to the
        // real onNewTab() so a fresh tab id is allocated and persisted,
        // matching the behaviour of the "+" button in the tab switcher.
        // Build #28 — also opens the tab switcher for half a second so
        // the user gets visible confirmation that a new tab has been
        // added (previously the menu just closed and nothing seemed to
        // happen, which the user reported as "New Tab not working").
        onPress: async () => {
          await onNewTab();
          setTabSwitcherOpen(true);
          setTimeout(() => setTabSwitcherOpen(false), 900);
        },
      },
      // Build #28 — Desktop View promoted out of "Data Saver Settings"
      // into the main 3-dot menu per user feedback.  Tapping it toggles
      // the same persisted preference; menu shows current ON/OFF state.
      {
        key: 'desktopview',
        label: desktopView ? 'Desktop View · ON' : 'Desktop View · OFF',
        icon: (desktopView
          ? 'desktop-outline'
          : 'phone-portrait-outline') as keyof typeof Ionicons.glyphMap,
        onPress: async () => {
          const next = !desktopView;
          await setDesktopView(next);
          // If a page is currently loaded, re-open it so the new UA
          // takes effect immediately (otherwise the user would have to
          // hit reload manually).
          if (url) {
            openUrlRef.current?.(url);
          }
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
    [url, pageTitle, router, openUrl, onNewTab, desktopView]
  );

  const showHome = !url;

  // Build #22: full white background app-wide; orange/blue logo accents.
  const bodyBg = '#FFFFFF';
  const cardBg = '#FFFFFF';
  const cardBorder = COLORS.border;

  // ── Share-app handler — alternative path to the radio 30-min unlock.
  const handleShareApp = useCallback(async () => {
    try {
      const result = await Share.share({
        message:
          'Try UltraLite Browser — works on 2G / 64 kbps for browsing and radio without buffering. Free download.',
      });
      if (result.action === Share.sharedAction) {
        await grantRadioShareUnlock();
        Alert.alert(
          'Thanks for sharing!',
          'Radio is now unlocked for 30 minutes. Enjoy!'
        );
      }
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Compact white top bar — replaces the old maroon Header.  Holds
          the home button (left), tabs badge + 3-dot menu (right).  The
          big "UltraLite Browser" hero wordmark sits below this strip,
          matching the user-supplied screenshot. */}
      <View style={styles.topBar} testID="header">
        <Pressable
          onPress={() => {
            openUrl('');
            setInput('');
            setPageTitle('');
            trackClick();
          }}
          style={styles.topIconBtn}
          hitSlop={10}
          testID="header-home"
        >
          <Ionicons name="home-outline" size={22} color={COLORS.text} />
        </Pressable>
        <View style={{ flex: 1 }} />
        <View style={styles.topRight}>
          <Pressable
            onPress={onOpenTabSwitcher}
            style={styles.topIconBtn}
            hitSlop={10}
            testID="header-tabs-btn"
          >
            <View style={styles.tabsBadge}>
              <Text style={styles.tabsBadgeText}>{tabsCount}</Text>
            </View>
          </Pressable>
          <Pressable
            onPress={() => setMenuOpen(true)}
            style={styles.topIconBtn}
            hitSlop={10}
            testID="header-menu-btn"
          >
            <Ionicons name="ellipsis-vertical" size={20} color={COLORS.text} />
          </Pressable>
        </View>
      </View>

      {showHome && (
        <View
          style={[
            styles.brandHero,
            { borderColor: ultraLite ? COLORS.brandOrange : COLORS.brandBlue },
          ]}
          testID="brand-hero"
        >
          <Image
            source={require('../assets/images/ultralite-logo.png')}
            style={styles.brandHeroLogo}
            resizeMode="contain"
          />
          <View style={styles.brandHeroTextRow}>
            <Text style={styles.brandOrangeHero}>Ultra</Text>
            <Text style={styles.brandBlueHero}>Lite</Text>
            <Text style={styles.brandSubHero}>Browser</Text>
          </View>
        </View>
      )}

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
              placeholder="Search or type URL"
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
                trackClick();
                // Back behaviour:
                //   1. URI mode (Normal mode mostly) → native WebView
                //      goBack() walks step-by-step through pages the
                //      user actually visited (Chrome / standard browser
                //      behaviour).  Native history is what every other
                //      mobile browser uses — no custom JS layer needed.
                //   2. HTML cleaner mode (UltraLite) → WebView has no
                //      native history (each page is rendered from a
                //      fresh `source={{html}}`), so we walk the
                //      JS-side per-tab history stack.
                //   3. Otherwise → return to home.
                if (renderMode === 'uri') {
                  if (canGoBack) {
                    webRef.current?.goBack();
                    return;
                  }
                  openUrl('');
                  setInput('');
                  return;
                }
                const stack =
                  navHistoryRef.current.get(activeTabId) || [];
                if (stack.length > 0) {
                  const prev = stack.pop()!;
                  navHistoryRef.current.set(activeTabId, stack);
                  setHistoryDepth(stack.length);
                  navigatingBackRef.current = true;
                  setInput(prev);
                  openUrl(prev);
                  return;
                }
                openUrl('');
                setInput('');
              }}
              style={styles.navIconBtn}
              hitSlop={8}
              testID="webview-back"
            >
              <Ionicons name="chevron-back" size={22} color={COLORS.text} />
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
              <Ionicons name="home" size={20} color={COLORS.text} />
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
                  color={COLORS.brandOrange}
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

      {!showHome && (
        <View style={[styles.modeBanner, ultraLite ? styles.modeBannerUL : styles.modeBannerNorm]} testID="sticky-mode-banner">
          <Ionicons
            name={ultraLite ? 'flash-off' : 'globe-outline'}
            size={12}
            color="#fff"
          />
          <Text style={styles.modeBannerText} numberOfLines={1}>
            {ultraLite
              ? 'PURE LEGACY MODE · Text-only · 2G / sub-64 kbps'
              : 'NORMAL MODE · Full web (images, JS, video)'}
          </Text>
        </View>
      )}

      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: bodyBg }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {showHome ? (
          <ScrollView
            contentContainerStyle={[styles.homeScroll, { backgroundColor: bodyBg }]}
            keyboardShouldPersistTaps="handled"
          >
            {/* ── 1. Normal / UltraLite mode buttons ── */}
            <View style={styles.modePillRow}>
              <Pressable
                onPress={() => handleToggle(false)}
                style={[
                  styles.modePill,
                  !ultraLite && styles.modePillActiveNormal,
                ]}
                testID="mode-btn-normal"
              >
                <Text
                  style={[
                    styles.modePillText,
                    !ultraLite && styles.modePillTextActive,
                  ]}
                >
                  Normal
                </Text>
              </Pressable>
              <Pressable
                onPress={() => handleToggle(true)}
                style={[
                  styles.modePill,
                  ultraLite && styles.modePillActiveUltra,
                ]}
                testID="mode-btn-ultralite"
              >
                <Text
                  style={[
                    styles.modePillText,
                    ultraLite && styles.modePillTextActive,
                  ]}
                >
                  UltraLite
                </Text>
              </Pressable>
            </View>

            {/* ── 2. Radio card with Watch Ad + Share App unlock ── */}
            <View
              style={[styles.radioCard, { borderColor: cardBorder }]}
              testID="home-radio-card"
            >
              <Pressable
                onPress={() => {
                  router.push('/radio');
                  trackClick();
                }}
                style={styles.radioLeft}
                testID="home-radio-open"
              >
                <Ionicons name="radio" size={28} color={COLORS.brandOrange} />
                <Text style={styles.radioTitle}>Radio</Text>
                <Text style={styles.radioSub}>Tap to browse stations</Text>
              </Pressable>
              <View style={styles.radioRight}>
                <Pressable
                  onPress={() => {
                    router.push('/radio');
                    trackClick();
                  }}
                  style={styles.radioUnlockBtn}
                  testID="home-radio-watch-ad"
                >
                  <Ionicons name="play-circle-outline" size={14} color={COLORS.brandOrange} />
                  <Text style={styles.radioUnlockText}>
                    Watch Ad{'\n'}Unlock 30 Min
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleShareApp}
                  style={styles.radioUnlockBtn}
                  testID="home-radio-share-app"
                >
                  <Ionicons name="share-social-outline" size={14} color={COLORS.brandBlue} />
                  <Text style={styles.radioUnlockText}>
                    Share App{'\n'}Unlock 30 Min
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* ── 3. Websites tiles (CricApp pinned + Add new) ── */}
            <View style={[styles.appsCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <View style={styles.appsGrid}>
                {shortcuts.map((s) => {
                  const pinned = isPinnedShortcut(s);
                  return (
                    <Pressable
                      key={s.id}
                      onPress={() => {
                        if (s.url === CRICAPP_URL) {
                          // CricApp tile → open Play Store directly via
                          // OS handler so user lands in the Play Store
                          // app, not inside our WebView.
                          Linking.openURL(s.url).catch(() => {
                            openUrl(s.url);
                          });
                        } else {
                          openUrl(s.url);
                        }
                        trackClick();
                      }}
                      onLongPress={() => {
                        if (!pinned) onShortcutLongPress(s);
                      }}
                      delayLongPress={400}
                      style={styles.appTile}
                      testID={`shortcut-${s.id}`}
                    >
                      <View style={[styles.appIconWrap, pinned && styles.appIconPinned]}>
                        {pinned ? (
                          <Ionicons name="trophy" size={26} color={COLORS.brandOrange} />
                        ) : (
                          <Image
                            source={{ uri: faviconUrl(s.url, 64) }}
                            style={styles.appIcon}
                          />
                        )}
                      </View>
                      <Text style={styles.appLabel} numberOfLines={1}>
                        {s.name}
                      </Text>
                    </Pressable>
                  );
                })}
                <Pressable
                  onPress={() => setAddShortcutOpen(true)}
                  style={styles.appTile}
                  testID="shortcut-add"
                >
                  <View style={[styles.appIconWrap, styles.appIconAdd]}>
                    <Ionicons name="add" size={26} color={COLORS.brandOrange} />
                  </View>
                  <Text style={styles.appLabel}>Add new</Text>
                </Pressable>
              </View>
            </View>

            <Text style={styles.modeHint}>
              <Text style={{ color: COLORS.brandBlue, fontWeight: '700' }}>
                {ultraLite ? 'UltraLite Mode · 2G / sub-64 kbps' : 'Normal Mode · Full speed'}
              </Text>
            </Text>
          </ScrollView>
        ) : (
          <View style={{ flex: 1 }}>
            {loading && (
              <View>
                <View style={styles.progressTrack}>
                  <View
                    style={[styles.progressFill, { width: `${progress * 100}%` }]}
                  />
                </View>
                {!!statusText && (
                  <View style={styles.statusRow} testID="status-phase-text">
                    <Text style={styles.statusText} numberOfLines={1}>
                      {statusText}
                    </Text>
                  </View>
                )}
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
                  // Allow same-document / data URIs through — anything else
                  // that isn't http(s) (intent:, mailto:, tel:, file:,
                  // custom schemes) the Android WebView cannot resolve and
                  // throws net::ERR_UNKNOWN_URL_SCHEME — so block them to
                  // avoid the grey error page.  If a supported handler
                  // exists (tel:, mailto:, sms:), we dispatch via Linking.
                  if (!u || u === 'about:blank') return false;
                  if (u.startsWith('about:') || u.startsWith('data:')) {
                    return true;
                  }
                  if (!u.startsWith('http')) {
                    if (
                      u.startsWith('tel:') ||
                      u.startsWith('mailto:') ||
                      u.startsWith('sms:') ||
                      u.startsWith('geo:')
                    ) {
                      Linking.openURL(u).catch(() => {});
                    }
                    return false;
                  }
                  // Intercept downloads.
                  if (isDownloadUrl(u)) {
                    handleDownload(u);
                    return false;
                  }
                  // Unwrap DuckDuckGo redirect links → open the real target
                  // so we don't bounce back to the search page.
                  const unwrappedDdg = unwrapDuckDuckGoRedirect(u);
                  if (unwrappedDdg) {
                    openUrl(unwrappedDdg);
                    return false;
                  }
                  // In pure-text (HTML) mode: re-fetch & filter on link clicks
                  // (only for actual http(s) navigations).
                  // Build #28 — also catch SAME-URL navigations so a user
                  // tapping a "load more" / paginator link auto-fetches
                  // (previously this fell through to URI nav and stalled
                  // until the user manually hit reload).
                  if (renderMode === 'html') {
                    if (u !== url) {
                      openUrl(u);
                      return false;
                    }
                    // Same URL — let WebView handle in-page anchors only.
                    if (u.includes('#')) return true;
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
                injectedJavaScriptBeforeContentLoaded={
                  // Strict image / media block runs BEFORE any resource
                  // load — protects us on mbasic.fb, m.yt, m.wiki,
                  // lite.ddg, etc.  Skipped for login URLs where users
                  // need to see captchas / profile photos.
                  // Build #24 — also skipped when the user enables
                  // "Allow Images in UltraLite", so AdMob / Play Console
                  // / image-heavy SPAs render normally.
                  // Build #35 — DDG branding strip is ALWAYS appended on
                  // duckduckgo.com pages (any mode) so the URL bar / page
                  // doesn't show "DuckDuckGo" wordmark — keeps the app
                  // neutral on third-party trademarks.
                  (renderMode === 'uri' &&
                  ultraLite &&
                  !isLoginUrl(url) &&
                  !allowImages
                    ? STRICT_MEDIA_BLOCK
                    : desktopView
                    ? DESKTOP_VIEWPORT
                    : '') + DDG_BRANDING_HIDE
                }
                injectedJavaScript={
                  // Run AFTER content load.  In UltraLite URI mode we keep
                  // the existing cosmetic cleanup; when desktop view is
                  // requested we re-apply the viewport override (some
                  // sites overwrite the meta tag late).
                  // DDG branding strip is also re-applied here so the
                  // wordmark / title cleanup catches late-hydrated DOM
                  // (DDG's SPA-style result rendering on the .com site).
                  (desktopView
                    ? DESKTOP_VIEWPORT
                    : renderMode === 'uri' && ultraLite
                    ? LOGIN_PAGE_CSS
                    : '') + DDG_BRANDING_HIDE
                }
                userAgent={
                  desktopView
                    ? DESKTOP_UA
                    : ultraLite
                    ? MOBILE_UA
                    : undefined
                }
                onError={(e) => {
                  // Swallow ERR_UNKNOWN_URL_SCHEME / net errors instead of
                  // showing Android's default grey "Webpage not available"
                  // page.  We log for diagnostics.
                  const nativeErr = e?.nativeEvent;
                  if (nativeErr?.code === -10) {
                    // ERR_UNKNOWN_URL_SCHEME — already handled above via
                    // onShouldStartLoadWithRequest; nothing to do.
                    return;
                  }
                  console.warn('[webview] err', nativeErr);
                }}
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

      {/* ── Tab Switcher modal (Phase B build #22) ──
          Lists every tab for the CURRENT mode; switching modes hides
          tabs from the other mode without deleting them. */}
      <Modal
        visible={tabSwitcherOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setTabSwitcherOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setTabSwitcherOpen(false)}
        >
          <Pressable
            style={styles.tabSwitcherSheet}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.tabSwitcherHead}>
              <Text style={styles.tabSwitcherTitle}>
                Tabs · {ultraLite ? 'UltraLite' : 'Normal'} ({tabsForMode.length})
              </Text>
              <Pressable
                onPress={() => setTabSwitcherOpen(false)}
                hitSlop={10}
                testID="tab-switcher-close"
              >
                <Ionicons name="close" size={24} color={COLORS.text} />
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: 540 }} testID="tab-switcher-list">
              {tabsForMode.map((t) => {
                const isActive = t.id === activeTabId;
                return (
                  <View
                    key={t.id}
                    style={[styles.tabRow, isActive && styles.tabRowActive]}
                    testID={`tab-row-${t.id}`}
                  >
                    <Pressable
                      style={styles.tabRowMain}
                      onPress={() => onSwitchTab(t)}
                      testID={`tab-switch-${t.id}`}
                    >
                      <Ionicons
                        name={t.url ? 'globe-outline' : 'document-outline'}
                        size={20}
                        color={isActive ? COLORS.brandOrange : COLORS.textMuted}
                      />
                      <View style={{ flex: 1 }}>
                        {/* Build #25 — title can wrap up to 2 lines so long
                            page names ("Search results for 'India 2G..."")
                            stay readable in both modes. */}
                        <Text style={styles.tabRowTitle} numberOfLines={2}>
                          {t.title || (t.url ? deriveTitle(t.url) : 'New Tab')}
                        </Text>
                        {!!t.url && (
                          <Text style={styles.tabRowUrl} numberOfLines={2}>
                            {t.url}
                          </Text>
                        )}
                      </View>
                    </Pressable>
                    <Pressable
                      onPress={() => onCloseTab(t)}
                      style={styles.tabCloseBtn}
                      hitSlop={8}
                      testID={`tab-close-${t.id}`}
                    >
                      <Ionicons name="close" size={22} color={COLORS.textMuted} />
                    </Pressable>
                  </View>
                );
              })}
              {tabsForMode.length === 0 && (
                <Text style={styles.tabRowEmpty}>No tabs yet — open a new one below.</Text>
              )}
            </ScrollView>
            <Pressable
              onPress={onNewTab}
              style={styles.newTabBtn}
              testID="tab-new-btn"
            >
              <Ionicons name="add" size={20} color="#FFF" />
              <Text style={styles.newTabBtnText}>New Tab</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

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
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  // ── White compact top bar (replaces maroon Header) ──
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    minHeight: 44,
  },
  topIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  brandOrange: {
    color: COLORS.brandOrange,
    fontSize: 18,
    fontWeight: FONT.weight.black,
    letterSpacing: 0.4,
  },
  brandBlue: {
    color: COLORS.brandBlue,
    fontSize: 18,
    fontWeight: FONT.weight.black,
    letterSpacing: 0.4,
  },
  brandSub: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: FONT.weight.semibold,
    marginLeft: 2,
  },
  // ── Hero brand strip (only on home landing) ──
  // Build #25 — switched from vertical (column) to horizontal (row)
  // layout per user feedback: in UltraLite the column-stacked hero was
  // pushing actual page content too far down the screen.  Logo on the
  // left, text on the right keeps it compact and matches the topbar
  // brand layout for visual consistency between modes.
  // Build #26 — user requested logo doubled for clearer brand presence
  // on the home screen.  44 px → 88 px logo, text scaled proportionally
  // (24 → 36) so it stays balanced beside the bigger logo.  Padding kept
  // tight so the hero doesn't push content down again.
  brandHero: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.sm,
    borderWidth: 2,
    borderColor: COLORS.brandOrange,
    borderRadius: RADIUS.sm,
    backgroundColor: '#FFFFFF',
    gap: 14,
  },
  brandHeroLogo: {
    width: 88,
    height: 88,
  },
  brandHeroTextRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  brandOrangeHero: {
    color: COLORS.brandOrange,
    fontSize: 36,
    fontWeight: FONT.weight.black,
    letterSpacing: 0.4,
  },
  brandBlueHero: {
    color: COLORS.brandBlue,
    fontSize: 36,
    fontWeight: FONT.weight.black,
    letterSpacing: 0.4,
  },
  brandSubHero: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: FONT.weight.semibold,
    marginLeft: 4,
    marginBottom: 2,
  },
  tabsBadge: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: COLORS.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsBadgeText: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: FONT.weight.bold,
  },
  searchBarWrap: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
  },
  searchBar: {
    backgroundColor: COLORS.cardSoft,
    borderRadius: RADIUS.pill,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
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
    backgroundColor: COLORS.cardSoft,
  },
  urlPill: {
    flex: 1,
    height: 38,
    paddingLeft: 8,
    paddingRight: 12,
    backgroundColor: COLORS.cardSoft,
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
  // ── Mode pills (Normal | UltraLite) ──
  modePillRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  modePill: {
    flex: 1,
    height: 44,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.cardSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modePillActiveNormal: {
    backgroundColor: COLORS.brandBlue,
    borderColor: COLORS.brandBlue,
  },
  modePillActiveUltra: {
    backgroundColor: COLORS.brandOrange,
    borderColor: COLORS.brandOrange,
  },
  modePillText: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
    color: COLORS.text,
  },
  modePillTextActive: {
    color: '#FFFFFF',
  },
  // ── Radio card (with Watch Ad + Share App unlock) ──
  radioCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  radioLeft: {
    flex: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    justifyContent: 'center',
    gap: 4,
  },
  radioTitle: {
    fontSize: 26,
    fontWeight: FONT.weight.black,
    color: COLORS.text,
  },
  radioSub: {
    color: COLORS.textMuted,
    fontSize: FONT.size.xs,
  },
  radioRight: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    gap: 8,
    justifyContent: 'center',
  },
  radioUnlockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1.2,
    borderColor: COLORS.brandOrange,
    borderRadius: RADIUS.sm,
    backgroundColor: '#FFFFFF',
  },
  radioUnlockText: {
    fontSize: 11,
    fontWeight: FONT.weight.bold,
    color: COLORS.text,
    lineHeight: 14,
  },
  // ── Apps grid ──
  appsCard: {
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    marginBottom: SPACING.md,
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
    borderColor: COLORS.brandOrange,
  },
  appIconPinned: {
    backgroundColor: '#FFF6EE',
    borderColor: COLORS.brandOrange,
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
  progressFill: { height: 3, backgroundColor: COLORS.brandOrange },
  statusRow: {
    backgroundColor: '#FFF8EC',
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F3E2C2',
  },
  statusText: {
    fontSize: 11,
    color: '#5C0A1A',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  modeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: 3,
  },
  modeBannerUL: { backgroundColor: '#0E2E1F' },
  modeBannerNorm: { backgroundColor: '#1A4A6E' },
  modeBannerText: {
    color: '#fff',
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
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
    backgroundColor: COLORS.brandOrange,
  },
  // ── Tab switcher modal ──
  // Build #25 — slightly wider feel: less left/right padding on the
  // sheet itself so each row gets more horizontal real estate, and the
  // rows themselves use bigger padding/font so titles + urls stay
  // legible in BOTH normal & ultralite modes (user feedback: "tab names
  // not visible properly").
  tabSwitcherSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    paddingTop: SPACING.md,
    paddingHorizontal: SPACING.sm,
    paddingBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  tabSwitcherHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.sm,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tabSwitcherTitle: {
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.bold,
    color: COLORS.text,
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    borderRadius: RADIUS.sm,
    marginVertical: 5,
    backgroundColor: COLORS.cardSoft,
    gap: 12,
  },
  tabRowActive: {
    borderWidth: 2,
    borderColor: COLORS.brandOrange,
    backgroundColor: '#FFF6EE',
  },
  tabRowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingRight: 4,
  },
  tabRowTitle: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.semibold,
    color: COLORS.text,
    lineHeight: 20,
  },
  tabRowUrl: {
    fontSize: FONT.size.xs,
    color: COLORS.textMuted,
    marginTop: 3,
    lineHeight: 16,
  },
  tabRowEmpty: {
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingVertical: SPACING.xl,
  },
  tabCloseBtn: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newTabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    backgroundColor: COLORS.brandOrange,
    borderRadius: RADIUS.pill,
    marginTop: SPACING.sm,
  },
  newTabBtnText: {
    color: '#FFFFFF',
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
  },
  modalBtnPrimaryText: {
    color: '#fff',
    fontWeight: FONT.weight.bold,
  },
});
