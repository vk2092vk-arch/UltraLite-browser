// Pure Legacy URL mapping — Opera Mini 4.0 / 2010 era experience.
// Many big sites still publish a "no-JS, no-CSS" mobile portal that loads
// instantly even on 64 kbps. We rewrite popular domains to those endpoints
// so login & navigation buttons work natively without our HTML cleaner
// breaking them.
//
// Two helpers exported:
//   mapToLegacy(url)      — rewrite to a legacy-friendly URL (or pass through)
//   isTrustedLite(url)    — true if this host is already lite-by-design and
//                           should be loaded directly in the WebView (URI
//                           mode), bypassing the r.jina.ai HTML cleaner.

type Mapper = (u: URL) => string | null;

// Domain → rewriter. Each rewriter receives the parsed URL and returns the
// new full URL string, or null to leave it alone.
const HOST_RULES: Record<string, Mapper> = {
  // ---------- Facebook ----------
  'facebook.com': (u) => `https://mbasic.facebook.com${u.pathname}${u.search}`,
  'www.facebook.com': (u) => `https://mbasic.facebook.com${u.pathname}${u.search}`,
  'm.facebook.com': (u) => `https://mbasic.facebook.com${u.pathname}${u.search}`,
  'web.facebook.com': (u) => `https://mbasic.facebook.com${u.pathname}${u.search}`,
  'fb.com': (u) => `https://mbasic.facebook.com${u.pathname}${u.search}`,

  // ---------- Instagram ----------
  // Instagram has no public mbasic. The login page with force_classic=1 is
  // the closest to a 2G-friendly endpoint that still accepts credentials.
  //
  // Build #28.1 — login / signup / password-reset paths are passed through
  // UNTAMPERED so isLoginUrl in home.tsx routes them into URI/JS mode for
  // actual authentication.  Form POSTs on the bundled instant page hit
  // these exact URLs, so without this carve-out the legacy mapper would
  // re-add force_classic and bounce the POST back into cleaner mode where
  // login can never complete.
  'instagram.com': (u) => {
    if (u.pathname === '/' || u.pathname === '') {
      return 'https://www.instagram.com/accounts/login/?force_classic=1';
    }
    if (/^\/accounts\/(login|signup|password|emailsignup)/i.test(u.pathname)) {
      // Pass through — keep original (auth flow), don't add force_classic.
      // Returning null tells the caller "no rewrite needed".
      return null;
    }
    const sp = new URLSearchParams(u.search);
    sp.set('force_classic', '1');
    return `https://www.instagram.com${u.pathname}?${sp.toString()}`;
  },
  'www.instagram.com': (u) => {
    if (u.pathname === '/' || u.pathname === '') {
      return 'https://www.instagram.com/accounts/login/?force_classic=1';
    }
    if (/^\/accounts\/(login|signup|password|emailsignup)/i.test(u.pathname)) {
      return null;
    }
    const sp = new URLSearchParams(u.search);
    sp.set('force_classic', '1');
    return `https://www.instagram.com${u.pathname}?${sp.toString()}`;
  },

  // ---------- Twitter / X ----------
  'twitter.com': (u) => `https://mobile.twitter.com${u.pathname}${u.search}`,
  'www.twitter.com': (u) => `https://mobile.twitter.com${u.pathname}${u.search}`,
  'x.com': (u) => `https://mobile.twitter.com${u.pathname}${u.search}`,
  'www.x.com': (u) => `https://mobile.twitter.com${u.pathname}${u.search}`,

  // ---------- YouTube ----------
  'youtube.com': (u) => `https://m.youtube.com${u.pathname}${u.search}`,
  'www.youtube.com': (u) => `https://m.youtube.com${u.pathname}${u.search}`,

  // ---------- Wikipedia ----------
  'wikipedia.org': (u) => `https://en.m.wikipedia.org${u.pathname}${u.search}`,
  'www.wikipedia.org': (u) => `https://en.m.wikipedia.org${u.pathname}${u.search}`,
  'en.wikipedia.org': (u) => `https://en.m.wikipedia.org${u.pathname}${u.search}`,
  // Also map other-language wikipedias to their .m. counterparts
  // (handled generically below)

  // ---------- Reddit ----------
  'reddit.com': (u) => `https://old.reddit.com${u.pathname}${u.search}`,
  'www.reddit.com': (u) => `https://old.reddit.com${u.pathname}${u.search}`,
  'new.reddit.com': (u) => `https://old.reddit.com${u.pathname}${u.search}`,
  'np.reddit.com': (u) => `https://old.reddit.com${u.pathname}${u.search}`,

  // ---------- Google search ----------
  // gbv=1 forces basic HTML (no-JS) version of search results.
  'google.com': (u) => {
    if (u.pathname === '/search' || u.pathname.startsWith('/search')) {
      const sp = new URLSearchParams(u.search);
      sp.set('gbv', '1');
      return `https://www.google.com${u.pathname}?${sp.toString()}`;
    }
    return null;
  },
  'www.google.com': (u) => {
    if (u.pathname === '/search' || u.pathname.startsWith('/search')) {
      const sp = new URLSearchParams(u.search);
      sp.set('gbv', '1');
      return `https://www.google.com${u.pathname}?${sp.toString()}`;
    }
    return null;
  },

  // ---------- Bing ----------
  // No official lite mode — leave as-is, will be processed by HTML cleaner.

  // ---------- DuckDuckGo ----------
  'duckduckgo.com': (u) => {
    // Always route to the static lite endpoint in UltraLite.
    const sp = new URLSearchParams(u.search);
    if (!sp.has('kp')) sp.set('kp', '-2');
    return `https://lite.duckduckgo.com/lite/?${sp.toString()}`;
  },
};

/** Decode a DuckDuckGo redirect URL (duckduckgo.com/l/?uddg=<encoded>&...)
 *  into the real target URL.  Returns null if the input isn't a DDG redirect.
 *  Without this, clicking any DDG result navigates to a redirect page, and
 *  the legacy-mapper would send it back to the search box → infinite loop. */
export function unwrapDuckDuckGoRedirect(rawUrl: string): string | null {
  if (!rawUrl) return null;
  try {
    const u = new URL(rawUrl);
    const host = u.hostname.toLowerCase();
    const isDdgRedirect =
      (host === 'duckduckgo.com' ||
        host === 'www.duckduckgo.com' ||
        host === 'lite.duckduckgo.com' ||
        host === 'html.duckduckgo.com') &&
      (u.pathname === '/l/' ||
        u.pathname === '/l' ||
        u.pathname === '/y.js' ||
        u.pathname.startsWith('/l/'));
    if (!isDdgRedirect) return null;
    const enc = u.searchParams.get('uddg') || u.searchParams.get('u');
    if (!enc) return null;
    try {
      const real = decodeURIComponent(enc);
      if (real.startsWith('http://') || real.startsWith('https://')) return real;
    } catch {}
    return null;
  } catch {
    return null;
  }
}

/** Pure-legacy URL rewriter. Returns the input unchanged when no rule fires. */
export function mapToLegacy(rawUrl: string): string {
  if (!rawUrl) return rawUrl;
  // ── DuckDuckGo redirect unwrap (must run first so we never re-route the
  //    click-through to the search box) ──
  const unwrapped = unwrapDuckDuckGoRedirect(rawUrl);
  if (unwrapped) return mapToLegacy(unwrapped);

  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    return rawUrl;
  }
  const host = u.hostname.toLowerCase();
  const rule = HOST_RULES[host];
  if (rule) {
    const out = rule(u);
    if (out) return out;
  }
  // Generic Wikipedia rule: any "<lang>.wikipedia.org" → "<lang>.m.wikipedia.org"
  const wikiM = host.match(/^([a-z\-]+)\.wikipedia\.org$/);
  if (wikiM && !host.includes('.m.')) {
    return `https://${wikiM[1]}.m.wikipedia.org${u.pathname}${u.search}`;
  }
  return rawUrl;
}

// Hosts that already serve a lite, no-JS-needed experience.  We render those
// directly in the WebView (URI mode) instead of running them through the
// HTML cleaner — that keeps native form posts and session cookies working.
//
// Build #24 — user feedback: "every site should open in pure-text UltraLite,
// don't give Instagram / Facebook / Twitter / YouTube etc. special URI-mode
// treatment".  So this list is now *empty* by default — every UltraLite URL
// runs through the HTML cleaner unless it's a recognised LOGIN url (those
// are short-circuited in home.tsx via isLoginUrl).
//
// The legacy URL rewriting (mapToLegacy) still applies — clicks to
// facebook.com still get rewritten to mbasic.facebook.com so we fetch the
// lightweight HTML — but the cleaner pass on top now strips heavy CSS /
// images / scripts the same way it does for any other site.
const TRUSTED_LITE_HOSTS = new Set<string>([]);

// No generic regex match either — every host (including m.wikipedia) goes
// through the cleaner so user gets uniform pure-text rendering.
// `(?!)` is a never-matching pattern in JavaScript regex.
const TRUSTED_LITE_RE = /(?!)/;

export function isTrustedLite(rawUrl: string): boolean {
  if (!rawUrl) return false;
  try {
    const host = new URL(rawUrl).hostname.toLowerCase();
    if (TRUSTED_LITE_HOSTS.has(host)) return true;
    if (TRUSTED_LITE_RE.test(host)) return true;
    return false;
  } catch {
    return false;
  }
}
